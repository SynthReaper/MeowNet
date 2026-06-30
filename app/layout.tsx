// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
import type { Metadata } from 'next';
import { ClerkProvider } from "@clerk/nextjs";
import Script from 'next/script';
import AuthBridge from '@/components/auth/AuthBridge';
import Broadcasts from '@/components/ui/Broadcasts';
import './globals.css';

// Define static font fallbacks to bypass build-time Google Fonts downloads
const inter = {
  variable: '--font-inter',
  className: 'font-sans',
};

const dmMono = {
  variable: '--font-dm-mono',
  className: 'font-mono',
};

export const metadata: Metadata = {
  title: {
    default: 'MeowNet — The Community-Powered Cat Empire',
    template: '%s | MeowNet',
  },
  description:
    'MeowNet turns cat rescue, TNR coordination, and adoption into a collaborative empire-building experience. Log strays, coordinate TNR events, and earn Empire Points while making the world better for cats.',
  keywords: ['cat rescue', 'TNR', 'trap neuter return', 'cat adoption', 'stray cats', 'cat map', 'hackthekitty'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'MeowNet',
    title: 'MeowNet — The Community-Powered Cat Empire',
    description: 'Build your cat empire. Interact with your cozy companion and help community cats.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-96x96.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Quicksand:wght@600;700;800&family=DM+Mono:wght@400;500;700&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" />
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'light';
                document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {}
            `
          }}
        />
      </head>
      <body className={`${inter.className} bg-[var(--bg-void)] text-[var(--empire-cream)] antialiased min-h-screen flex flex-col`}>
        <Script
          id="block-inspect"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Disable right-click context menu
              document.addEventListener('contextmenu', (e) => e.preventDefault());

              // Disable common developer keys (F12, Ctrl+Shift+I/J/C, Ctrl+U)
              document.addEventListener('keydown', (e) => {
                if (
                  e.key === 'F12' ||
                  (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                  (e.ctrlKey && e.key === 'U')
                ) {
                  e.preventDefault();
                  return false;
                }
              });

              // Anti-debugging loop
              (function() {
                const check = function() {
                  try {
                    (function a(i) {
                      if (('' + i / i).length !== 1 || i % 20 === 0) {
                        (function() {}).constructor('debugger')();
                      } else {
                        debugger;
                      }
                      a(++i);
                    })(0);
                  } catch (e) {}
                };
                setInterval(check, 1000);
              })();
            `
          }}
        />
        <ClerkProvider telemetry={false}>
          <AuthBridge />
          <Broadcasts />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}

