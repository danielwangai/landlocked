"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useUserRole } from "@/contexts/UserRoleContext";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { publicKey } = useWallet();
  const { userRole } = useUserRole();
  const isLoggedIn = !!publicKey;

  // Determine if sidebar should be shown
  // Show sidebar only if user is logged in AND has an account (admin/registrar/user)
  const shouldShowSidebar = isLoggedIn && userRole !== null;

  // Always show header
  if (!shouldShowSidebar) {
    return (
      <div className="flex min-h-screen">
        {/* Main Content Area - No Sidebar */}
        <div className="flex-1 bg-[#efe7de]">
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
