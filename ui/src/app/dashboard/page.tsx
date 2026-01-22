"use client";

import { useUserRole } from "@/contexts/UserRoleContext";

export default function DashboardPage() {
  const { userRole } = useUserRole();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-[#a36143] mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome to your dashboard{userRole ? ` (${userRole})` : ""}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-2">Quick Actions</h2>
          <p className="text-gray-600 text-sm">
            Access your most frequently used features from here.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
          <p className="text-gray-600 text-sm">View your recent transactions and updates.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-2">Account Info</h2>
          <p className="text-gray-600 text-sm">Manage your account settings and preferences.</p>
        </div>
      </div>
    </div>
  );
}
