import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ICA Curator Portal | Settlement Knowledge & Contribution Gates',
  description: 'Authoritative standalone curation dashboard for Igbo Community Atlas settlement heritage and match-key knowledge registry.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full bg-[#090d16]">
      <body className="h-full bg-[#090d16] text-slate-100 antialiased selection:bg-amber-500/30 selection:text-amber-200">
        {children}
      </body>
    </html>
  );
}
