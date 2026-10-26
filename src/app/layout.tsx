import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

export const metadata: Metadata = {
  title: 'ZMS - ระบบบริหารจัดการเงินซะกาตและสวัสดิการสังคม',
  description: 'Zakat Management System - แพลตฟอร์มบริหารจัดการเงินซะกาต ผู้ขอรับความช่วยเหลือ และการเงินโปร่งใสสำหรับมูลนิธิ',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ZMS Zakat',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0b2545',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-teal-200">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
