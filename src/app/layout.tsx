import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Toaster } from '@/components/ui/sonner';
import { Nav } from '@/components/nav';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Sazón',
  description: 'Recetas de DDS & Gaby',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={geistSans.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Nav />
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
