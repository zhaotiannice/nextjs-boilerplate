import { PreviewBtn } from "@/src/component/preview";
import "./globals.css";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script strategy="beforeInteractive" src="/tracker/tracker.min.js" />
      </head>
      <body>
        {children}
        <PreviewBtn />
      </body>
    </html>
  );
}
