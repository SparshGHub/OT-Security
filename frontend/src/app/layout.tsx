import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppStateProvider } from "@/lib/context/AppStateContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "DCS Attack Simulator",
  description:
    "A tabletop cyber-attack simulator for a thermal power plant's Distributed Control System.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${inter.variable} bg-background text-foreground`}>
        {/* App-wide state lives here. ReactFlow has its own provider (moved closer). */}
        <AppStateProvider>
          {children}
          <Toaster />
        </AppStateProvider>
      </body>
    </html>
  );
}

