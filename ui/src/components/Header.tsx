import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FaUserCircle, FaPlusCircle, FaBars, FaTimes } from "react-icons/fa";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="bg-[#ebdbc8] shadow-md border-b border-gray-300 px-6 py-5.5 flex justify-between">
      <div></div>
      {isMounted && (
        <div className="hidden md:inline-block">
          <WalletMultiButton />
        </div>
      )}
    </div>
  );
}
