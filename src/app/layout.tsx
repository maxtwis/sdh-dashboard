import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import './globals.css';

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-ibm-plex-sans-thai',
});

export const metadata: Metadata = {
  title: 'Social Determinants of Health Equity Dashboard',
  description: 'Dashboard for monitoring social determinants of health equity indicators',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={`${ibmPlexSansThai.className} min-h-screen bg-background`}>
        {children}
      </body>
    </html>
  );
}