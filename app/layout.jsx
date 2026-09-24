import { Space_Grotesk, Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', weight: ['500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', weight: ['400', '500', '600'] });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-plex-mono', weight: ['400', '500'] });

export const metadata = {
  title: 'MAFHH Aviation — Attendance',
  description: 'Employee attendance check-in',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>{children}</body>
    </html>
  );
}
