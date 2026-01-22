"use client";

import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { ReactQueryProvider } from "./root-query-provider";
import AppWalletProvider from "../components/AppWalletProvider";
import ReduxProvider from "../components/ReduxProvider";
import LayoutWrapper from "../components/LayoutWrapper";
import ProtectedRoute from "../components/ProtectedRoute";
import { UserRoleProvider } from "../contexts/UserRoleContext";
import { Quicksand } from "next/font/google";

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
  display: "swap",
});

const metadata = {
  title: "Landlocked",
  description: "A trustless decentralized land registry",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${quicksand.variable} font-sans`}>
        <ReduxProvider>
          <ReactQueryProvider>
            <AppWalletProvider>
              <UserRoleProvider>
                <ProtectedRoute>
                  <LayoutWrapper>{children}</LayoutWrapper>
                </ProtectedRoute>
              </UserRoleProvider>
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
        </ReduxProvider>
      </body>
    </html>
  );
}
