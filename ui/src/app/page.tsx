"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Home() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const isLoggedIn = !!publicKey;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't show landing page content if logged in (ProtectedRoute will handle redirect)
  if (isLoggedIn) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#efe7de] relative">
      <main className="flex flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/logo.svg"
            alt="Landlocked Logo"
            width={120}
            height={120}
            priority
            className="mb-4"
          />
          <h1 className="text-4xl font-bold text-[#a36143]">Landlocked</h1>
          <p className="max-w-md text-lg text-gray-700">
            A trustless decentralized land registry built on Solana
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <Button
            className="bg-[#a36143] hover:bg-[#ac7156] text-white rounded-[3px] px-8 py-6 text-lg transition-colors"
            onClick={() => router.push("/create-account")}
          >
            Create Account
          </Button>
        </div>
      </main>
    </div>
  );
}
