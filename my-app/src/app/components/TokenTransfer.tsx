'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface TokenTransferProps {
  contractAddress: string;
}

export const TokenTransfer: React.FC<TokenTransferProps> = ({ contractAddress }) => {
  const { account, signAndSubmitTransaction } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [txnHash, setTxnHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<string>('Unknown');
  const [manualBalance, setManualBalance] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Helper function to convert address to hex string
  const addressToHex = (address: any) => {
    if (typeof address === 'string') return address;
    if (address.data && Array.isArray(address.data)) {
      // Convert Uint8Array to hex string
      return '0x' + Array.from(address.data).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return address.toString();
  };

  // Fetch user balance using direct API (testnet only) - Most efficient method
  const fetchBalance = async () => {
    if (!account?.address) return;
    
    try {
      const addressHex = addressToHex(account.address);
      console.log('Fetching balance for address:', addressHex);
      
      // Direct fetch of the specific coin store resource (most efficient)
      const response = await fetch(
        `https://fullnode.testnet.aptoslabs.com/v1/accounts/${addressHex}/resource/0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No APT coin store found - account has 0 balance');
          setBalance(0);
          setNetwork('Testnet');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const json = await response.json();
      console.log('Coin store resource:', json);
      
      if (json.data && json.data.fields && json.data.fields.coin && json.data.fields.coin.value) {
        const octas = BigInt(json.data.fields.coin.value);
        const balance = Number(octas) / 1e8; // Convert octas to APT
        console.log('Balance found:', balance);
        setBalance(balance);
      } else {
        console.log('Invalid coin store data structure');
        setBalance(0);
      }
      
      setNetwork('Testnet');
      
    } catch (err) {
      console.error('Error fetching balance:', err);
      setBalance(0);
    }
  };

  useEffect(() => {
    if (account?.address) {
      fetchBalance();
    } else {
      // Reset balance when no account is connected
      setBalance(0);
      setNetwork('Unknown');
    }
  }, [account?.address]);

  const handleTransfer = async () => {
    if (!account?.address || !recipient || !amount) {
      setError('Please fill in all fields');
      return;
    }

    if (Number(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (Number(amount) > balance) {
      setError('Insufficient balance');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTxnHash(null);

    try {
      const amountInOctas = Math.floor(Number(amount) * 100000000); // Convert APT to octas
      const addressHex = addressToHex(account.address);

      console.log('Attempting transfer with:', {
        contractAddress,
        function: `${contractAddress}::TokenTransfer::transfer_aptos`,
        recipient,
        amountInOctas,
        sender: addressHex
      });

      // Build transaction payload using the correct format
      const transactionPayload = {
        sender: addressHex,
        data: {
          function: `${contractAddress}::TokenTransfer::transfer_aptos`,
          functionArguments: [recipient, amountInOctas.toString()],
        },
      };

      console.log('Transaction payload:', transactionPayload);

      // Try the transaction with correct payload format
      const transaction = await signAndSubmitTransaction(transactionPayload);

      setTxnHash(transaction.hash);
      console.log('Transfer successful:', transaction.hash);
      
      // Refresh balance after successful transfer
      setTimeout(() => {
        fetchBalance();
      }, 2000);

    } catch (err: any) {
      console.error('Transfer failed with details:', {
        error: err,
        message: err.message,
        stack: err.stack,
        recipient,
        amount,
        contractAddress
      });
      
      // If wallet adapter fails, show a helpful message
      if (err.message && err.message.includes('map')) {
        setError('Wallet adapter error. Please try disconnecting and reconnecting your wallet, or try a different wallet.');
      } else {
        setError(`Transfer failed: ${err.message || 'Unknown error. Check console for details.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Transfer APT</h2>
              <p className="text-purple-100">Send Aptos tokens securely</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Balance Display */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Your Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {balance.toFixed(4)} APT
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Network: {network} | Address: {account?.address ? `${addressToHex(account.address).slice(0, 6)}...${addressToHex(account.address).slice(-4)}` : 'Not connected'}
                </p>
                {balance === 0 && (
                  <div className="text-xs text-orange-600 mt-1 space-y-1">
                    <p>⚠️ No APT balance found on this account</p>
                    <p>• Make sure you're connected to the right wallet</p>
                    <p>• Check if your APT is on mainnet vs testnet</p>
                    <p>• Try getting testnet APT from the faucet</p>
                    <button
                      onClick={() => setShowManualInput(!showManualInput)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {showManualInput ? 'Hide' : 'Show'} manual balance input
                    </button>
                  </div>
                )}
                
                {showManualInput && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border">
                    <p className="text-xs text-blue-800 mb-1">Manual Balance Override:</p>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        value={manualBalance}
                        onChange={(e) => setManualBalance(e.target.value)}
                        placeholder="Enter your APT balance"
                        step="0.0001"
                        className="flex-1 px-2 py-1 text-xs border rounded"
                      />
                      <button
                        onClick={() => {
                          const manualBal = parseFloat(manualBalance);
                          if (!isNaN(manualBal) && manualBal >= 0) {
                            setBalance(manualBal);
                            setError(null);
                          }
                        }}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={fetchBalance}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Refresh balance"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Transfer Form */}
          <div className="space-y-6">
            {/* Recipient Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 font-mono text-sm"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (APT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.0001"
                  min="0"
                  max={balance > 0 ? balance : undefined}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-500 text-sm font-medium">APT</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Min: 0.0001 APT</span>
                <span>Max: {balance > 0 ? balance.toFixed(4) : '0.0000'} APT</span>
              </div>
              {balance === 0 && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Cannot transfer with 0 balance. Use manual balance input above if needed.
                </p>
              )}
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex space-x-2">
              {[0.1, 0.5, 1, 'Max'].map((value) => (
                <button
                  key={value}
                  onClick={() => {
                    if (value === 'Max') {
                      setAmount(balance.toString());
                    } else {
                      setAmount(value.toString());
                    }
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
                >
                  {value === 'Max' ? 'Max' : `${value} APT`}
                </button>
              ))}
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Success Display */}
            {txnHash && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-green-700 text-sm font-medium">Transfer Successful!</p>
                    <a
                      href={`https://explorer.aptoslabs.com/txn/${txnHash}?network=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 text-xs hover:underline"
                    >
                      View on Explorer: {truncateHash(txnHash)}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Transfer Button */}
            <button
              onClick={handleTransfer}
              disabled={isLoading || !account?.address || !recipient || !amount}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                'Transfer APT'
              )}
            </button>
          </div>

          {/* Contract Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Contract Address:</span>
              <span className="font-mono">{formatAddress(contractAddress)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
