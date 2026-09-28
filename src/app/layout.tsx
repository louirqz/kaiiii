import type { Metadata } from 'next';
import { Noto_Sans_Thai, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-thai',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'nnichna POS | ระบบขายเกี๊ยวซ่า',
  description: 'ระบบ Point of Sale สำหรับร้าน nnichna เกี๊ยวซ่าแป้งบางกรอบ ไส้แน่น ทำสดใหม่ทุกวัน',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSansThai.variable} font-thai antialiased`}>
        {children}
      </body>
    </html>
  );
}
