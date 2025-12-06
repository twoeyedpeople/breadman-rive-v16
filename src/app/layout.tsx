import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rive Test",
  description: "Rive Conversational AI test",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
