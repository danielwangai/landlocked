"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
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
  const { userRole, isLoading: isUserRoleLoading } = useUserRole();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const isLoggedIn = !!publicKey;

  const program = useMemo(
    () => getProvider(publicKey, signTransaction, sendTransaction),
    [publicKey, signTransaction, sendTransaction]
  );

  // Reset checking state when pathname changes
  useEffect(() => {
    setIsChecking(true);
    setHasAccess(false);
  }, [pathname]);

  // Set isChecking to false when ready to check
  useEffect(() => {
    // Don't check while user role is still loading (if logged in)
    if (isUserRoleLoading && isLoggedIn) {
      setIsChecking(true);
      return;
    }

    // Special case: Dashboard for authenticated users - grant immediate access
    if (pathname === "/dashboard" && isLoggedIn && !isUserRoleLoading) {
      setIsChecking(false);
      setHasAccess(true);
      return;
    }

    // Ready to check
    setIsChecking(false);
  }, [pathname, isLoggedIn, isUserRoleLoading]);

  // Check route access
  useEffect(() => {
    if (isChecking) return;

    let cancelled = false;
    (async () => {
      const access = await checkRouteAccess(
        pathname || "/",
        isLoggedIn,
        userRole,
        program as Program<Landlocked> | null,
        publicKey
      );

      if (cancelled) return;

      if (!access.hasAccess && access.redirectTo) {
        // Don't redirect if already on target (prevents loops)
        if (pathname !== access.redirectTo) {
          router.push(access.redirectTo);
        }
        if (!cancelled) setHasAccess(false);
        return;
      }
      if (!cancelled) setHasAccess(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, isLoggedIn, userRole, program, publicKey, isChecking, router]);

  // Show loading state while checking
  if (isChecking || !hasAccess) {
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
