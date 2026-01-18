'use client'

import './globals.css'
import Header from '../components/Header'
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer } from 'react-toastify'
import { ReactQueryProvider } from './root-query-provider'
import AppWalletProvider from '../components/AppWalletProvider'

const metadata = {
  title: 'Landlocked',
  description: 'A trustless decentralized land registry',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white">
        <ReactQueryProvider>
          <AppWalletProvider>
            <Header />
            <main className="mx-auto min-h-screen bg-gray-100">
              <div className=" h-24" />
              {children}
              <div className=" h-24" />
            </main>

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
  )
}
