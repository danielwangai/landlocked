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

  // Reset checking state when pathname, auth state, or role changes
  useEffect(() => {
    setIsChecking(true);
    setHasAccess(false);
  }, [pathname, isLoggedIn, isUserRoleLoading, userRole]);

  // Set isChecking to false when ready to check
  useEffect(() => {
    // Don't check while user role is still loading (if logged in)
    if (isUserRoleLoading && isLoggedIn) {
      setIsChecking(true);
      return;
    }

    // Special case: Dashboard for authenticated users with a role - grant immediate access
    // Only short-circuit if user has a role (admin/registrar/user), otherwise fall through to checkRouteAccess
    if (pathname === "/dashboard" && isLoggedIn && !isUserRoleLoading && userRole) {
      setIsChecking(false);
      setHasAccess(true);
      return;
    }

    // Ready to check
    setIsChecking(false);
  }, [pathname, isLoggedIn, isUserRoleLoading, userRole]);

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

      if (!access.hasAccess) {
        // Access denied - handle redirect if provided
        if (access.redirectTo && pathname !== access.redirectTo) {
          if (!cancelled) router.push(access.redirectTo);
        }
        // Always set hasAccess to false when access is denied
        if (!cancelled) setHasAccess(false);
        return;
      }

      // Access granted
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
