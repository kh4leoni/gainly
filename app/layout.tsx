import type { Metadata, Viewport } from "next";
import { Great_Vibes, Plus_Jakarta_Sans, Bricolage_Grotesque } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dancing",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Gainly",
  description: "Digital coaching platform for strength training",
  manifest: "/manifest.json",
  applicationName: "Gainly",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Gainly" },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070708" },
    { media: "(prefers-color-scheme: light)", color: "#f5f4f8" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce comes from middleware (x-nonce request header). When absent
  // (rare: middleware skipped for the route), the inline bootstrap script
  // simply won't render → defaults to system theme until React hydrates.
  const nonce = (await headers()).get("x-nonce") ?? "";
  return (
    <html lang="fi" suppressHydrationWarning>
      <head>
        {nonce && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.className=t}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.className='dark'}})()`,
            }}
          />
        )}
      </head>
      <body className={`antialiased font-sans ${greatVibes.variable} ${jakarta.variable} ${bricolage.variable}`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
