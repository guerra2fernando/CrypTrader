/* eslint-disable */
// @ts-nocheck
import type { AppProps } from "next/app";

import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "../components/Layout";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="lenxys-theme">
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ThemeProvider>
  );
}

