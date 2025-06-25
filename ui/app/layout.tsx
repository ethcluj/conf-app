import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { BottomNavigation } from "@/components/bottom-navigation"
import { PwaInstaller } from "@/components/pwa-installer"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "ETHCluj 2025",
  description: "Conference Schedule (June 26-28)",
  generator: 'dappcoder.org',
  manifest: '/manifest.json',
  themeColor: '#0d1117',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ETHCluj 2025',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/icons/icon-192x192.png',
  },
  // Open Graph / Facebook
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://app.ethcluj.org',
    siteName: 'ETHCluj 2025',
    title: 'ETHCluj 2025',
    description: 'Conference Schedule (June 26-28)',
    images: [
      {
        url: 'https://app.ethcluj.org/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ETHCluj 2025',
      },
    ],
  },
  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'ETHCluj 2025',
    description: 'Conference Schedule (June 26-28)',
    images: ['https://app.ethcluj.org/og-image.png'],
    creator: '@ethcluj',
    site: '@ethcluj',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script src="/pwa-register.js" defer></script>
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <PwaInstaller />
          <BottomNavigation />
        </ThemeProvider>
      </body>
    </html>
  )
}

