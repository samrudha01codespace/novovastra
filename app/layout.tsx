import type { Metadata } from "next";
import { Cormorant, Montserrat } from "next/font/google";
import Script from "next/script";
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
      <head>
        <Script
          id="dark-reader-compat"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var DR_ATTRS = ['data-darkreader-inline-stroke', 'data-darkreader-inline-color', 'data-darkreader-inline-bg', 'data-darkreader-inline-fill'];
                function strip(el) {
                  DR_ATTRS.forEach(function(a) { el.removeAttribute(a); });
                  if (!el.style) return;
                  var css = el.style.cssText;
                  if (!css) return;
                  css = css.replace(/--darkreader-inline-[^:]+:[^;]+;?/g, '');
                  el.style.cssText = css;
                }
                document.querySelectorAll(DR_ATTRS.map(function(a) { return '[' + a + ']'; }).join(',')).forEach(strip);
                new MutationObserver(function(mutations) {
                  mutations.forEach(function(m) {
                    if (m.type === 'attributes' && m.attributeName.indexOf('data-darkreader-inline-') === 0) {
                      strip(m.target);
                    }
                  });
                }).observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: DR_ATTRS });
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <WhatsAppButton />
      </body>
    </html>
  );
}
