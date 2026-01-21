"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import { FaFileAlt, FaUsers } from "react-icons/fa";
import { FaPerson } from "react-icons/fa6";
import { getProvider } from "@/services/blockchain";
import { Program } from "@coral-xyz/anchor";
import { Landlocked } from "../../../target/types/landlocked";
import { getUserType } from "@/utils/helpers";

type UserRole = "admin" | "registrar" | "user";

interface UserRoleInfo {
  isAdmin: boolean;
  isRegistrar: boolean;
  role: UserRole;
}

export default function Sidebar() {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const program = useMemo(
    () => getProvider(publicKey, signTransaction, sendTransaction),
    [publicKey, signTransaction, sendTransaction]
  );
  const pathname = usePathname();
  const [userRoleInfo, setUserRoleInfo] = useState<UserRoleInfo>({
    isAdmin: false,
    isRegistrar: false,
    role: "user",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!publicKey) {
        setUserRoleInfo({ isAdmin: false, isRegistrar: false, role: "user" });
        setIsLoading(false);
        return;
      }

      const role = await getUserType(program as Program<Landlocked>, publicKey);
      setUserRoleInfo({
        isAdmin: role === "admin",
        isRegistrar: role === "registrar",
        role: role as UserRole,
      });
      setIsLoading(false);
    })();
  }, [publicKey]);

  // Define all menu items with role requirements
  const allMenuItems = useMemo(
    () => [
      {
        label: "Registrar Management",
        href: "/registrars",
        icon: FaPerson,
        roles: ["admin"] as UserRole[],
      },
      {
        label: "User Directory",
        href: "/users",
        icon: FaUsers,
        roles: ["admin", "registrar"] as UserRole[],
      },
      {
        label: "Deed Registry",
        href: "/title-deeds",
        icon: FaFileAlt,
        roles: ["admin", "registrar"] as UserRole[],
      },
      {
        label: "My Properties",
        href: "/my-properties",
        icon: FaFileAlt,
        roles: ["user"] as UserRole[],
      },
      { label: "Agreements", href: "/agreements", icon: FaUsers, roles: ["user"] as UserRole[] },
    ],
    []
  );

  // Filter menu items based on user role
  const menuItems = useMemo(() => {
    if (isLoading) return [];
    const filteredItems = allMenuItems.filter((item) => item.roles.includes(userRoleInfo.role));
    return [{ section: "", items: filteredItems }];
  }, [userRoleInfo.role, isLoading, allMenuItems]);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#ebdbc8] border-r border/brown flex flex-col">
      {/* Top Section - matches header height */}
      <div className="px-6 py-8 flex items-center">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="LandLocked Logo" width={24} height={24} />
          <h1 className="text-xl font-bold text-gray-900">LandLocked</h1>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto">
        {menuItems.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6">
            {group.section && (
              <h2 className="px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {group.section}
              </h2>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-6 h-[5em] text-sm font-medium transition-colors text-lg ${
                        active ? "bg-[#a36143] text-white" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="text-lg" />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Section - User Profile */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
            {publicKey ? publicKey.toString().slice(0, 2).toUpperCase() : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {publicKey
                ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
                : "Not Connected"}
            </p>
            <div className="flex gap-1 mt-1">
              {userRoleInfo.isAdmin && (
                <span className="text-xs px-1.5 py-0.5 bg-orange-500 text-white rounded">
                  Admin
                </span>
              )}
              {userRoleInfo.isRegistrar && (
                <span className="text-xs px-1.5 py-0.5 bg-green-500 text-white rounded">
                  Registrar
                </span>
              )}
              {!userRoleInfo.isAdmin && !userRoleInfo.isRegistrar && (
                <span className="text-xs text-gray-500">User</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
