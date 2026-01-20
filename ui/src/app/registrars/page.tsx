"use client";

import { getProvider, RegistrarService } from "@/services/blockchain";
import { Registrar } from "@/utils/interfaces";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import { Landlocked } from "../../../../target/types/landlocked";
import { Program } from "@coral-xyz/anchor";
import RegistrarComponent from "@/components/Registrar.component";

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
  const [registrars, setRegistrars] = useState<Registrar[]>([]);
  useEffect(() => {
    if (registrarService && publicKey) {
      registrarService.getRegistrars().then((registrars: Registrar[]) => {
        setRegistrars(registrars);
      });
    }
  }, [registrarService, publicKey]);
  return (
    <div className="flex flex-col">
      <RegistrarComponent />
    </div>
  );
}
