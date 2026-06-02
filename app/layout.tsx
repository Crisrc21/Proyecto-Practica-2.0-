import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppSidebar } from "@/components/app-sidebar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CxC PHO | Gestión de cuentas por cobrar",
  description: "Aplicación empresarial simple para cartera, facturas y trazabilidad CxC."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="min-h-screen">
          <AppSidebar />
          <main className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1500px]">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
