'use client';

import React, { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { WalletModal } from './WalletModal';

export const Navbar = () => {
  const { account, connected } = useWallet();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const handleConnectClick = () => {
    setIsWalletModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsWalletModalOpen(false);
  };

  const truncateAddress = (address: string | undefined | null) => {
    if (!address || typeof address !== 'string') return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  AptosDApp
                </h1>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a
                  href="#"
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Home
                </a>
                <a
                  href="#"
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Features
                </a>
                <a
                  href="#"
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  About
                </a>
              </div>
            </div>

            {/* Connect Button */}
            <div className="flex items-center">
              {connected && account ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700"  onClick={() => setIsWalletModalOpen(true)} style={{cursor: 'pointer'}}>

                      {truncateAddress(account.address.toString())}
                    </span>
                  </div>
                  {/* <button
                    onClick={() => setIsWalletModalOpen(true)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    Manage
                  </button> */}
                </div>
              ) : (
                <button
                  onClick={handleConnectClick}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Connect Wallet
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                type="button"
                className="text-gray-700 hover:text-purple-600 focus:outline-none focus:text-purple-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            <a
              href="#"
              className="text-gray-700 hover:text-purple-600 block px-3 py-2 rounded-md text-base font-medium"
            >
              Home
            </a>
            <a
              href="#"
              className="text-gray-700 hover:text-purple-600 block px-3 py-2 rounded-md text-base font-medium"
            >
              Features
            </a>
            <a
              href="#"
              className="text-gray-700 hover:text-purple-600 block px-3 py-2 rounded-md text-base font-medium"
            >
              About
            </a>
          </div>
        </div>
      </nav>

      {/* Wallet Modal */}
      <WalletModal isOpen={isWalletModalOpen} onClose={handleCloseModal} />
    </>
  );
};
