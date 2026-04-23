import type { Metadata, Viewport } from "next";
import { Great_Vibes } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dancing",
});

export const metadata: Metadata = {
  title: "Gainly",
  description: "Digital coaching platform for strength training",
  manifest: "/manifest.json",
  applicationName: "Gainly",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Gainly" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: [{ url: "/icons/icon-192.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#FF007A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t&&(t==='dark'||t==='light')){document.documentElement.className=t}})()`,
          }}
        />
      </head>
      <body className={`antialiased ${greatVibes.variable}`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
