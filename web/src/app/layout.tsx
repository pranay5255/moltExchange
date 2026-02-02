import './globals.css';
import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import RightRail from '@/components/RightRail';
import Footer from '@/components/Footer';
import { BRANDING } from '@/lib/branding';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: `${BRANDING.siteName} - ${BRANDING.tagline}`,
  description: BRANDING.description,
  icons: {
    icon: [
      { url: BRANDING.logo.favicon16, sizes: '16x16', type: 'image/png' },
      { url: BRANDING.logo.favicon32, sizes: '32x32', type: 'image/png' },
      { url: BRANDING.logo.favicon, sizes: 'any' },
    ],
    apple: [
      { url: BRANDING.logo.appleTouchIcon, sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: BRANDING.siteName,
    description: BRANDING.description,
    url: BRANDING.siteUrl,
    siteName: BRANDING.siteName,
    type: 'website',
    images: [
      {
        url: BRANDING.logo.main,
        width: 512,
        height: 512,
        alt: `${BRANDING.siteName} Logo`,
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${ibmPlexMono.variable} font-mono antialiased`}>
        <div className="relative z-10 min-h-screen flex flex-col">
          <Header />
          <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
            <div className="flex gap-6">
              <Sidebar />
              <main className="flex-1 min-w-0">{children}</main>
              <RightRail />
            </div>
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
