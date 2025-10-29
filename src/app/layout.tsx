import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getAuthSession } from "@/lib/auth";
import { AuthSessionProvider } from "@/providers/session-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XMRIT",
  description: "Statistical Process Control and XMR Chart Analysis",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAuthSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthSessionProvider session={session}>
            {children}
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
