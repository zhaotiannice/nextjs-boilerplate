import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "remote-jobs",
  description: "remote-jobs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
