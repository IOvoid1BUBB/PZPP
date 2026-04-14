import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import ReactQueryProvider from "../providers/ReactQueryProvider";
import AppProviders from "../providers/AppProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "IMS - Sprzedażowe centrum dowodzenia",
  description: "Zarządzaj swoją sprzedażą w jednym miejscu. Landing pages, leady i CRM.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pl"
      className="scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning={true}
    >
      <body
        suppressHydrationWarning={true}
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <AppProviders>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </AppProviders>
        <Analytics />
      </body>
    </html>
  );
}