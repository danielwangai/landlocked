"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { publicKey } = useWallet();
  const pathname = usePathname();
  const isLoggedIn = !!publicKey;
  const isLandingPage = pathname === "/";

  // Don't show sidebar/header on landing page or if not logged in
  if (!isLoggedIn || isLandingPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 bg-[#efe7de]">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="pt-16 min-h-screen bg-[#efe7de]">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

