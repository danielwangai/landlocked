"use client";

import "./globals.css";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { ReactQueryProvider } from "./root-query-provider";
import AppWalletProvider from "../components/AppWalletProvider";

const metadata = {
  title: "Landlocked",
  description: "A trustless decentralized land registry",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white">
        <ReactQueryProvider>
          <AppWalletProvider>
            <div className="flex min-h-screen">
              {/* Sidebar */}
              <Sidebar />

              {/* Main Content Area */}
              <div className="flex-1 ml-64">
                {/* Header */}
                <Header />

                {/* Page Content */}
                <main className="pt-16 min-h-screen bg-gray-50">
                  <div className="p-6">{children}</div>
                </main>
              </div>
            </div>

            <ToastContainer
              position="bottom-center"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
            />
          </AppWalletProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
