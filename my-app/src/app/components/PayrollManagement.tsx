'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

interface PayrollManagementProps {
  contractAddress: string;
}

interface Employee {
  name: string;
  email: string;
  wallet: string;
  role: string;
  salary_usdc: number;
  paused: boolean;
  last_paid: number;
  total_paid_usdc: number;
  total_paid_apt: number;
}

export const PayrollManagement: React.FC<PayrollManagementProps> = ({ contractAddress }) => {
  const { account, signAndSubmitTransaction } = useWallet();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentProgress, setPaymentProgress] = useState<{current: number, total: number, currentEmployee: string} | null>(null);
  const [paymentMode, setPaymentMode] = useState<'single' | 'bulk'>('bulk');
  const [paymentToken, setPaymentToken] = useState<'apt' | 'usdc'>('apt');
  const [aptToUsdRate, setAptToUsdRate] = useState<number>(10); // Default rate, fetched from API
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);

  // Constants for decimal conversions
  const APT_DECIMALS = 8;
  const USDC_DECIMALS = 6;
  const APT_DIVISOR = Math.pow(10, APT_DECIMALS); // 100,000,000
  const USDC_DIVISOR = Math.pow(10, USDC_DECIMALS); // 1,000,000

  // Helper function to convert USDC amount to APT equivalent
  const convertUsdcToApt = (usdcAmount: number): number => {
    return usdcAmount / aptToUsdRate;
  };

  // Helper function to format APT amounts
  const formatAPT = (amountInOctas: number): string => {
    return (amountInOctas / APT_DIVISOR).toFixed(6);
  };

  // Helper function to format USDC amounts
  const formatUSDC = (amountInMicroUsdc: number): string => {
    return (amountInMicroUsdc / USDC_DIVISOR).toFixed(2);
  };

  // Fetch APT to USD rate from CoinGecko API
  const fetchAptToUsdRate = async () => {
    setIsLoadingPrice(true);
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=aptos&vs_currencies=usd');
      const data = await response.json();
      
      if (data.aptos && data.aptos.usd) {
        setAptToUsdRate(data.aptos.usd);
        console.log('Fetched APT price:', data.aptos.usd);
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Failed to fetch APT rate:', error);
      // Fallback to contract's price estimate
      try {
        const testnetConfig = new AptosConfig({ network: Network.TESTNET });
        const testnetAptos = new Aptos(testnetConfig);
        
        const priceData = await testnetAptos.view({
          payload: {
            function: `${contractAddress}::paylance_v12::get_apt_price_estimate_usd`,
            functionArguments: [],
          },
        });
        
        const priceInOctas = Number(priceData[0]);
        const priceInUsd = priceInOctas / Math.pow(10, 8); // Convert from 8 decimals
        setAptToUsdRate(priceInUsd);
        console.log('Using contract price estimate:', priceInUsd);
      } catch (contractError) {
        console.error('Failed to fetch contract price estimate:', contractError);
        setAptToUsdRate(10); // Final fallback
      }
    } finally {
      setIsLoadingPrice(false);
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    if (!account?.address) return;

    setIsLoading(true);
    try {
      const addressString = account.address.toString();
      
      const testnetConfig = new AptosConfig({ network: Network.TESTNET });
      const testnetAptos = new Aptos(testnetConfig);
      
      try {
        const employeesData = await testnetAptos.view({
          payload: {
            function: `${contractAddress}::paylance_v12::get_all_employees`,
            functionArguments: [addressString],
          },
        });

        const employeeList = employeesData[0] as any[];
        const formattedEmployees: Employee[] = employeeList.map((emp: any) => ({
          name: emp.name || 'Unknown',
          email: emp.email || 'Unknown',
          wallet: emp.wallet || 'Unknown',
          role: emp.role || 'Unknown',
          salary_usdc: emp.salary_usdc || 0,
          paused: emp.paused || false,
          last_paid: emp.last_paid || 0,
          total_paid_usdc: emp.total_paid_usdc || 0,
          total_paid_apt: emp.total_paid_apt || 0
        }));
        
        setEmployees(formattedEmployees);
        setSuccess(`Found ${formattedEmployees.length} employee(s)`);
      } catch (testnetError) {
        console.log("Testnet failed, trying mainnet...");
        
        const mainnetConfig = new AptosConfig({ network: Network.MAINNET });
        const mainnetAptos = new Aptos(mainnetConfig);
        
        const employeesData = await mainnetAptos.view({
          payload: {
            function: `${contractAddress}::paylance_v12::get_all_employees`,
            functionArguments: [addressString],
          },
        });

        const employeeList = employeesData[0] as any[];
        const formattedEmployees: Employee[] = employeeList.map((emp: any) => ({
          name: emp.name || 'Unknown',
          email: emp.email || 'Unknown',
          wallet: emp.wallet || 'Unknown',
          role: emp.role || 'Unknown',
          salary_usdc: emp.salary_usdc || 0,
          paused: emp.paused || false,
          last_paid: emp.last_paid || 0,
          total_paid_usdc: emp.total_paid_usdc || 0,
          total_paid_apt: emp.total_paid_apt || 0
        }));
        
        setEmployees(formattedEmployees);
        setSuccess(`Found ${formattedEmployees.length} employee(s)`);
      }
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setError(`Failed to fetch employees: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Dispatch a custom event to notify other components (e.g., Navbar) to refresh balances
  const notifyTreasuryRefresh = () => {
    try {
      window.dispatchEvent(new CustomEvent('treasury:refresh'));
    } catch (_) {
      // no-op on server
    }
  };

  // Pay single employee
  const paySingleEmployee = async (employeeWallet: string) => {
    if (!account?.address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsPaying(true);
    setError(null);
    setSuccess(null);

    try {
      const functionName = paymentToken === 'apt' 
        ? 'pay_single_employee_apt' 
        : 'pay_single_employee_usdc';
      
      const transaction = {
        sender: account.address,
        data: {
          function: `${contractAddress}::paylance_v12::${functionName}`,
          functionArguments: [employeeWallet],
        },
      };

      const result = await signAndSubmitTransaction(transaction as any);
      
      setSuccess(`Payment successful in ${paymentToken.toUpperCase()}! Transaction: ${result.hash}`);
      
      // Refresh employees locally and notify Navbar to refresh treasury balances
      setTimeout(() => {
        fetchEmployees();
        notifyTreasuryRefresh();
      }, 2000);

    } catch (err: any) {
      console.error('Payment failed:', err);
      setError(`Payment failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsPaying(false);
    }
  };

  // Pay selected employees (single transaction for all selected employees)
  const paySelectedEmployees = async () => {
    if (!account?.address) {
      setError('Please connect your wallet first');
      return;
    }

    if (selectedEmployees.size === 0) {
      setError('Please select at least one employee to pay');
      return;
    }

    setIsPaying(true);
    setError(null);
    setSuccess(null);

    try {
      const selectedEmployeeWallets = Array.from(selectedEmployees);
      
      // Show progress for single transaction
      setPaymentProgress({
        current: 1,
        total: 1,
        currentEmployee: `Processing ${selectedEmployeeWallets.length} employees...`
      });

      // Single transaction to pay all selected employees
      const functionName = paymentToken === 'apt' 
        ? 'pay_selected_employees' 
        : 'pay_selected_employees_usdc';
      
      const transaction = {
        sender: account.address,
        data: {
          function: `${contractAddress}::paylance_v12::${functionName}`,
          functionArguments: [selectedEmployeeWallets],
        },
      };

      const result = await signAndSubmitTransaction(transaction as any);
      
      setSuccess(`Successfully paid ${selectedEmployeeWallets.length} employee(s) in ${paymentToken.toUpperCase()}! Hash: ${result.hash}`);
      
      // Refresh employees locally and notify Navbar to refresh treasury balances
      setTimeout(() => {
        fetchEmployees();
        notifyTreasuryRefresh();
      }, 2000);

    } catch (err: any) {
      console.error('Bulk payment failed:', err);
      setError(`Bulk payment failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsPaying(false);
      setPaymentProgress(null);
    }
  };

  // Toggle employee selection
  const toggleEmployeeSelection = (employeeWallet: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeWallet)) {
      newSelected.delete(employeeWallet);
    } else {
      newSelected.add(employeeWallet);
    }
    setSelectedEmployees(newSelected);
  };

  // Select all employees
  const selectAllEmployees = () => {
    const activeEmployees = employees.filter(emp => !emp.paused);
    setSelectedEmployees(new Set(activeEmployees.map(emp => emp.wallet)));
  };

  // Unselect all employees
  const unselectAllEmployees = () => {
    setSelectedEmployees(new Set());
  };

  // Calculate total payroll based on payment token
  const calculateTotalPayroll = () => {
    const selectedEmployeeData = employees.filter(emp => selectedEmployees.has(emp.wallet) && !emp.paused);
    
    if (paymentToken === 'usdc') {
      return selectedEmployeeData.reduce((total, emp) => total + (emp.salary_usdc / USDC_DIVISOR), 0);
    } else {
      // For APT, convert USDC salary to APT equivalent
      return selectedEmployeeData.reduce((total, emp) => {
        const usdcSalary = emp.salary_usdc / USDC_DIVISOR;
        return total + convertUsdcToApt(usdcSalary);
      }, 0);
    }
  };

  // Get display amount for employee based on payment token
  const getEmployeeDisplayAmount = (employee: Employee) => {
    if (paymentToken === 'usdc') {
      return `${formatUSDC(employee.salary_usdc)} USDC`;
    } else {
      const usdcAmount = employee.salary_usdc / USDC_DIVISOR;
      const aptAmount = convertUsdcToApt(usdcAmount);
      return `${aptAmount.toFixed(6)} APT (≈${formatUSDC(employee.salary_usdc)} USD)`;
    }
  };

  // Format address
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Fetch data on component mount
  useEffect(() => {
    if (account?.address) {
      fetchEmployees();
      fetchAptToUsdRate();
    }
  }, [account?.address]);

  // Recalculate when payment token changes
  useEffect(() => {
    // Force re-render when payment token changes
  }, [paymentToken, aptToUsdRate]);

  return (
    <div className="space-y-8">
      {/* Mode Selection */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setPaymentMode('bulk')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            paymentMode === 'bulk'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Bulk Pay
        </button>
        <button
          onClick={() => setPaymentMode('single')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            paymentMode === 'single'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          P2P Transfer
        </button>
      </div>

      {/* Payment Token Selection */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Payment Method</h3>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              APT Rate: $${aptToUsdRate.toFixed(2)} USD
            </div>
            <button
              onClick={fetchAptToUsdRate}
              disabled={isLoadingPrice}
              className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              title="Refresh APT Price"
            >
              <svg className={`w-4 h-4 ${isLoadingPrice ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => setPaymentToken('apt')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              paymentToken === 'apt'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <span>Pay in APT</span>
          </button>
          <button
            onClick={() => setPaymentToken('usdc')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              paymentToken === 'usdc'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <span>Pay in USDC</span>
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {paymentToken === 'apt' 
            ? `Employees will receive APT tokens converted from their USDC salary using real-time Oracle pricing (currently $${aptToUsdRate.toFixed(2)} per APT)`
            : 'Employees will receive USDC tokens directly from their USDC salary'
          }
        </p>
      </div>

      {/* Treasury Balance removed (Navbar shows balances) */}

      {/* Payment Progress */}
      {paymentProgress && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="text-sm font-medium text-blue-800">Processing Bulk Payment...</span>
            </div>
            <span className="text-sm text-blue-600">
              {paymentProgress.current} of {paymentProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(paymentProgress.current / paymentProgress.total) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-blue-700">
            {paymentProgress.currentEmployee}
          </p>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-green-800">{success}</span>
          </div>
        </div>
      )}

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {paymentMode === 'bulk' ? 'Payment Recipients' : 'Employees'}
            </h3>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                {paymentMode === 'bulk' 
                  ? `${selectedEmployees.size} of ${employees.filter(emp => !emp.paused).length} employees selected`
                  : `${employees.length} employees`
                }
              </span>
              {paymentMode === 'bulk' && (
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllEmployees}
                    className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={unselectAllEmployees}
                    className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Unselect All
                  </button>
                </div>
              )}
              <button
                onClick={fetchEmployees}
                disabled={isLoading}
                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Loading employees...</span>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-600">No employees found. Add employees first.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {employees.map((employee) => (
                <div
                  key={employee.wallet}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedEmployees.has(employee.wallet)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {paymentMode === 'bulk' && (
                        <button
                          onClick={() => toggleEmployeeSelection(employee.wallet)}
                          disabled={employee.paused}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selectedEmployees.has(employee.wallet)
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-500'
                          } ${employee.paused ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {selectedEmployees.has(employee.wallet) && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{employee.name}</h4>
                          <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded-full">
                            {employee.role}
                          </span>
                          {employee.paused && (
                            <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded-full">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Wallet: {formatAddress(employee.wallet)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700">
                            {paymentToken === 'apt' ? 'Will Pay' : 'Amount'}
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">
                          {getEmployeeDisplayAmount(employee)}
                        </p>
                        {paymentToken === 'apt' && (
                          <p className="text-xs text-gray-500">
                            Base: {formatUSDC(employee.salary_usdc)} USDC
                          </p>
                        )}
                      </div>

                      {paymentMode === 'single' && (
                        <button
                          onClick={() => paySingleEmployee(employee.wallet)}
                          disabled={isPaying || employee.paused}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPaying ? 'Paying...' : `Pay in ${paymentToken.toUpperCase()}`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Payment Action */}
      {paymentMode === 'bulk' && selectedEmployees.size > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Payment Summary</h3>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  Total Amount: <span className="font-semibold">{calculateTotalPayroll().toFixed(paymentToken === 'apt' ? 6 : 2)} {paymentToken.toUpperCase()}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Recipients: <span className="font-semibold">{selectedEmployees.size} employee(s)</span>
                </p>
                {paymentToken === 'apt' && (
                  <p className="text-xs text-gray-500">
                    Rate: 1 APT = ${aptToUsdRate.toFixed(2)} USD
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={paySelectedEmployees}
              disabled={isPaying || selectedEmployees.size === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span>
                {isPaying 
                  ? 'Processing...' 
                  : `Pay ${calculateTotalPayroll().toFixed(paymentToken === 'apt' ? 6 : 2)} ${paymentToken.toUpperCase()}`
                }
              </span>
            </button>
          </div>
          
          {/* Payment Verification */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">Payment Details:</p>
                {paymentToken === 'apt' ? (
                  <p>Converting USDC salaries to APT using Chainlink Oracle price feeds for accurate real-time conversion. Employees will receive the APT equivalent of their USDC salary.</p>
                ) : (
                  <p>Employees will receive their exact USDC salary amount.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};