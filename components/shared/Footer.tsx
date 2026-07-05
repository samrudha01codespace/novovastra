import Link from "next/link";
import { Phone } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const WHATSAPP_NUMBER = "919558397481";

const footerLinks = {
  product: [
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Gallery", href: "/#gallery" },
    { label: "Get Started", href: "/visualize" },
  ],
  company: [
    { label: "Heritage", href: "/heritage" },
    { label: "About Us", href: "/heritage" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="font-[var(--font-heading)] text-xl font-semibold tracking-tight">
                NovaVstra
              </span>
            </Link>
            <p className="text-sm text-primary-foreground/70 leading-relaxed mb-4">
              Heritage craftsmanship, reimagined for the modern world. Your vintage
              saree, transformed into a bespoke garment.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors"
            >
              <Phone className="w-4 h-4" />
              WhatsApp Us
            </a>
          </div>

          <div>
            <h3 className="font-[var(--font-heading)] text-lg font-semibold mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-[var(--font-heading)] text-lg font-semibold mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-[var(--font-heading)] text-lg font-semibold mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-12 bg-primary-foreground/20" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-primary-foreground/50">
            &copy; {new Date().getFullYear()} NovaVstra. All rights reserved.
          </p>
          <p className="text-sm text-primary-foreground/50">
            Crafted with care in India
          </p>
        </div>
      </div>
    </footer>
  );
}
