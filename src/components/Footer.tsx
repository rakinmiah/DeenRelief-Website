import Link from "next/link";

const quickLinks = [
  { label: "Our Work", href: "/#campaigns" },
  { label: "Pay Zakat", href: "/zakat" },
  { label: "Give Sadaqah", href: "/#sadaqah" },
  { label: "Sponsor an Orphan", href: "/#orphan-sponsorship" },
  { label: "Emergency Appeals", href: "/#emergency" },
  { label: "Volunteer", href: "/volunteer" },
];

const aboutLinks = [
  { label: "About Us", href: "/about" },
  { label: "Our Story", href: "/about" },
  { label: "Cancer Care Centres", href: "/#cancer-care" },
  { label: "Prayer Times", href: "/prayer-times" },
  { label: "Contact", href: "/contact" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Accessibility", href: "/accessibility" },
  { label: "Safeguarding Policy", href: "/safeguarding" },
];

export default function Footer() {
  return (
    <footer id="contact" className="bg-charcoal text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Column 1: Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-white font-heading font-bold text-[19px] tracking-tight mb-3">
              Deen Relief
            </p>
            <p className="text-white/55 text-sm leading-relaxed mb-5">
              Helping poor, vulnerable and disabled children globally. A
              UK-registered charity delivering real impact since 2013.
            </p>
            {/* Contact */}
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 text-white/60">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
                <a href="tel:+441273913313" className="hover:text-white transition-colors duration-200">
                  +44 1273 913 313
                </a>
              </div>
              <div className="flex items-start gap-2 text-white/60">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                <a href="mailto:info@deenrelief.org" className="hover:text-white transition-colors duration-200">
                  info@deenrelief.org
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">
              Give
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/60 hover:text-white text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: About */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">
              About
            </h3>
            <ul className="space-y-2.5">
              {aboutLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/60 hover:text-white text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Addresses */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">
              Find Us
            </h3>
            <div className="space-y-4 text-sm text-white/60">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                  Registered Office
                </p>
                <p>71-75 Shelton Street</p>
                <p>London, WC2H 9JQ</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                  Operations
                </p>
                <p>7 Maldon Road</p>
                <p>Brighton, BN1 5BD</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Registration */}
            <div className="text-white/40 text-xs">
              Charity Commission Reg. No. 1158608 &middot; Company No.
              08593822 &middot; &copy; {new Date().getFullYear()} Deen Relief.
              All rights reserved.
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap gap-4">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-white/40 hover:text-white/60 text-xs transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
