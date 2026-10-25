# N-Bills PWA and Android packaging

The project uses Next.js 14.2 App Router. A native service worker is registered by a small client component in the root layout, following the [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps). No dependency was added. The installed next-pwa package is no longer invoked; the existing lockfile and Capacitor project are left alone.

## Caching and updates

- `/manifest.webmanifest` is linked through Next metadata. `/manifest.json` remains an identical compatibility copy. Keep both synchronized.
- The manifest preserves `/dashboard` as the start URL and uses `/dashboard` as the explicit ID to preserve the identity implied by the old start URL. Scope is `/`.
- Existing 192/512 PNGs are unchanged. Maskable copies center the original artwork within 56% of an opaque canvas, keeping it within the maskable safe circle. The dark background extends over the original white outer corner backing; the lettering is not redrawn.
- Only same-origin `/_next/static/` JS, CSS and font files, without query strings or Authorization headers, use cache-first. These are build-versioned public files. Fetches omit cookies; private/no-store/no-cache, redirected, opaque, non-200, Set-Cookie and Vary responses are not stored. The cache is limited to 150 entries.
- HTML navigations always use the network and are never stored. A network failure returns `/offline.html`; server errors retain their original status and content. Offline fallback applies to full navigations/reloads, not synthetic HTML responses to RSC fetches.
- APIs, RSC, Firebase, remote images, POST requests and other user content bypass the worker. Existing Firebase IndexedDB persistence is **unchanged**; that is separate from service-worker Cache Storage.
- Activation removes the former Firestore, start-page, Next data, other-page and Workbox precaches. Unrelated caches are retained. Existing users must close every old app tab/window and reopen to activate this migration.
- Updates wait until old tabs close; there is no forced reload that could interrupt bill editing. Bump VERSION in `public/sw.js` when changing the fallback or cache policy. Static build URLs naturally change on deployments. Never overwrite Next hashed assets in place.
- Notification click handling continues through `/notification-sw.js`. Worker registration only runs in production and secure contexts (HTTPS or localhost).

## Build and test

Supply the project's existing NEXT_PUBLIC_FIREBASE_* variables in the build environment; do not commit credentials or use dummy values in production.

```sh
node --test tests/pwa.test.cjs
node scripts/validate-pwa.cjs
npx tsc --noEmit
npm run build
npm start
```

Use a clean Chrome profile at localhost for local checks. In DevTools > Application, inspect Manifest for all four icons and no errors, and Service Workers for `/sw.js`, scope `/`, activated and controlling the page. Close/reopen existing tabs after upgrades. Load online once, enable Offline, and reload a route: the generic offline page must appear. Disable Offline and retry. Verify login, logout, bill editing, notifications, and customer routes with your actual account. In Cache Storage, no customer page, API, RSC or Firestore response should appear.

Deploy through the existing Vercel workflow. The configured origin in `capacitor.config.ts` is `https://n-bills.vercel.app`; use the actual canonical production origin if different. HTTPS comes from hosting, not from source files. Disable deployment protection for public production PWA files. Verify unauthenticated HTTP 200 responses and correct content types for:

- `/manifest.webmanifest` and `/manifest.json` (application/manifest+json)
- `/sw.js` (JavaScript, no-cache/no-store, Service-Worker-Allowed: /)
- `/notification-sw.js`, `/offline.html`
- `/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/icon-maskable-192.png`, `/icons/icon-maskable-512.png`

The app may redirect unauthenticated users to login normally. Public files must not redirect to login. Repeat browser/PWABuilder checks against HTTPS after deployment; localhost checks do not certify the deployed site.

## Generate APK and AAB

1. Deploy these changes. Open [PWABuilder](https://www.pwabuilder.com/) and enter the canonical HTTPS website URL.
2. Run its analysis. Resolve manifest, icon, HTTPS or service-worker errors; review any optional store recommendations separately.
3. Choose packaging for Android / Google Play. Confirm the app name, start URL, host, icons and permanent package ID. The existing Capacitor ID is `com.divyansh.app`, but this is not proof of the new TWA package ID. If replacing an existing Play app, its package ID and signing identity must match.
4. Choose a new signing key for a new app, or supply the correct existing key for an update. Keep the keystore, alias and passwords securely backed up. Do not select unsigned packaging for this workflow.
5. Generate/download the Android ZIP. It contains an APK for device testing and an AAB for Google Play submission. Follow the generated README, install the signed APK on a test Android device, and use a Play internal testing release for the AAB.
6. Complete Digital Asset Links below, redeploy, then verify that the app launches without the browser address bar. Test authentication, navigation, uploads, downloads and offline fallback on-device before release. External origins can open with browser UI unless separately associated.

See the [official PWABuilder Android guide](https://github.com/pwa-builder/PWABuilder/blob/main/docs/builder/android.md).

## Digital Asset Links: real package and signing certificate

No placeholder assetlinks.json is published. The final package and certificate are determined by Android packaging, so they cannot be inferred from the website.

Get the **exact package ID** from your generated Android project/package settings. Get the **SHA-256 signing certificate fingerprint** for the APK you install from PWABuilder's signing output or Android SDK:

```sh
apksigner verify --print-certs path/to/app.apk
keytool -list -v -keystore path/to/signing.keystore -alias YOUR_ALIAS
```

For Google Play distribution, open Play Console's App integrity / App signing page and copy the **App signing key certificate SHA-256**. This may differ from the upload key. Use the Play signing certificate for Play installs, and also include the local signing certificate if you distribute/test that signed APK.

Run with real values (replace the uppercase arguments, retaining quotes):

```sh
node scripts/configure-assetlinks.cjs "REAL_PACKAGE_ID" "REAL_COLON_SEPARATED_SHA256" "OPTIONAL_SECOND_SHA256"
```

Omit the last argument if there is only one certificate. The script validates formats and generates `public/.well-known/assetlinks.json` with this structure:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "YOUR_REAL_PACKAGE_ID",
    "sha256_cert_fingerprints": ["YOUR_REAL_SIGNING_CERTIFICATE_SHA256"]
  }
}]
```

Deploy it and verify `https://YOUR_CANONICAL_HOST/.well-known/assetlinks.json` returns HTTP 200, application/json, without redirects or authentication. Associate every origin used by the TWA separately when needed. Verify with Google's Digital Asset Links tooling and an installed APK/Play internal-test build. A visible address bar generally means the trust association failed or navigation left a verified origin.

References: [Google Digital Asset Links](https://developers.google.com/digital-asset-links/v1/getting-started), [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756), [TWA quick start](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start).

## Files

Modified: `src/middleware.ts` (exact public PWA paths, protected routes unchanged), `next.config.mjs` (native-worker headers, remove automatic Workbox integration), `src/app/layout.tsx` (manifest and registration), `public/sw.js` (safe worker), `public/manifest.json` (compatibility manifest).

Created: `public/manifest.webmanifest`, `public/offline.html`, `public/icons/icon-maskable-192.png`, `public/icons/icon-maskable-512.png`, `src/components/pwa/ServiceWorkerRegistration.tsx`, `tests/pwa.test.cjs`, `scripts/validate-pwa.cjs`, `scripts/configure-assetlinks.cjs`, and this guide.

`public/workbox-8232f3e4.js` is deliberately retained for already installed old workers during migration. It is unused by the new worker. No business components, auth rules or Firebase persistence were changed. The pre-existing package-lock.json modification is unrelated to this work.

## Verification performed (2026-10-25)

- Production build: passed, including Next.js lint/type checks and all 14 generated pages. Webpack reported non-fatal build-cache snapshot warnings in this environment.
- `npx tsc --noEmit`: passed. Six Node regression tests passed. Manifest fields and all four PNG dimensions passed validation.
- Isolated Chrome on the production server: no JavaScript exceptions on login; `/sw.js` activated and controlled the page at root scope; no manifest errors and no Chrome installability errors.
- All nine public PWA endpoints returned 200 with expected MIME types without authentication. `/dashboard` still redirected unauthenticated visitors to login. Asset Links correctly returns 404 until real signing details are configured.
- With the server stopped, a fresh customer-route navigation displayed the generic offline page. Cache inspection contained only the fallback and public static fonts, with no user pages or API responses.
- Live HTTPS deployment, authenticated business flows, and Android APK/Play trust verification remain manual checks. The local browser verification does not certify those external environments.
