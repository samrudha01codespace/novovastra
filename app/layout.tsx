import type { Metadata } from "next";
import { Cormorant, Montserrat } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";

const cormorant = Cormorant({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NovaVstra — Your Heritage, Reimagined",
  description:
    "Transform vintage sarees into bespoke modern garments. Our expert artisans craft your dream design from heritage fabric.",
  keywords: [
    "vintage saree",
    "bespoke tailoring",
    "saree to dress",
    "heritage fashion",
    "custom garments",
    "artisan made",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cormorant.variable} ${montserrat.variable} antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <WhatsAppButton />
      </body>
    </html>
  );
}
