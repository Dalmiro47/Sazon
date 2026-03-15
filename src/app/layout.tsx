import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Toaster } from '@/components/ui/sonner';
import { Nav } from '@/components/nav';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Sazón',
  description: 'Recetas de DDS & Gaby',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sazón',
  },
};

export const viewport: Viewport = {
  themeColor: '#5C7A3E',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={geistSans.variable}>
      <body className="min-h-screen bg-[#FDF8F2] font-sans antialiased">
        <Nav />
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
