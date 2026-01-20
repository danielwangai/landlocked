"use client";

import { getProvider, RegistrarService } from "@/services/blockchain";
import { Registrar } from "@/utils/interfaces";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import { Landlocked } from "../../../../target/types/landlocked";
import { Program } from "@coral-xyz/anchor";

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
  console.log("registrars: ", registrars);
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h1 className="text-4xl font-bold text-gray-900">Registrars</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {registrars.map((registrar) => (
          <div key={registrar.authority.toString()} className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-900">
              {registrar.firstName} {registrar.lastName}
            </h2>
            <p className="text-gray-600">{registrar.idNumber}</p>
            <p className="text-gray-600">{registrar.authority.toString()}</p>
          </div>
        ))}
      </div>
      <br />
      <button
        className="bg-blue-500 text-white p-2 rounded-md"
        onClick={() => {
          if (registrarService && publicKey) {
            console.log("adding registrar");
          }
        }}
      >
        Add Registrar
      </button>
    </div>
  );
}
