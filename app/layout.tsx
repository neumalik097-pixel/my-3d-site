import type { Metadata } from "next"
import { Cairo } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: "RIVO — نظام إدارة الحلاقة",
  description: "منصة إدارة صالونات الحلاقة الاحترافية",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-rivo-cream"><Providers>{children}</Providers></body>
    </html>
  )
}
