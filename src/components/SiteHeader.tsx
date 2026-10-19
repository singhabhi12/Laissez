"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { BASE_MATRIX_CREDIT, DISCLAIMER } from "@/lib/legal";

const NAV = [
  { href: "/next-visa", label: "Next best visa" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About the data" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const link = "hidden sm:inline-flex h-11 items-center px-3 text-caption text-muted-foreground hover:text-foreground transition-colors";
  return (
    <header className="glass sticky top-0 z-40 border-b border-border">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex h-11 items-center text-[19px] font-semibold tracking-tight">
          Laissez
        </Link>
        <nav className="flex items-center" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? `${link} text-foreground` : link}
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-grouped">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-8 text-caption text-muted-foreground sm:px-6">
        <div className="flex flex-wrap gap-4 sm:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="py-2">
              {item.label}
            </Link>
          ))}
        </div>
        <p>{DISCLAIMER}</p>
        <p>{BASE_MATRIX_CREDIT}</p>
      </div>
    </footer>
  );
}
