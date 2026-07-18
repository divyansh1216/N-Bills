import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.divyansh.app',
  appName: 'N-Bills',
  server: {
    url: 'https://n-bills.vercel.app',
    cleartext: false,
  },
}

export default config