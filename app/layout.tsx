// Developed by SynthReaper — https://github.com/SynthReaper/MeoNet
import type { Metadata } from 'next';
import { Inter, DM_Mono } from 'next/font/google';
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import AuthBridge from '@/components/auth/AuthBridge';
import Broadcasts from '@/components/ui/Broadcasts';
import Script from 'next/script';
import './globals.css';


const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});

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
    description: 'Build your cat empire. Every point on the globe is a cat with a better life.',
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
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" />
        <link rel="manifest" href="/manifest.json" />
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className={`${inter.className} bg-[var(--bg-void)] text-[var(--empire-cream)] antialiased min-h-screen flex flex-col`}>
        <ClerkProvider telemetry={false}>
          <AuthBridge />
          <header style={{ display: 'none' }}>
            <Show when="signed-out">
              <SignInButton />
              <SignUpButton />
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          <Broadcasts />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}

