import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { Toaster } from 'sonner';
import { Suspense } from 'react';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: 'FLEXYZ',
  description: 'flexyz.work',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${dmSans.className}`}>
        <Providers>
          <Suspense fallback={null}>
            <div className="root-layout">{children}</div>
          </Suspense>
          <Toaster richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
