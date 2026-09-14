import type { Metadata } from 'next';
import './globals.css';
import './interface.css';
export const metadata: Metadata = {
  referrer: 'no-referrer',
  title: 'Calgary Neighbourhood Analytics | Property & neighbourhood research',
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
