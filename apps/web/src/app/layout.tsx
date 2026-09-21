import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { currentUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = {
  title: "Lex Company Counsel",
  description: "Company-specific legal and compliance workspace for startups and solo businesses.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3" aria-label="Primary">
            <Link href="/" className="font-semibold tracking-tight">
              Lex Company Counsel
            </Link>
            <div className="flex items-center gap-3 text-sm">
              {user ? (
                <>
                  <Link href="/content" className="underline-offset-2 hover:underline">Content</Link>
                  <span className="hidden text-slate-600 sm:inline">{user.displayName}</span>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <Link href="/sign-in" className="underline-offset-2 hover:underline">Sign in</Link>
                  <Link href="/sign-up" className="rounded bg-[var(--accent)] px-3 py-1.5 text-white">Create account</Link>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-slate-500">
          Early foundation build. No legal guidance is available yet; no jurisdiction pack has been reviewed or published.
        </footer>
      </body>
    </html>
  );
}
