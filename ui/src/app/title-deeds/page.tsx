"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { getProtocolState, TitleDeedService, getProvider } from "@/services/blockchain";
import { useMemo, useState, useEffect } from "react";
import { ProtocolState, TitleDeed } from "@/utils/interfaces";
import { Landlocked } from "../../../../target/types/landlocked";
import { Program } from "@coral-xyz/anchor";

export default function TitleDeedsPage() {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const program = useMemo(
    () => getProvider(publicKey, signTransaction, sendTransaction),
    [publicKey, signTransaction, sendTransaction]
  );

  // title deed service
  const titleDeedService = useMemo(() => {
    if (!program) return null;
    return new TitleDeedService(program as Program<Landlocked>);
  }, [program]);

  const [titleDeeds, setTitleDeeds] = useState<TitleDeed[]>([]);
  const [protocolState, setProtocolState] = useState<ProtocolState | null>(null);

  useEffect(() => {
    if (program && publicKey) {
      getProtocolState(program as Program<Landlocked>).then((protocolState: ProtocolState) => {
        setProtocolState(protocolState);
      });
    }
  }, [program, publicKey]);
  useEffect(() => {
    const fetchTitles = async () => {
      if (titleDeedService && publicKey)
        titleDeedService.fetchTitleDeeds().then((titleDeeds: TitleDeed[]) => {
          setTitleDeeds(titleDeeds);
        });
    };
  }, [program, publicKey]);
  return <div>Title Deeds</div>;
}
