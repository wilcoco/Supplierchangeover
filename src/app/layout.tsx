import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '업체 이관 협업 시스템',
  description: '외주 협력업체 생산처 변경(이관) 프로세스 협업 관리 도구',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
