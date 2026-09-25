import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lex Company Counsel",
  description: "Company-specific legal and compliance workspace for startups and solo businesses.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3" aria-label="Primary">
            <Link href="/" className="font-semibold tracking-tight">
              Lex Company Counsel
            </Link>
            <div className="flex items-center gap-3 text-sm"><Link href="/content" className="underline-offset-2 hover:underline">Coverage & sources</Link></div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-slate-500">
          Private browser workspace. Clearing browser cookies may make this workspace inaccessible. Legal content requires review before it can be presented as guidance.
        </footer>
      </body>
    </html>
  );
}
