import type { Metadata, Viewport } from "next";
import "./globals.css";
import ZoomGuard from "./components/ZoomGuard";

export const metadata: Metadata = {
  title: "Melbourne Airport",
  description: "Melbourne Airport - Merry Christmas",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased overflow-hidden overscroll-none"
        style={{ touchAction: "none" }}
      >
        <ZoomGuard />
        {children}
      </body>
    </html>
  );
}
