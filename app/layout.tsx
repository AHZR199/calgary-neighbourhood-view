import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import './interface.css';
import '../components/atlas/motion.css';
import './mobile.css';

const lilGrotesk = localFont({
  src: '../public/fonts/lil-grotesk/LilGrotesk-Variable.woff2',
  variable: '--font-lil-grotesk',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
});
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: '#f3f7fa',
};
export const metadata: Metadata = {
  referrer: 'no-referrer',
  title: 'Calgary Neighbourhood View | Property & neighbourhood research',
  description:
    'Explore Calgary in 3D. Property costs, public infrastructure, community statistics and elected representatives, with traceable sources.',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={lilGrotesk.variable}>
      <body>{children}</body>
    </html>
  );
}
