import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MSC Studio",
  description: "Sistema de criação de campanhas das Lojas MSC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#FAF9F7] text-[#1A1A1A] antialiased">{children}</body>
    </html>
  );
}
