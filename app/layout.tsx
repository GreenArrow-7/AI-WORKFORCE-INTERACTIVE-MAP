import type { Metadata, Viewport } from 'next';
import { STORAGE_KEY } from '@/lib/storage';
import { AppShell } from '@/components/app-shell/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atlas — AI Workforce Map',
  description:
    'Map your organisation as an AI workforce: departments, functions, agents, the skills and tools behind them, and how far you have actually deployed.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#08090b' },
    { media: '(prefers-color-scheme: light)', color: '#fbfbfc' },
  ],
  width: 'device-width',
  initialScale: 1,
  // The map owns pinch-zoom; letting the page zoom too fights the camera.
  maximumScale: 1,
};

/**
 * Applies the stored theme before first paint.
 *
 * Dark is the CSS default, so the server can render with no attribute at all and
 * this script only ever *adds* one. React never controls the attribute, so there
 * is nothing for hydration to disagree about (§39).
 */
const themeBootScript = `
(function () {
  try {
    var raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    if (!raw) return;
    var theme = JSON.parse(raw).workspace.theme;
    if (theme === 'light' || theme === 'system') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (e) {
    /* Unreadable storage is handled properly in the store; ignore it here. */
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
