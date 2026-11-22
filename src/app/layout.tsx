//src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/context/ThemeContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PSB Online - SMK KH. A. WAHAB MUHSIN",
  description: "Penerimaan Peserta Didik Baru SMK KH. A. WAHAB MUHSIN",
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/icon.png' },
    ],
  },
  openGraph: {
    title: "PSB Online - SMK KH. A. WAHAB MUHSIN",
    description: "Penerimaan Peserta Didik Baru SMK KH. A. WAHAB MUHSIN",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PSB Online SMK KH. A. WAHAB MUHSIN',
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <ThemeProvider>
          <Toaster position="top-center" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
