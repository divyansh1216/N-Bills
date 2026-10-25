const fs = require('node:fs')
const path = require('node:path')
const [packageName, ...fingerprints] = process.argv.slice(2)
if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(packageName || '') ||
    !fingerprints.length || fingerprints.some(value => !/^([0-9a-f]{2}:){31}[0-9a-f]{2}$/i.test(value))) {
  console.error('Usage: node scripts/configure-assetlinks.cjs REAL_PACKAGE_ID SHA256_FINGERPRINT [ADDITIONAL_SHA256_FINGERPRINT]')
  process.exit(1)
}
const destination = path.join(__dirname, '../public/.well-known/assetlinks.json')
fs.mkdirSync(path.dirname(destination), { recursive: true })
fs.writeFileSync(destination, JSON.stringify([{
  relation: ['delegate_permission/common.handle_all_urls'],
  target: { namespace: 'android_app', package_name: packageName,
    sha256_cert_fingerprints: [...new Set(fingerprints.map(value => value.toUpperCase()))] },
}], null, 2) + '\n')
console.log('Wrote public/.well-known/assetlinks.json. Deploy it to the exact HTTPS origin used by your Android app.')
