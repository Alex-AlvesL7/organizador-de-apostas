import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Bet Analysis Pro - Análise Inteligente de Apostas Esportivas',
  description: 'Plataforma profissional de análise de apostas esportivas com IA. Estatísticas detalhadas, comparação de odds e recomendações inteligentes para suas apostas em futebol.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Bet Analysis Pro',
    description: 'Análise inteligente de apostas esportivas com IA',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans">
        <Toaster position="top-center" />
        {children}
      </body>
    </html>
  );
}
