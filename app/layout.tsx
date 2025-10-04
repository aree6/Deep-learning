import type React from "react"
import type { Metadata } from "next"
import { Libre_Baskerville, Poppins } from "next/font/google"
import "./globals.css"

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-libre-baskerville",
})

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
  variable: "--font-poppins",
})


export const metadata: Metadata = {
  title: "LearnDeep - AI-Powered Education Chat",
  description:
    "An innovative AI chatbot that teaches through layered explanations and interactive quizzes for deeper retention.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${libreBaskerville.variable} ${poppins.variable} antialiased dark`}
    >
      <body>{children}</body>
    </html>
  )
}
