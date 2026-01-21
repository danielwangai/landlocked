"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { publicKey } = useWallet();
  const isLoggedIn = !!publicKey;

  // Always show header, but only show sidebar if logged in
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen">
        {/* Main Content Area - No Sidebar */}
        <div className="flex-1 bg-red">
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
