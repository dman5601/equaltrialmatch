import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { SavedTrialsProvider } from "@/context/SavedTrialsContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <SavedTrialsProvider>
        <Component {...pageProps} />
      </SavedTrialsProvider>
    </SessionProvider>
  );
}
