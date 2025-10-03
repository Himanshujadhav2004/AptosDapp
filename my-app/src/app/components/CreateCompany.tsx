'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

interface CreateCompanyProps {
  contractAddress: string;
}

export const CreateCompany: React.FC<CreateCompanyProps> = ({ contractAddress }) => {
  const router = useRouter();
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
        `https://fullnode.testnet.aptoslabs.com/v1/accounts/${addressString}/resource/${contractAddress}::paylance_v12::Company`
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
        function: `${contractAddress}::paylance_v12::create_company`,
        companyName,
        companyEmail,
        registryAddress
      });

      // Build transaction payload - pass strings directly
      const transaction = {
        sender: typeof account.address === 'string' ? account.address : account.address.toString(),
        data: {
          function: `${contractAddress}::paylance_v12::create_company`,
          functionArguments: [companyName, companyEmail, registryAddress],
        },
      };

      console.log('Transaction payload:', transaction);

      const result = await signAndSubmitTransaction(transaction as any);
      setTxnHash(result.hash);
      console.log('Company created successfully:', result.hash);

      // Dispatch event to notify navbar of company creation
      try {
        window.dispatchEvent(new Event('company:created'));
      } catch (e) {
        console.log('Could not dispatch company:created event:', e);
      }

      // Wait a moment for the transaction to be processed, then redirect
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

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
    <div className="max-w-3xl mx-auto px-3">
      <div className="rounded-2xl border  border-border overflow-hidden bg-secondary/10">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-secondary/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Create Company</h2>
              <p className="text-sm text-muted-foreground">Set up your payroll company on Aptos</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
         

          {/* Company Information */}
          <div className="space-y-6">
            {isCheckingCompany ? null : existingCompany ? (
              /* Existing Company Display */
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <h3 className="text-lg font-semibold text-green-500">Company Already Created</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-green-500 mb-1">Company Name</label>
                    <p className="text-foreground font-medium">{existingCompany.company_name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-green-500 mb-1">Company Email</label>
                    <p className="text-foreground font-medium">{existingCompany.company_email}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-green-500 mb-1">Admin Address</label>
                    <p className="text-foreground font-mono text-sm">{formatAddress(existingCompany.admin)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-green-500 mb-1">Company Status</label>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-foreground">Active</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-green-500/20">
                  <button
                    onClick={checkExistingCompany}
                    className="text-green-500 hover:text-green-400 text-sm font-medium underline"
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
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter your company name"
                    className="w-full px-4 py-3 bg-secondary/10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                  />
                </div>

                {/* Company Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Email *
                  </label>
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="Enter your company email"
                    className="w-full px-4 py-3 bg-secondary/10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                  />
                </div>
              </>
            )}

            {/* Registry Info */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-foreground text-sm font-medium">Registry Address</p>
                  <p className="text-muted-foreground text-xs">
                    Using contract address as registry: {formatAddress(registryAddress)}
                  </p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Success Display */}
            {txnHash && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-green-500 text-sm font-medium">Company Created Successfully!</p>
                    <a
                      href={`https://explorer.aptoslabs.com/txn/${txnHash}?network=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 text-xs hover:underline"
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
              className="w-50 btn-primary py-3 rounded-lg font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed block mx-auto"
            >
            </button>
            
            )}
          </div>

          
        </div>
      </div>
    </div>
  );
};
