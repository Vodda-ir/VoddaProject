import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "وُدّا",
  description: "پلتفرم آموزش قرآن و مداحی",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
