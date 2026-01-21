import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { Landlocked } from "../../../target/types/landlocked";
import { getUserType } from "./helpers";

export type UserRole = "admin" | "registrar" | "user";

export interface RouteAccessRule {
  // If true, requires user to be logged in
  requiresAuth?: boolean;
  // If specified, only these roles can access
  allowedRoles?: UserRole[];
  // If true, redirects to this path when access is denied
  redirectTo?: string;
}

export interface RouteConfig {
  path: string;
  access: RouteAccessRule;
}

// Define route access rules
export const routeConfigs: RouteConfig[] = [
  {
    path: "/",
    access: {
      requiresAuth: false,
      redirectTo: "/", // Redirect logged-in users away from landing
    },
  },
  {
    path: "/create-account",
    access: {
      requiresAuth: false,
      // Allow access even if wallet is connected but user doesn't have an account yet
      // Only redirect if user already has an account (admin/registrar/user)
      redirectTo: "/title-deeds", // Redirect only if user has an account
    },
  },
  {
    path: "/registrars",
    access: {
      requiresAuth: true,
      allowedRoles: ["admin"],
      redirectTo: "/",
    },
  },
  {
    path: "/title-deeds",
    access: {
      requiresAuth: true,
      allowedRoles: ["admin", "registrar", "user"],
      redirectTo: "/",
    },
  },
  {
    path: "/users",
    access: {
      requiresAuth: true,
      allowedRoles: ["admin", "registrar"],
      redirectTo: "/",
    },
  },
  {
    path: "/my-properties",
    access: {
      requiresAuth: true,
      allowedRoles: ["user"],
      redirectTo: "/",
    },
  },
  {
    path: "/agreements",
    access: {
      requiresAuth: true,
      allowedRoles: ["user"],
      redirectTo: "/",
    },
  },
];

/**
 * Get access rule for a specific route
 */
export const getRouteAccessRule = (pathname: string): RouteAccessRule | null => {
  const config = routeConfigs.find((config) => config.path === pathname);
  return config?.access || null;
};

/**
 * Check if user has access to a route
 */
export const checkRouteAccess = async (
  pathname: string,
  isLoggedIn: boolean,
  userRole: UserRole | null,
  program: Program<Landlocked> | null,
  publicKey: PublicKey | null
): Promise<{ hasAccess: boolean; redirectTo?: string }> => {
  const rule = getRouteAccessRule(pathname);

  // If no rule found, allow access (default behavior)
  if (!rule) {
    return { hasAccess: true };
  }

  // Check if authentication is required
  if (rule.requiresAuth && !isLoggedIn) {
    return { hasAccess: false, redirectTo: rule.redirectTo || "/" };
  }

  // Special handling for create-account page: allow access even if logged in, but only if user doesn't have an account yet
  if (pathname === "/create-account") {
    // If user is logged in and has a role (admin/registrar/user), redirect them away
    if (isLoggedIn) {
      // Try to fetch role if not already determined
      console.log("userRole: ", userRole);
      if (!userRole && program && publicKey) {
        try {
          const role = await getUserType(program, publicKey);
          if (role && (role === "admin" || role === "registrar" || role === "user")) {
            return { hasAccess: false, redirectTo: rule.redirectTo || "/title-deeds" };
          }
        } catch (error) {
          // User doesn't have an account yet - allow access
          return { hasAccess: true };
        }
      }
      // If user has a role, redirect them away
      if (userRole && (userRole === "admin" || userRole === "registrar" || userRole === "user")) {
        return { hasAccess: false, redirectTo: rule.redirectTo || "/title-deeds" };
      }
      // User is logged in but doesn't have an account yet - allow access
      return { hasAccess: true };
    }
    // Not logged in - allow access
    return { hasAccess: true };
  }

  // If logged in but shouldn't be on this page (e.g., landing page)
  if (!rule.requiresAuth && isLoggedIn && pathname !== "/create-account") {
    return { hasAccess: false, redirectTo: rule.redirectTo || "/title-deeds" };
  }

  // Check role-based access
  if (rule.allowedRoles && isLoggedIn) {
    if (!userRole) {
      // User role not determined yet, need to fetch it
      if (program && publicKey) {
        try {
          const role = await getUserType(program, publicKey);
          // Only allow access if role is determined and matches allowed roles
          if (role && rule.allowedRoles.includes(role as UserRole)) {
            return { hasAccess: true };
          }
          // If role is null (no account) or doesn't match, deny access
          return { hasAccess: false, redirectTo: rule.redirectTo || "/" };
        } catch (error) {
          console.error("Error checking user role:", error);
          // If we can't determine role, deny access
          return { hasAccess: false, redirectTo: rule.redirectTo || "/" };
        }
      }
      // If we can't determine role (no program/publicKey), deny access
      return { hasAccess: false, redirectTo: rule.redirectTo || "/" };
    }

    // User role is determined - check if it matches allowed roles
    if (!rule.allowedRoles.includes(userRole)) {
      return { hasAccess: false, redirectTo: rule.redirectTo || "/" };
    }
  }

  return { hasAccess: true };
};
