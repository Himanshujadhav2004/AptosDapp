'use client';

import React, { useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { wallets, connect, disconnect, account, connected } = useWallet();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConnect = async (walletName: string) => {
    try {
      await connect(walletName);
      onClose();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      onClose();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const truncateAddress = (address: string | undefined | null) => {
    if (!address || typeof address !== 'string') return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {connected ? 'Wallet Connected' : 'Connect Wallet'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {connected && account ? (
              <div className="space-y-4">
                {/* Connected Wallet Info */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="text-sm font-medium text-green-800">Connected</p>
                      <p className="text-xs text-green-600 font-mono">
                        {truncateAddress(account.address.toString())}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Address:</span>
                    <span className="text-sm font-mono text-gray-900">
                      {truncateAddress(account.address.toString())}
                    </span>
                  </div>
                  {/* <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Network:</span>
                    <span className="text-sm text-gray-900">Aptos Mainnet</span>
                  </div> */}
                </div>

                {/* Disconnect Button */}
                <button
                  onClick={handleDisconnect}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
                >
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">
                  Choose a wallet to connect to your Aptos dApp
                </p>
                
                {/* Wallet List */}
                <div className="space-y-2">
                  {wallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      onClick={() => handleConnect(wallet.name)}
                      className="w-full flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group"
                    >
                      {/* Wallet Icon Placeholder */}
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {wallet.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex-1 text-left">
                        <h3 className="font-medium text-gray-900 group-hover:text-purple-700">
                          {wallet.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Connect with {wallet.name}
                        </p>
                      </div>
                      
                      <svg 
                        className="w-5 h-5 text-gray-400 group-hover:text-purple-600" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-blue-800 font-medium">New to Aptos?</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Install a wallet like Petra or Pontem to get started with Aptos dApps.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
