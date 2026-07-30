import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plenna — Operação Criativa",
  description: "Central de gestão para social media e storymaker.",
  icons: { icon: "/plenna-mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
