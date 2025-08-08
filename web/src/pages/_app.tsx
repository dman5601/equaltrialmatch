// web/src/pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { SavedTrialsProvider } from "@/context/SavedTrialsContext";
import Header from "@/components/Header";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <SavedTrialsProvider>
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Component {...pageProps} />
        </main>
      </SavedTrialsProvider>
    </SessionProvider>
  );
}
