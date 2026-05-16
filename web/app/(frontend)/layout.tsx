import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getSiteUrl, softwareApplicationJsonLd } from "@/lib/blog";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Finance Platform — unelte financiare pentru consultanți",
  description:
    "Simulatoare credit, depozit și optimizare financiară. Pentru consultanți și clienți care vor decizii bazate pe date.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Finance Platform — unelte financiare pentru consultanți",
    description:
      "Simulatoare credit, depozit și optimizare financiară. Pentru consultanți și clienți care vor decizii bazate pe date.",
    type: "website",
    locale: "ro_RO",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finance Platform — unelte financiare pentru consultanți",
    description:
      "Simulatoare credit, depozit și optimizare financiară. Pentru consultanți și clienți care vor decizii bazate pe date.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationJsonLd()),
          }}
        />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
