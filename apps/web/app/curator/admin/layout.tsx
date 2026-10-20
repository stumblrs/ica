import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'ICA Curator Control Center',
  description: 'Private Standalone Administrative and Curatorial Console for Igbo Cultural Atlas',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CuratorAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 font-sans antialiased selection:bg-amber-500/30 selection:text-amber-200">
      {children}
    </div>
  );
}
