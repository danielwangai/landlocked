"use client";

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Program } from "@coral-xyz/anchor";
import { Landlocked } from "../../../target/types/landlocked";
import { getProvider } from "@/services/blockchain";
import { getUserType } from "@/utils/helpers";
import { UserRole } from "@/utils/routeProtection";

interface UserRoleContextType {
  userRole: UserRole | null;
  isLoading: boolean;
  refreshUserRole: (idNumber?: string) => Promise<void>;
}

const UserRoleContext = createContext<UserRoleContextType>({
  userRole: null,
  isLoading: false,
  refreshUserRole: async () => {},
});

export const useUserRole = () => useContext(UserRoleContext);

interface UserRoleProviderProps {
  children: ReactNode;
}

export function UserRoleProvider({ children }: UserRoleProviderProps) {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const program = useMemo(
    () => getProvider(publicKey, signTransaction, sendTransaction),
    [publicKey, signTransaction, sendTransaction]
  );

  const isLoggedIn = !!publicKey;

  // Function to refresh user role (can be called with idNumber after account creation)
  const refreshUserRole = async () => {
    if (!isLoggedIn || !program || !publicKey) {
      setUserRole(null);
      return;
    }

    setIsLoading(true);
    try {
      const role = await getUserType(program as Program<Landlocked>, publicKey);
      setUserRole(role as UserRole);
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user type when wallet connects
  useEffect(() => {
    refreshUserRole();
  }, [isLoggedIn, program, publicKey]);

  return (
    <UserRoleContext.Provider value={{ userRole, isLoading, refreshUserRole }}>
      {children}
    </UserRoleContext.Provider>
  );
}
