import type { Metadata } from "next";
import localFont from "next/font/local";
import { Outfit } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Provider global unique -- remplace le bricolage ou chaque page publique (landing, register,
  // reserva) posait son propre NextIntlClientProvider local via lib/hooks/useLocale.ts, et le
  // provider local de DashboardChrome (supprime, il re-ecrasait silencieusement 'fr' en es/pt
  // puisque base sur users.idioma). La locale est resolue par requete dans i18n/request.ts (cookie
  // NEXT_LOCALE, sinon users.idioma pour un praticien deja connecte, sinon 'es'). Les providers
  // locaux restants sur les pages publiques (page.tsx, register, reserva) restent inoffensifs tels
  // quels : memes valeurs que le provider global, simple redondance le temps de leur migration.
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
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
