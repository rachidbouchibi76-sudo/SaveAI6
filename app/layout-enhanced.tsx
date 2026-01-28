import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://saveai.example.com'),
  title: {
    default: "SaveAI - AI-Powered Price Comparison & Smart Shopping",
    template: "%s | SaveAI"
  },
  description: "Find the best deals with SaveAI's intelligent price comparison. Compare thousands of stores instantly using AI technology. Save money on every purchase with smart shopping insights.",
  keywords: [
    "price comparison",
    "AI shopping",
    "best deals",
    "price tracker",
    "smart shopping",
    "product comparison",
    "save money",
    "online shopping",
    "deal finder",
    "price alerts"
  ],
  authors: [{ name: "SaveAI Team" }],
  creator: "SaveAI",
  publisher: "SaveAI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://saveai.example.com',
    title: "SaveAI - AI-Powered Price Comparison",
    description: "Find the best deals with AI-powered price comparison across thousands of stores",
    siteName: "SaveAI",
    images: [
      {
        url: "/images/PriceComparison.jpg",
        width: 1200,
        height: 630,
        alt: "SaveAI - Smart Price Comparison",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SaveAI - AI-Powered Price Comparison",
    description: "Find the best deals with AI-powered price comparison",
    images: ["/images/PriceComparison.jpg"],
    creator: "@saveai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="canonical" href={process.env.NEXT_PUBLIC_APP_URL || 'https://saveai.example.com'} />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}