import type { Metadata, Viewport } from 'next';
import './globals.css';
import './interface.css';
import '../components/atlas/motion.css';
import './mobile.css';
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
