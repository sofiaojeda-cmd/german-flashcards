import type { Metadata } from "next";
import { VT323 } from "next/font/google";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  // metadataBase hace que og:image salga como URL absoluta. Sin esto Next
  // arma una relativa y varias apps de mensajeria no muestran la imagen.
  metadataBase: new URL("https://german-flashcards-xi.vercel.app"),
  title: "German Flashcards",
  description: "Learn German vocabulary with spaced repetition",
  openGraph: {
    title: "German Flashcards",
    description: "Learn German vocabulary with spaced repetition",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={vt323.variable}>
      <body>{children}</body>
    </html>
  );
}
