import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DepoCat",
  description: "Secure deposition tracking for you and your paralegal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
