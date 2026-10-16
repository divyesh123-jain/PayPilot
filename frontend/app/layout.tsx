import type { Metadata } from "next";
import "@/frontend/styles/globals.css";

export const metadata: Metadata = {
  title: "PayPilot — Your money, on autopilot",
  description: "Permission-first payment intelligence for modern businesses.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
