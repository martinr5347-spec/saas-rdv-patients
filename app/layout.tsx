import type { Metadata } from "next";
import localFont from "next/font/local";
import { Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Núcleo",
  description: "Gestión de citas para profesionales médicos y estéticos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased`}
      >
        {children}
        {/* NaveoFlow : desactive par defaut, active ponctuellement via env var le temps
            d'enregistrer un guide -- jamais charge en continu sur des pages de donnees patients. */}
        {process.env.NEXT_PUBLIC_NAVEOFLOW_ENABLED === 'true' && (
          <Script
            src="https://app.naveoflow.com/widget.js"
            data-site-key="45b4d5cff6135407a72473240672aa5a80a0"
            data-api="https://app.naveoflow.com"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
