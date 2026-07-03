import type { Metadata } from "next";
import { Cormorant, Montserrat } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";

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
    "Transform vintage sarees into bespoke modern garments with AI-powered visualization. Upload your heritage saree and see it come alive as a contemporary design.",
  keywords: [
    "vintage saree",
    "AI fashion",
    "bespoke tailoring",
    "saree to dress",
    "heritage fashion",
    "custom garments",
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
      className={`${cormorant.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
