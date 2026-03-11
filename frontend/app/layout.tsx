import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RideLane — Cab Booking',
  description: 'Book a cab instantly. Rider and driver dashboards powered by Clerk and Supabase.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>

        <body className={`${inter.className} bg-gray-950 text-white antialiased`} suppressHydrationWarning>

          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
