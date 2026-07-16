import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Pieceful", template: "%s · Pieceful" },
  description: "Transforme suas fotos em quebra-cabeças personalizados de até 1.000 peças.",
  openGraph: {
    title: "Pieceful",
    description: "Transforme suas fotos em quebra-cabeças personalizados de até 1.000 peças.",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Pieceful" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pieceful",
    description: "Transforme suas fotos em quebra-cabeças personalizados.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
