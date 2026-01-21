"use client";

import { getProvider, RegistrarService } from "@/services/blockchain";
import { Registrar } from "@/utils/interfaces";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import { Landlocked } from "../../../../target/types/landlocked";
import { Program } from "@coral-xyz/anchor";
import RegistrarComponent from "@/components/Registrar.component";
import { getUserType } from "@/utils/helpers";

export default function RegistrarsPage() {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const program = useMemo(
    () => getProvider(publicKey, signTransaction, sendTransaction),
    [publicKey, signTransaction, sendTransaction]
  );
  const registrarService = useMemo(() => {
    if (!program) return null;
    return new RegistrarService(program as Program<Landlocked>);
  }, [program]);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!publicKey || !program) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      try {
        const userType = await getUserType(program as Program<Landlocked>, publicKey);
        // Only admins can access this page
        setIsAuthorized(userType === "admin");
      } catch (error) {
        console.error("Error checking user role:", error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [publicKey, program]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-600">
          {!publicKey
            ? "Please connect your wallet to access this page."
            : "You must be an admin to access this page."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <RegistrarComponent />
    </div>
  );
}
