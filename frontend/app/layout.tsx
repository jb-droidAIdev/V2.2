import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QMS | Quality Management System",
  description: "Advanced Quality Monitoring Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: '#020617' }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-blue-500/30`}
      >
        <Toaster position="top-right" theme="dark" closeButton richColors />
        {children}
      </body>
    </html>
  );
}
