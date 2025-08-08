// web/src/pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

const noFlash = `
(function() {
  try {
    var t = localStorage.getItem('theme');
    var d = t ? (t === 'dark') : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', d);
  } catch (e) {}
})();
`;

export default function Document() {
  return (
    <Html>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
