import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exclusão de conta",
  description: "Como excluir sua conta e seus dados do Pieceful.",
};

export default function AccountDeletionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
