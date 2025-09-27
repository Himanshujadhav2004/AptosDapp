'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { WalletModal } from './WalletModal';

export const Navbar = () => {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [isLoadingUserBalance, setIsLoadingUserBalance] = useState(false);

  const handleConnectClick = () => {
    setIsWalletModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsWalletModalOpen(false);
  };

  const handleDepositClick = () => {
    setIsDepositModalOpen(true);
    setDepositError(null);
    setDepositSuccess(null);
    setDepositAmount('');
    // Fetch both user balance and treasury balance when opening deposit modal
    fetchUserBalance();
    fetchTreasuryBalance();
  };

  const handleCloseDepositModal = () => {
    setIsDepositModalOpen(false);
    setDepositError(null);
    setDepositSuccess(null);
    setDepositAmount('');
  };

  const handleDeposit = async () => {
    if (!account?.address || !depositAmount) {
      setDepositError('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepositError('Please enter a valid amount greater than 0');
      return;
    }

    if (amount > userBalance) {
      setDepositError('Insufficient balance in your wallet');
      return;
    }

    setIsDepositing(true);
    setDepositError(null);
    setDepositSuccess(null);

    try {
      const amountInOctas = Math.floor(amount * 100000000);
      const contractAddress = '0x8922d3e9d9b5ea2175ac47c083d1b5b83af560113481d02b03d143552d14f994';
      
      // Convert address to hex string like in TokenTransfer
      const addressString = typeof account.address === 'string' 
        ? account.address 
        : account.address.toString();
      
      const transaction = {
        sender: addressString,
        data: {
          function: `${contractAddress}::paylance::deposit_apt`,
          functionArguments: [amountInOctas.toString()],
        },
      };

      const result = await signAndSubmitTransaction(transaction as any);
      
      setDepositSuccess(`Deposit successful! Transaction: ${result.hash}`);
      setDepositAmount('');
      
      // Refresh both balances after successful deposit
      setTimeout(() => {
        fetchUserBalance();
        fetchTreasuryBalance();
      }, 2000);

    } catch (err: any) {
      console.error('Deposit failed:', err);
      setDepositError(`Deposit failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDepositing(false);
    }
  };

  const truncateAddress = (address: string | undefined | null) => {
    if (!address || typeof address !== 'string') return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Fetch user's wallet balance
  const fetchUserBalance = async () => {
    if (!account?.address) return;

    setIsLoadingUserBalance(true);
    try {
      const addressString = account.address.toString();
      
      // Try testnet first
      const testnetConfig = new AptosConfig({ network: Network.TESTNET });
      const testnetAptos = new Aptos(testnetConfig);
      
      try {
        const balance = await testnetAptos.getAccountAPTAmount({
          accountAddress: addressString
        });
        const aptBalance = balance / 100000000; // Convert from Octas to APT
        console.log(`User testnet balance: ${aptBalance} APT`);
        setUserBalance(aptBalance);
        return;
      } catch (testnetError) {
        console.log("User testnet balance fetch failed, trying mainnet...");
        
        // Fallback to mainnet
        const mainnetConfig = new AptosConfig({ network: Network.MAINNET });
        const mainnetAptos = new Aptos(mainnetConfig);
        
        const balance = await mainnetAptos.getAccountAPTAmount({
          accountAddress: addressString
        });
        const aptBalance = balance / 100000000; // Convert from Octas to APT
        console.log(`User mainnet balance: ${aptBalance} APT`);
        setUserBalance(aptBalance);
      }
    } catch (err) {
      console.error("Error fetching user balance:", err);
      setUserBalance(0);
    } finally {
      setIsLoadingUserBalance(false);
    }
  };

  // Fetch company treasury balance
  const fetchTreasuryBalance = async () => {
    if (!account?.address) return;

    setIsLoadingBalance(true);
    try {
      const addressString = account.address.toString();
      const contractAddress = '0x8922d3e9d9b5ea2175ac47c083d1b5b83af560113481d02b03d143552d14f994';
      
      // Try testnet first
      const testnetConfig = new AptosConfig({ network: Network.TESTNET });
      const testnetAptos = new Aptos(testnetConfig);
      
      try {
        const treasuryBalance = await testnetAptos.view({
          payload: {
            function: `${contractAddress}::paylance::get_treasury_balance`,
            functionArguments: [addressString],
          },
        });
        
        const balance = Number(treasuryBalance[0]) / 100000000; // Convert from Octas to APT
        console.log(`Testnet treasury balance: ${balance} APT`);
        setBalance(balance);
        return;
      } catch (testnetError) {
        console.log("Testnet treasury balance fetch failed, trying mainnet...");
        
        // Fallback to mainnet
        const mainnetConfig = new AptosConfig({ network: Network.MAINNET });
        const mainnetAptos = new Aptos(mainnetConfig);
        
        const treasuryBalance = await mainnetAptos.view({
          payload: {
            function: `${contractAddress}::paylance::get_treasury_balance`,
            functionArguments: [addressString],
          },
        });
        
        const balance = Number(treasuryBalance[0]) / 100000000; // Convert from Octas to APT
        console.log(`Mainnet treasury balance: ${balance} APT`);
        setBalance(balance);
      }
    } catch (err) {
      console.error("Error fetching treasury balance:", err);
      setBalance(0);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Fetch treasury balance when account changes
  useEffect(() => {
    if (connected && account?.address) {
      fetchTreasuryBalance();
    } else {
      setBalance(0);
    }
  }, [connected, account?.address]);

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
                <Link
                  href="/"
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Home
                </Link>
                <Link
                  href="/create-company"
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Create Payroll
                </Link>
                <Link
                  href="/employees"
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Employees
                </Link>
                <Link
                  href="/pay"
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Pay
                </Link>
                <Link
                  href="/analysis"
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Analysis
                </Link>
                <Link
                  href="/about"
                  className="text-gray-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  About
                </Link>
              </div>
            </div>

            {/* Connect Button */}
            <div className="flex items-center space-x-3">
              {connected && account ? (
                <>
                  {/* Treasury Balance Display */}
                  <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {isLoadingBalance ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    ) : (
                      <span className="text-sm font-medium text-gray-700">
                        {balance.toFixed(4)} APT
                      </span>
                    )}
                  </div>

                  {/* Deposit Button */}
                  <button
                    onClick={handleDepositClick}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Deposit</span>
                  </button>

                  {/* Wallet Address */}
                  <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span 
                      className="text-sm font-medium text-green-700 cursor-pointer" 
                      onClick={() => setIsWalletModalOpen(true)}
                    >
                      {truncateAddress(account.address.toString())}
                    </span>
                  </div>
                </>
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
            <Link
              href="/"
              className="text-gray-700 hover:text-purple-600 block px-3 py-2 rounded-md text-base font-medium"
            >
              Home
            </Link>
            <Link
              href="/create-company"
              className="text-gray-700 hover:text-purple-600 block px-3 py-2 rounded-md text-base font-medium"
            >
              Create Payroll
            </Link>
            <Link
              href="/employees"
              className="text-gray-700 hover:text-purple-600 block px-3 py-2 rounded-md text-base font-medium"
            >
              Employees
            </Link>
            <Link
              href="/pay"
              className="text-gray-700 hover:text-purple-600 block px-3 py-2 rounded-md text-base font-medium"
            >
              Pay
            </Link>
            <Link
              href="/analysis"
              className="text-gray-700 hover:text-purple-600 block px-3 py-2 rounded-md text-base font-medium"
            >
              Analysis
            </Link>
            <Link
              href="/about"
              className="text-gray-700 hover:text-purple-600 block px-3 py-2 rounded-md text-base font-medium"
            >
              About
            </Link>
          </div>
        </div>
      </nav>

      {/* Wallet Modal */}
      <WalletModal isOpen={isWalletModalOpen} onClose={handleCloseModal} />

      {/* Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Deposit APT Tokens</h3>
              <button
                onClick={handleCloseDepositModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Deposit to Contract Treasury</h4>
                <p className="text-sm text-gray-600">
                  Deposit APT tokens directly to the contract treasury using smart contract function
                </p>
              </div>

              {/* Balance Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* User Wallet Balance */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span className="text-sm font-medium text-blue-700">Your Wallet:</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-900">
                      {isLoadingUserBalance ? (
                        <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                      ) : (
                        `${userBalance.toFixed(4)} APT`
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">Available to deposit</p>
                </div>

                {/* Treasury Balance */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-sm font-medium text-green-700">Treasury:</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-green-900">
                        {isLoadingBalance ? (
                          <div className="w-4 h-4 border-2 border-green-300 border-t-green-600 rounded-full animate-spin"></div>
                        ) : (
                          `${balance.toFixed(4)} APT`
                        )}
                      </span>
                      <button
                        onClick={fetchTreasuryBalance}
                        disabled={isLoadingBalance}
                        className="p-1 text-green-500 hover:text-green-700 disabled:opacity-50"
                        title="Refresh Treasury Balance"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-1">Available for payroll</p>
                </div>
              </div>

              {/* Deposit Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Deposit Amount (APT)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={userBalance}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter amount to deposit"
                    disabled={isDepositing}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter amount in APT (e.g., 1.5 for 1.5 APT)</p>
              </div>

              {/* Error/Success Messages */}
              {depositError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-red-800">{depositError}</span>
                  </div>
                </div>
              )}

              {depositSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-green-800">{depositSuccess}</span>
                  </div>
                </div>
              )}

              {/* Quick Amount Buttons */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quick Amounts</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0.1, 0.5, 1.0, 2.0].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setDepositAmount(amount.toString())}
                      disabled={isDepositing || amount > userBalance}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {amount} APT
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Based on your wallet balance</p>
              </div>

              {/* Contract Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h5 className="text-sm font-medium text-blue-900 mb-1">Smart Contract Deposit</h5>
                    <p className="text-xs text-blue-800">
                      This deposit uses the contract's deposit_apt function to securely transfer tokens to the treasury for payroll operations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
              <button
                onClick={handleCloseDepositModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0 || parseFloat(depositAmount) > userBalance}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDepositing ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Depositing...</span>
                  </div>
                ) : (
                  'Deposit APT'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
