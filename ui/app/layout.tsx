import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { BottomNavigation } from "@/components/bottom-navigation"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "ETHCluj 2025",
  description: "Conference Schedule (June 26-28)",
  generator: 'dappcoder.org',
  icons: {
    icon: '/favicon.png'
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
        url: '/og-image.png',
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
    images: ['/og-image.png'],
    creator: '@ethcluj',
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
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <BottomNavigation />
        </ThemeProvider>
      </body>
    </html>
  )
}

