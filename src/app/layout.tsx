import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ShopSettingsProvider } from '@/contexts/ShopSettingsContext'
import MeasurementDueNotifications from '@/components/notifications/MeasurementDueNotifications'
import './globals.css'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'N-Bills',
  description: 'Luxury boutique billing and management',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'N-Bills',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <ShopSettingsProvider>
            <AuthProvider>
              <MeasurementDueNotifications />
              {children}
            </AuthProvider>
          </ShopSettingsProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: 'bg-card border border-border text-foreground luxury-shadow',
                title: 'text-foreground font-medium',
                description: 'text-muted-foreground text-sm',
                actionButton: 'bg-primary text-primary-foreground',
                cancelButton: 'bg-muted text-muted-foreground',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
