import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { FaUserCircle, FaPlusCircle, FaBars, FaTimes } from 'react-icons/fa'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function Header() {
    const [isOpen, setIsOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    return (
        <header className="bg-gray-100 shadow-md fixed w-full top-0 z-50">
            <div className="px-6 py-8 flex justify-between">
                {/* Logo */}
                <Link href="/" className="text-2xl font-bold text-green-600">
                    Landlocked
                </Link>

                {isMounted && (
                    <div className="hidden md:inline-block">
                        <WalletMultiButton />
                    </div>
                )}

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="md:hidden text-gray-700 focus:outline-none"
                >
                    {isOpen ? (
                        <FaTimes className="w-6 h-6" />
                    ) : (
                        <FaBars className="w-6 h-6" />
                    )}
                </button>
            </div>
        </header>
    )
}
