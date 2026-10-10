import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { InstallPrompt } from '@/components/common/InstallPrompt';
import { UpdatePrompt } from '@/components/common/UpdatePrompt';
import { OfflineFieldModeIndicator } from '@/components/common/OfflineFieldModeIndicator';

export const metadata: Metadata = {
  title: 'Igbo Community Atlas | Participatory Geographic Database',
  description: 'A community-driven geographic atlas for documenting Igbo communities in Nigeria, using administrative geography as reference data and community geography as the dynamic layer.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Igbo Atlas',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#060911',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full w-full bg-[#060911] text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-black overflow-hidden">
        {/* Navigation Bar (All Viewports) */}
        <header className="flex shrink-0 z-40 w-full border-b border-white/[0.08] bg-[#0a0f1d]/90 backdrop-blur-xl px-3 sm:px-5 py-2 items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20 shrink-0">
              <div className="h-full w-full rounded-[11px] bg-[#0a0f1d] flex items-center justify-center font-bold text-emerald-400 text-sm sm:text-base font-['Outfit']">
                ọ
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="truncate">Igbo Community Atlas</span>
                <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v1.2
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 truncate hidden xs:block">
                Participatory Geography • Reference Boundaries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <OfflineFieldModeIndicator />
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>37 States • 774 LGAs</span>
            </div>
          </div>
        </header>

        {/* Full Viewport App Body */}
        <main className="flex-1 w-full relative overflow-hidden flex flex-col">
          {children}
        </main>

        {/* PWA Update Notification for Installed & Web Users */}
        <UpdatePrompt />

        {/* Mobile Install App Alert */}
        <InstallPrompt />
      </body>
    </html>
  );
}
