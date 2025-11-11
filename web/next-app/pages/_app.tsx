/* eslint-disable */
// @ts-nocheck
import type { AppProps } from "next/app";

import { NotificationProvider } from "@/components/NotificationCenter";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeProvider } from "@/lib/mode-context";
import { Layout } from "../components/Layout";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="cryptotrader-theme">
      <ModeProvider>
        <NotificationProvider>
          <ToastProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </ToastProvider>
        </NotificationProvider>
      </ModeProvider>
    </ThemeProvider>
  );
}