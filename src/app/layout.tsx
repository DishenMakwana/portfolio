import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppSidebar from "@/components/shared/AppSidebar";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Family Portfolio",
  description:
    "Advanced mutual fund portfolio tracking with CAGR, XIRR, and Alpha comparisons.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-slate-100 flex">
        <AppSidebar />
        <div className="flex-1 min-w-0 flex flex-col">{children}</div>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1c1c1c",
              color: "#f8fafc",
              border: "1px solid #282828",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              padding: "0.75rem 1rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "#1c1c1c",
              },
            },
            error: {
              iconTheme: {
                primary: "#f43f5e",
                secondary: "#1c1c1c",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
