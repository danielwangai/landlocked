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
      redirectTo: "/", // Redirect logged-in users away from create account
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

  // If logged in but shouldn't be on this page (e.g., landing page)
  if (!rule.requiresAuth && isLoggedIn) {
    return { hasAccess: false, redirectTo: rule.redirectTo || "/" };
  }

  // Check role-based access
  if (rule.allowedRoles && isLoggedIn) {
    if (!userRole) {
      // User role not determined yet, need to fetch it
      if (program && publicKey) {
        try {
          const role = await getUserType(program, publicKey);
          if (role && rule.allowedRoles.includes(role as UserRole)) {
            return { hasAccess: true };
          }
        } catch (error) {
          console.error("Error checking user role:", error);
        }
      }
      // If we can't determine role, deny access
      return { hasAccess: false, redirectTo: rule.redirectTo || "/" };
    }

    if (!rule.allowedRoles.includes(userRole)) {
      return { hasAccess: false, redirectTo: rule.redirectTo || "/" };
    }
  }

  return { hasAccess: true };
};
