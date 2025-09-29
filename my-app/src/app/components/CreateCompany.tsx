'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

interface CreateCompanyProps {
  contractAddress: string;
}

export const CreateCompany: React.FC<CreateCompanyProps> = ({ contractAddress }) => {
  const { account, signAndSubmitTransaction } = useWallet();
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txnHash, setTxnHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingCompany, setExistingCompany] = useState<any>(null);
  const [isCheckingCompany, setIsCheckingCompany] = useState(false);

  // Initialize Aptos client
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  // Use the contract address as the default registry address
  // In a real app, this would be a separate registry contract
  const registryAddress = contractAddress;

  // Check if user already has a company
  const checkExistingCompany = async () => {
    if (!account?.address) return;
    
    setIsCheckingCompany(true);
    try {
      const addressString = typeof account.address === 'string' 
        ? account.address 
        : account.address.toString();
      
      console.log('Checking for existing company for address:', addressString);
      
      // Try to get the Company resource for this address
      const response = await fetch(
        `https://fullnode.testnet.aptoslabs.com/v1/accounts/${addressString}/resource/${contractAddress}::paylance_v10::Company`
      );
      
      if (response.ok) {
        const companyData = await response.json();
        console.log('Existing company found:', companyData);
        setExistingCompany(companyData.data);
      } else if (response.status === 404) {
        console.log('No existing company found');
        setExistingCompany(null);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      console.error('Error checking existing company:', err);
      setExistingCompany(null);
    } finally {
      setIsCheckingCompany(false);
    }
  };

  // Check for existing company when account changes
  useEffect(() => {
    if (account?.address) {
      checkExistingCompany();
    } else {
      setExistingCompany(null);
    }
  }, [account?.address]);

  const handleCreateCompany = async () => {
    if (!account?.address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!companyName || !companyEmail) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTxnHash(null);

    try {
      console.log('Creating company with:', {
        contractAddress,
        function: `${contractAddress}::paylance_v10::create_company`,
        companyName,
        companyEmail,
        registryAddress
      });

      // Build transaction payload - pass strings directly
      const transaction = {
        sender: account.address,
        data: {
          function: `${contractAddress}::paylance_v10::create_company`,
          functionArguments: [companyName, companyEmail, registryAddress],
        },
      };

      console.log('Transaction payload:', transaction);

      const result = await signAndSubmitTransaction(transaction);
      setTxnHash(result.hash);
      console.log('Company created successfully:', result.hash);

    } catch (err: any) {
      console.error('Company creation failed:', err);
      setError(`Company creation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: any) => {
    if (!address) return '';
    const addressString = typeof address === 'string' ? address : address.toString();
    return `${addressString.slice(0, 6)}...${addressString.slice(-4)}`;
  };

  const truncateHash = (hash: any) => {
    if (!hash) return '';
    const hashString = typeof hash === 'string' ? hash : hash.toString();
    return `${hashString.slice(0, 8)}...${hashString.slice(-8)}`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Create Company</h2>
              <p className="text-green-100">Set up your payroll company on Aptos</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Wallet Connection Status */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Wallet Status</p>
                <p className="text-lg font-semibold text-gray-900">
                  {account?.address ? 'Connected' : 'Not Connected'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {account?.address ? 
                    `Address: ${formatAddress(account.address)}` : 
                    'Please connect your wallet to create a company'
                  }
                </p>
              </div>
              {account?.address && (
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              )}
            </div>
          </div>

          {/* Company Information */}
          <div className="space-y-6">
            {isCheckingCompany ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-600">Checking for existing company...</span>
                </div>
              </div>
            ) : existingCompany ? (
              /* Existing Company Display */
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <h3 className="text-lg font-semibold text-green-800">Company Already Created</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">Company Name</label>
                    <p className="text-green-800 font-medium">{existingCompany.company_name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">Company Email</label>
                    <p className="text-green-800 font-medium">{existingCompany.company_email}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">Admin Address</label>
                    <p className="text-green-800 font-mono text-sm">{formatAddress(existingCompany.admin)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">Company Status</label>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-800">Active</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-green-200">
                  <button
                    onClick={checkExistingCompany}
                    className="text-green-600 hover:text-green-800 text-sm font-medium underline"
                  >
                    Refresh Company Data
                  </button>
                </div>
              </div>
            ) : (
              /* Company Creation Form */
              <>
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter your company name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Company Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Email *
                  </label>
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="Enter your company email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </>
            )}

            {/* Registry Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-blue-700 text-sm font-medium">Registry Address</p>
                  <p className="text-blue-600 text-xs">
                    Using contract address as registry: {formatAddress(registryAddress)}
                  </p>
                </div>
              </div>
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
                    <p className="text-green-700 text-sm font-medium">Company Created Successfully!</p>
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

            {/* Create Company Button - Only show if no existing company */}
            {!existingCompany && !isCheckingCompany && (
              <button
                onClick={handleCreateCompany}
                disabled={isLoading || !account?.address || !companyName || !companyEmail}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Company...</span>
                  </div>
                ) : (
                  'Create Company'
                )}
              </button>
            )}
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
