"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { getProvider } from "@/services/blockchain";
import { Program } from "@coral-xyz/anchor";
import { Landlocked } from "../../../target/types/landlocked";
import { getUserType } from "@/utils/helpers";
import { checkRouteAccess, UserRole } from "@/utils/routeProtection";
import { LoaderIcon } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const isLoggedIn = !!publicKey;

  const program = useMemo(
    () => getProvider(publicKey, signTransaction, sendTransaction),
    [publicKey, signTransaction, sendTransaction]
  );

  // Fetch user role when logged in
  useEffect(() => {
    (async () => {
      if (!isLoggedIn || !program || !publicKey) {
        setUserRole(null);
        setIsChecking(false);
        return;
      }

      try {
        const role = await getUserType(program as Program<Landlocked>, publicKey);
        setUserRole(role as UserRole);
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole(null);
      } finally {
        setIsChecking(false);
      }
    })();
  }, [isLoggedIn, program, publicKey]);

  // Check route access
  useEffect(() => {
    if (isChecking) return;

    (async () => {
      const access = await checkRouteAccess(
        pathname || "/",
        isLoggedIn,
        userRole,
        program as Program<Landlocked> | null,
        publicKey
      );

      if (!access.hasAccess && access.redirectTo) {
        router.push(access.redirectTo);
      }
    })();
  }, [pathname, isLoggedIn, userRole, program, publicKey, isChecking, router]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">
          <LoaderIcon className="w-10 h-10 animate-spin text-[#a36143]" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
