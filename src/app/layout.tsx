import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Xeboki Store',
  description: 'Powered by Xeboki',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
