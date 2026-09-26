import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clex — your company, clearly prepared",
  description: "A company-specific legal preparation workspace for founders, from first registration steps to contract review with counsel.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="clex-header">
          <nav className="clex-nav" aria-label="Primary">
            <Link href="/" className="clex-wordmark" aria-label="Clex home"><span className="clex-wordmark-mark" aria-hidden="true">C</span>Clex</Link>
            <div className="clex-nav-links"><Link href="/content">Coverage</Link><Link href="/#demo" className="clex-nav-demo">Try demo</Link></div>
          </nav>
        </header>
        <main className="clex-main">{children}</main>
        <footer className="clex-footer">
          <strong>Clex</strong> · Your browser keeps this private demo workspace. Clearing cookies may remove access. Clexa helps you prepare; legal content requires qualified review before it can be presented as guidance.
        </footer>
      </body>
    </html>
  );
}
