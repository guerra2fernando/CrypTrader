/* eslint-disable */
// @ts-nocheck
import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function Layout({ children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="text-lg font-semibold">
            Lenxys Trader
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Overview
            </Link>
            <Link href="/strategies" className="hover:text-foreground">
              Strategies
            </Link>
            <Link href="/reports" className="hover:text-foreground">
              Reports
            </Link>
          </nav>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}

