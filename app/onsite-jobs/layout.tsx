import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "onsite-jobs",
  description: "onsite-jobs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
