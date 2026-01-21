"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#efe7de]">
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
          <Link href="/create-account">
            <Button className="bg-[#a36143] hover:bg-[#ac7156] text-white rounded-[3px] px-8 py-6 text-lg transition-colors">
              Create Account
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
