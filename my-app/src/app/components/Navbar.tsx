'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { WalletModal } from './WalletModal';
import { useCompanyStatus } from '../hooks/useCompanyStatus';
import { cn } from '../lib/utils';
import Wrapper from './global/Wrapper';
import Icons from './global/Icons';

export const Navbar = () => {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const { hasCompany } = useCompanyStatus();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [isLoadingUserBalance, setIsLoadingUserBalance] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [isLoadingUsdcBalance, setIsLoadingUsdcBalance] = useState(false);
  const [activeDepositTab, setActiveDepositTab] = useState<'apt' | 'usdc'>('apt');
  const [usdcDepositAmount, setUsdcDepositAmount] = useState<string>('');
  const [isDepositingUsdc, setIsDepositingUsdc] = useState(false);
  const [usdcDepositError, setUsdcDepositError] = useState<string | null>(null);
  const [usdcDepositSuccess, setUsdcDepositSuccess] = useState<string | null>(null);
  const [usdcTreasuryBalance, setUsdcTreasuryBalance] = useState<number>(0);
  const [isLoadingUsdcTreasuryBalance, setIsLoadingUsdcTreasuryBalance] = useState(false);

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
    setUsdcDepositError(null);
    setUsdcDepositSuccess(null);
    setUsdcDepositAmount('');
    // Fetch user balance, treasury balance, and USDC balance when opening deposit modal
    fetchUserBalance();
    fetchTreasuryBalance();
    fetchUSDCBalance();
    fetchUSDCTreasuryBalance();
  };

  const handleCloseDepositModal = () => {
    setIsDepositModalOpen(false);
    setDepositError(null);
    setDepositSuccess(null);
    setDepositAmount('');
    setUsdcDepositError(null);
    setUsdcDepositSuccess(null);
    setUsdcDepositAmount('');
    setActiveDepositTab('apt');
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
          function: `${contractAddress}::paylance_v12::deposit_apt`,
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

  const handleUSDCDeposit = async () => {
    if (!account?.address || !usdcDepositAmount) {
      setUsdcDepositError('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(usdcDepositAmount);
    if (isNaN(amount) || amount <= 0) {
      setUsdcDepositError('Please enter a valid amount greater than 0');
      return;
    }

    if (amount > usdcBalance) {
      setUsdcDepositError('Insufficient USDC balance in your wallet');
      return;
    }

    // Check if company exists first
    try {
      const contractAddress = '0x8922d3e9d9b5ea2175ac47c083d1b5b83af560113481d02b03d143552d14f994';
      const addressString = typeof account.address === 'string' 
        ? account.address 
        : account.address.toString();
      
      const testnetConfig = new AptosConfig({ network: Network.TESTNET });
      const testnetAptos = new Aptos(testnetConfig);
      
      // Check if company exists by trying to get company info
      try {
        await testnetAptos.view({
          payload: {
            function: `${contractAddress}::paylance_v12::get_company_info`,
            functionArguments: [addressString],
          },
        });
      } catch (companyError) {
        setUsdcDepositError('Please create a company first before depositing USDC');
        return;
      }
    } catch (err) {
      console.error('Error checking company existence:', err);
      setUsdcDepositError('Error checking company status. Please try again.');
      return;
    }

    setIsDepositingUsdc(true);
    setUsdcDepositError(null);
    setUsdcDepositSuccess(null);

    try {
      const amountInMicroUSDC = Math.floor(amount * 1000000); // Convert to micro-USDC (6 decimals)
      const contractAddress = '0x8922d3e9d9b5ea2175ac47c083d1b5b83af560113481d02b03d143552d14f994';
      
      // Convert address to hex string
      const addressString = typeof account.address === 'string' 
        ? account.address 
        : account.address.toString();
      
      console.log('USDC Deposit - Amount:', amount, 'Micro-USDC:', amountInMicroUSDC);
      console.log('USDC Deposit - Contract Address:', contractAddress);
      console.log('USDC Deposit - User Address:', addressString);
      
      const transaction = {
        sender: addressString,
        data: {
          function: `${contractAddress}::paylance_v12::deposit_usdc`,
          functionArguments: [amountInMicroUSDC.toString()],
        },
      };

      console.log('USDC Deposit - Transaction:', transaction);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transaction timeout')), 30000); // 30 second timeout
      });
      
      const result = await Promise.race([
        signAndSubmitTransaction(transaction as any),
        timeoutPromise
      ]) as any;
      
      console.log('USDC Deposit - Result:', result);
      
      setUsdcDepositSuccess(`USDC Deposit successful! Transaction: ${result.hash}`);
      setUsdcDepositAmount('');
      
      // Refresh balances after successful deposit
      setTimeout(() => {
        fetchUSDCBalance();
        fetchUSDCTreasuryBalance();
      }, 2000);

    } catch (err: any) {
      console.error('USDC Deposit failed:', err);
      console.error('USDC Deposit error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setUsdcDepositError(`USDC Deposit failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDepositingUsdc(false);
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

  // Fetch USDC token balance using Fungible Asset standard
  const fetchUSDCBalance = async () => {
    if (!account?.address) return;

    setIsLoadingUsdcBalance(true);
    try {
      const addressString = account.address.toString();
      const tokenAddress = "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832";
      
      // Try testnet first
      const testnetConfig = new AptosConfig({ network: Network.TESTNET });
      const testnetAptos = new Aptos(testnetConfig);
      
      try {
        // Use the proper FA balance checking method
        const balance = await testnetAptos.getCurrentFungibleAssetBalances({
          options: {
            where: {
              owner_address: { _eq: addressString },
              asset_type: { _eq: tokenAddress }
            }
          }
        });

        if (balance && balance.length > 0) {
          const usdcBalance = Number(balance[0].amount) / 1000000; // Convert from micro-USDC to USDC (6 decimals)
          console.log(`Testnet USDC balance: ${usdcBalance}`);
          setUsdcBalance(usdcBalance);
          return;
        } else {
          console.log("No USDC balance found on testnet");
          setUsdcBalance(0);
          return;
        }
      } catch (testnetError) {
        console.log("Testnet USDC balance fetch failed, trying mainnet...");
        
        // Fallback to mainnet
        const mainnetConfig = new AptosConfig({ network: Network.MAINNET });
        const mainnetAptos = new Aptos(mainnetConfig);
        
        try {
          const balance = await mainnetAptos.getCurrentFungibleAssetBalances({
            options: {
              where: {
                owner_address: { _eq: addressString },
                asset_type: { _eq: tokenAddress }
              }
            }
          });

          if (balance && balance.length > 0) {
            const usdcBalance = Number(balance[0].amount) / 1000000; // Convert from micro-USDC to USDC (6 decimals)
            console.log(`Mainnet USDC balance: ${usdcBalance}`);
            setUsdcBalance(usdcBalance);
          } else {
            console.log("No USDC balance found on mainnet");
            setUsdcBalance(0);
          }
        } catch (mainnetError) {
          console.log("No USDC balance found on either network");
          setUsdcBalance(0);
        }
      }
    } catch (err) {
      console.error("Error fetching USDC balance:", err);
      setUsdcBalance(0);
    } finally {
      setIsLoadingUsdcBalance(false);
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
            function: `${contractAddress}::paylance_v12::get_treasury_balance`,
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
            function: `${contractAddress}::paylance_v12::get_treasury_balance`,
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

  // Fetch USDC treasury balance
  const fetchUSDCTreasuryBalance = async () => {
    if (!account?.address) return;

    setIsLoadingUsdcTreasuryBalance(true);
    try {
      const addressString = account.address.toString();
      const contractAddress = '0x8922d3e9d9b5ea2175ac47c083d1b5b83af560113481d02b03d143552d14f994';
      
      // Try testnet first
      const testnetConfig = new AptosConfig({ network: Network.TESTNET });
      const testnetAptos = new Aptos(testnetConfig);
      
      try {
        const usdcTreasuryBalance = await testnetAptos.view({
          payload: {
            function: `${contractAddress}::paylance_v12::get_usdc_treasury_balance`,
            functionArguments: [addressString],
          },
        });
        
        const balance = Number(usdcTreasuryBalance[0]) / 1000000; // Convert from micro-USDC to USDC (6 decimals)
        console.log(`Testnet USDC treasury balance: ${balance} USDC`);
        setUsdcTreasuryBalance(balance);
        return;
      } catch (testnetError) {
        console.log("Testnet USDC treasury balance fetch failed, trying mainnet...");
        
        // Fallback to mainnet
        const mainnetConfig = new AptosConfig({ network: Network.MAINNET });
        const mainnetAptos = new Aptos(mainnetConfig);
        
        const usdcTreasuryBalance = await mainnetAptos.view({
          payload: {
            function: `${contractAddress}::paylance_v12::get_usdc_treasury_balance`,
            functionArguments: [addressString],
          },
        });
        
        const balance = Number(usdcTreasuryBalance[0]) / 1000000; // Convert from micro-USDC to USDC (6 decimals)
        console.log(`Mainnet USDC treasury balance: ${balance} USDC`);
        setUsdcTreasuryBalance(balance);
      }
    } catch (err) {
      console.error("Error fetching USDC treasury balance:", err);
      setUsdcTreasuryBalance(0);
    } finally {
      setIsLoadingUsdcTreasuryBalance(false);
    }
  };

  // Fetch treasury balance when account changes
  useEffect(() => {
    if (connected && account?.address) {
      fetchTreasuryBalance();
      fetchUSDCTreasuryBalance();
    } else {
      setBalance(0);
      setUsdcTreasuryBalance(0);
    }
  }, [connected, account?.address]);


  // Listen for company creation events to refresh company status
  useEffect(() => {
    const onCompanyCreated = () => {
      console.log('Company created event received in navbar, refreshing...');
      // Force a re-render by updating a state or triggering a refresh
      // The useCompanyStatus hook will handle the actual refresh
    };
    window.addEventListener('company:created', onCompanyCreated);
    return () => window.removeEventListener('company:created', onCompanyCreated);
  }, []);


  return (
    <>
      {/* Backdrop blur overlay */}
      <div className="relative w-full h-full">
        <div className="z-[99] fixed pointer-events-none inset-x-0 h-[88px] bg-[rgba(10,10,10,0.8)] backdrop-blur-sm [mask:linear-gradient(to_bottom,#000_20%,transparent_calc(100%-20%))]"></div>

        <header
          className={cn(
            "fixed top-4 inset-x-0 mx-auto max-w-6xl px-2 md:px-12 z-[100] th",
            isMobileMenuOpen ? "h-[calc(100%-24px)]" : "h-12"
          )}
        >
          <Wrapper className="backdrop-blur-lg rounded-xl lg:rounded-2xl border border-[rgba(124,124,124,0.2)] px-2 md:px-2 flex items-center justify-start">
            <div className={cn(
              "flex items-center w-full sticky mt-[7px] lg:mt-auto mb-auto inset-x-0",
              (!connected || !hasCompany) ? "justify-between" : "justify-between"
            )}>
              {/* Logo */}
              <div className="flex items-center pl-1">
                <Link href="/" className="flex items-center gap-3">
                  <Icons.icon className="w-auto h-10" />
                  <span className="text-xl font-semibold text-foreground">AptosPaylance</span>
                </Link>
            </div>

              {/* Desktop Navigation Links - Centered when not connected/no company */}
              <div className={cn(
                "items-center hidden lg:flex gap-6",
                (!connected || !hasCompany) ? "absolute left-1/2 -translate-x-1/2" : "ml-4"
              )}>
                {/* Always show Home */}
                <Link
                  href="/"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Home
                </Link>

                {/* Show Create Payroll only if wallet not connected OR connected but no company */}
                {(!connected || !hasCompany) && (
                <Link
                  href="/create-company"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Create Payroll
                </Link>
                )}

                {/* Show these only if connected AND has company */}
                {connected && hasCompany && (
                  <>
                <Link
                      href="/dashboard"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                      Dashboard
                </Link>
                <Link
                  href="/pay"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Pay
                </Link>
                <Link
                  href="/analysis"
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Analysis
                </Link>
                    
                  </>
                )}

                {/* Always show Coming Soon for users without company or not connected */}
                {(!connected || !hasCompany) && (
                <Link
                    href="/coming-soon"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    Coming Soon
                </Link>
                )}
            </div>

              {/* Right side buttons */}
              <div className="items-center flex gap-2 lg:gap-4">
              {connected && account ? (
                <>
                    {/* Treasury Balance Display - Only show if user has company */}
                    {hasCompany && (
                      <>
                        <div className="hidden lg:flex items-center gap-2">
                    {/* APT Treasury Balance */}
                          <div className="flex items-center gap-1.5 bg-secondary/20 border border-border rounded-lg px-2.5 py-1.5">
                            <Image 
                              src="/icons/apt.png" 
                              alt="APT" 
                              width={16} 
                              height={16} 
                              className="w-4 h-4 object-contain"
                            />
                            <div className="flex flex-col">
                             
                      {isLoadingBalance ? (
                                <span className="text-xs">—</span>
                      ) : (
                                <span className="text-sm font-semibold text-foreground leading-none">
                                  {balance.toFixed(4)}
                        </span>
                      )}
                            </div>
                    </div>

                    {/* USDC Treasury Balance */}
                          <div className="flex items-center gap-1.5 bg-secondary/20 border border-border rounded-lg px-2.5 py-1.5">
                            <Image 
                              src="/icons/usdc.png" 
                              alt="USDC" 
                              width={16} 
                              height={16} 
                              className="w-4 h-4 object-contain"
                            />
                            <div className="flex flex-col">
                              
                      {isLoadingUsdcTreasuryBalance ? (
                                <span className="text-xs">—</span>
                      ) : (
                                <span className="text-sm font-semibold text-foreground leading-none">
                                  {usdcTreasuryBalance.toFixed(2)}
                        </span>
                      )}
                            </div>
                    </div>
                  </div>

                  {/* Deposit Button */}
                  <button
                    onClick={handleDepositClick}
                          className="hidden sm:flex items-center gap-2 btn-secondary px-4 py-1.5 rounded-lg text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Deposit</span>
                  </button>
                      </>
                    )}

                    {/* Wallet Address - Always show when connected */}
                    <button
                      onClick={() => setIsWalletModalOpen(true)}
                      className="hidden sm:flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5 hover:bg-primary/20 transition-colors"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-foreground">
                      {truncateAddress(account.address.toString())}
                    </span>
                    </button>
                </>
              ) : (
                <button
                  onClick={handleConnectClick}
                    className="hidden sm:flex btn-primary px-5 py-2 rounded-lg text-sm font-medium"
                >
                  Connect Wallet
                </button>
              )}

                {/* Mobile menu toggle */}
              <button
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  className="lg:hidden p-2 w-8 h-8 text-foreground hover:text-primary transition-colors"
              >
                  {isMobileMenuOpen ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                  ) : (
                    <Icons.menu className="w-3.5 h-3.5" />
                  )}
              </button>
            </div>
          </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
              <div className="lg:hidden mt-4 pb-4 px-2 space-y-3">
                {/* Mobile Menu Header */}
                <div className="flex items-center justify-between px-1 pb-2 border-b border-border">
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-2 py-1 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  <span className="text-sm font-semibold text-foreground">Menu</span>
                  <span className="w-10" />
        </div>

                {/* Mobile Navigation Links */}
                <div className="flex flex-col items-center gap-1 text-center w-full max-w-[240px] mx-auto">
            <Link
              href="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full max-w-[200px] mx-auto px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-center"
            >
              Home
            </Link>

                  {(!connected || !hasCompany) && (
            <Link
              href="/create-company"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full max-w-[200px] mx-auto px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-center"
            >
              Create Payroll
            </Link>
                  )}

                  {connected && hasCompany && (
                    <>
            <Link
                        href="/dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block w-full max-w-[200px] mx-auto px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-center"
            >
              Employees
            </Link>
            <Link
              href="/pay"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block w-full max-w-[200px] mx-auto px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-center"
            >
              Pay
            </Link>
            <Link
              href="/analysis"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block w-full max-w-[200px] mx-auto px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-center"
            >
              Analysis
            </Link>
                      
                    </>
                  )}

                  {(!connected || !hasCompany) && (
            <Link
                      href="/coming-soon"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full max-w-[200px] mx-auto px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-center"
            >
                      Coming Soon
            </Link>
                  )}
          </div>

                {/* Mobile Wallet Section */}
                <div className="pt-4 mt-4 border-t border-border space-y-2">
                  {connected && account ? (
                    <>
                      {hasCompany && (
                        <div className="px-3 py-2 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">APT Balance:</span>
                            <span className="font-medium text-foreground">{balance.toFixed(4)}</span>
        </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">USDC Balance:</span>
                            <span className="font-medium text-foreground">{usdcTreasuryBalance.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => setIsWalletModalOpen(true)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                      >
                        <span className="text-foreground">{truncateAddress(account.address.toString())}</span>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      </button>
                      {hasCompany && (
                        <button
                          onClick={handleDepositClick}
                          className="w-full flex items-center justify-center gap-2 btn-secondary px-4 py-2 rounded-lg text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Deposit</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={handleConnectClick}
                      className="w-full btn-primary px-5 py-2 rounded-lg text-sm font-medium"
                    >
                      Connect Wallet
                    </button>
                  )}
                </div>
              </div>
            )}
          </Wrapper>
        </header>
      </div>

      {/* Wallet Modal */}
      <WalletModal isOpen={isWalletModalOpen} onClose={handleCloseModal} />

      {/* Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-base font-heading font-semibold text-foreground">Deposit Funds</h3>
              <button
                onClick={handleCloseDepositModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-3 border-b border-border">
              <button
                onClick={() => setActiveDepositTab('apt')}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-medium rounded-lg border',
                  activeDepositTab === 'apt' ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/30 border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Image src="/icons/apt.png" alt="APT" width={14} height={14} className="w-3.5 h-3.5 object-contain" />
                  <span>APT</span>
                </div>
              </button>
              <button
                onClick={() => setActiveDepositTab('usdc')}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-medium rounded-lg border',
                  activeDepositTab === 'usdc' ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/30 border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Image src="/icons/usdc.png" alt="USDC" width={14} height={14} className="w-3.5 h-3.5 object-contain" />
                  <span>USDC</span>
                </div>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5.5">
              <p className="text-[10px] text-muted-foreground text-center">Top-up your Paylance treasury with APT or USDC</p>

              {/* Balance Row */}
              <div className="flex items-center justify-between text-xs bg-secondary/20 border border-border rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                  {activeDepositTab === 'apt' ? (
                    <Image src="/icons/apt.png" alt="APT" width={14} height={14} className="w-3.5 h-3.5 object-contain" />
                  ) : (
                    <Image src="/icons/usdc.png" alt="USDC" width={14} height={14} className="w-3.5 h-3.5 object-contain" />
                  )}
                  <span className="text-foreground">Balance:</span>
                      </div>
                <span className="font-semibold text-foreground">
                  {activeDepositTab === 'apt'
                    ? (isLoadingUserBalance ? '—' : `${userBalance.toFixed(4)} APT`)
                    : (isLoadingUsdcBalance ? '—' : `${usdcBalance.toFixed(2)} USDC`)
                  }
                          </span>
                    </div>

              {/* Amount Input */}
                <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  {activeDepositTab === 'apt' ? 'Amount in APT' : 'Amount in USDC'}
                </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    {activeDepositTab === 'apt' ? (
                      <Image src="/icons/apt.png" alt="APT" width={14} height={14} className="w-3.5 h-3.5 object-contain" />
                    ) : (
                      <Image src="/icons/usdc.png" alt="USDC" width={14} height={14} className="w-3.5 h-3.5 object-contain" />
                    )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                    value={activeDepositTab === 'apt' ? depositAmount : usdcDepositAmount}
                    onChange={(e) => activeDepositTab === 'apt' ? setDepositAmount(e.target.value) : setUsdcDepositAmount(e.target.value)}
                    className="block w-full pl-8 pr-16 py-2 bg-secondary/20 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm"
                    placeholder={activeDepositTab === 'apt' ? '0.00' : '0.00'}
                    disabled={activeDepositTab === 'apt' ? isDepositing : isDepositingUsdc}
                  />
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                    <span className="text-[10px] font-semibold bg-secondary/30 border border-border rounded-md px-2 py-1">
                      {activeDepositTab === 'apt' ? 'APT' : 'USDC'}
                    </span>
                    </div>
                </div>
              </div>

              {/* Treasury Row */}
              <div className="flex items-center justify-between text-xs bg-secondary/20 border border-border rounded-lg px-3 py-2">
                <span className="text-foreground">Current Treasury:</span>
                <span className="font-semibold text-foreground">
                  {activeDepositTab === 'apt'
                    ? (isLoadingBalance ? '—' : `${balance.toFixed(4)} APT`)
                    : (isLoadingUsdcTreasuryBalance ? '—' : `${usdcTreasuryBalance.toFixed(2)} USDC`)
                  }
                </span>
              </div>

              {/* Error/Success */}
              {activeDepositTab === 'apt' ? (
                <>
                  {depositError && <div className="text-[11px] text-red-500 bg-red-500/10 border border-red-500/30 rounded-md px-2 py-1">{depositError}</div>}
                  {depositSuccess && <div className="text-[11px] text-green-500 bg-green-500/10 border border-green-500/30 rounded-md px-2 py-1">{depositSuccess}</div>}
                </>
              ) : (
                <>
                  {usdcDepositError && <div className="text-[11px] text-red-500 bg-red-500/10 border border-red-500/30 rounded-md px-2 py-1">{usdcDepositError}</div>}
                  {usdcDepositSuccess && <div className="text-[11px] text-green-500 bg-green-500/10 border border-green-500/30 rounded-md px-2 py-1">{usdcDepositSuccess}</div>}
                </>
              )}

              {/* Footer Button */}
              <div className="pt-1">
              {activeDepositTab === 'apt' ? (
                <button
                  onClick={handleDeposit}
                  disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0 || parseFloat(depositAmount) > userBalance}
                    className="w-full btn-primary px-4 py-2 text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDepositing ? 'Depositing…' : 'Deposit APT'}
                </button>
              ) : (
                <button
                  onClick={handleUSDCDeposit}
                  disabled={isDepositingUsdc || !usdcDepositAmount || parseFloat(usdcDepositAmount) <= 0 || parseFloat(usdcDepositAmount) > usdcBalance}
                    className="w-full btn-primary px-4 py-2 text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDepositingUsdc ? 'Depositing…' : 'Deposit USDC'}
                </button>
              )}
                <p className="mt-2 text-[10px] text-muted-foreground text-center">Funds are available immediately in your treasury</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
