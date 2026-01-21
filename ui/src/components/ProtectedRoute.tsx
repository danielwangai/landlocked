"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { getProvider } from "@/services/blockchain";
import { Program } from "@coral-xyz/anchor";
import { Landlocked } from "../../../target/types/landlocked";
import { checkRouteAccess } from "@/utils/routeProtection";
import { useUserRole } from "@/contexts/UserRoleContext";
import { LoaderIcon } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const pathname = usePathname();
  const router = useRouter();
  const { userRole, isLoading: isChecking } = useUserRole();
  const isLoggedIn = !!publicKey;

  const program = useMemo(
    () => getProvider(publicKey, signTransaction, sendTransaction),
    [publicKey, signTransaction, sendTransaction]
  );

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
