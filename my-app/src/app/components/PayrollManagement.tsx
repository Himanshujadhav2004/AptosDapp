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
  salary: number;
  paused: boolean;
  last_paid: number;
  total_paid: number;
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
  const [treasuryBalance, setTreasuryBalance] = useState<number>(0);
  const [isLoadingTreasury, setIsLoadingTreasury] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'single' | 'bulk'>('bulk');

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
            function: `${contractAddress}::paylance::get_all_employees`,
            functionArguments: [addressString],
          },
        });

        const employeeList = employeesData[0] as any[];
        const formattedEmployees: Employee[] = employeeList.map((emp: any) => ({
          name: emp.name || 'Unknown',
          email: emp.email || 'Unknown',
          wallet: emp.wallet || 'Unknown',
          role: emp.role || 'Unknown',
          salary: emp.salary || 0,
          paused: emp.paused || false,
          last_paid: emp.last_paid || 0,
          total_paid: emp.total_paid || 0
        }));
        
        setEmployees(formattedEmployees);
        setSuccess(`Found ${formattedEmployees.length} employee(s)`);
      } catch (testnetError) {
        console.log("Testnet failed, trying mainnet...");
        
        const mainnetConfig = new AptosConfig({ network: Network.MAINNET });
        const mainnetAptos = new Aptos(mainnetConfig);
        
        const employeesData = await mainnetAptos.view({
          payload: {
            function: `${contractAddress}::paylance::get_all_employees`,
            functionArguments: [addressString],
          },
        });

        const employeeList = employeesData[0] as any[];
        const formattedEmployees: Employee[] = employeeList.map((emp: any) => ({
          name: emp.name || 'Unknown',
          email: emp.email || 'Unknown',
          wallet: emp.wallet || 'Unknown',
          role: emp.role || 'Unknown',
          salary: emp.salary || 0,
          paused: emp.paused || false,
          last_paid: emp.last_paid || 0,
          total_paid: emp.total_paid || 0
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

  // Fetch treasury balance
  const fetchTreasuryBalance = async () => {
    if (!account?.address) return;

    setIsLoadingTreasury(true);
    try {
      const addressString = account.address.toString();
      
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
        setTreasuryBalance(balance);
      } catch (testnetError) {
        console.log("Testnet treasury fetch failed, trying mainnet...");
        
        const mainnetConfig = new AptosConfig({ network: Network.MAINNET });
        const mainnetAptos = new Aptos(mainnetConfig);
        
        const treasuryBalance = await mainnetAptos.view({
          payload: {
            function: `${contractAddress}::paylance::get_treasury_balance`,
            functionArguments: [addressString],
          },
        });
        
        const balance = Number(treasuryBalance[0]) / 100000000; // Convert from Octas to APT
        setTreasuryBalance(balance);
      }
    } catch (err) {
      console.error("Error fetching treasury balance:", err);
      setTreasuryBalance(0);
    } finally {
      setIsLoadingTreasury(false);
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
      const transaction = {
        sender: account.address,
        data: {
          function: `${contractAddress}::paylance::pay_single_employee`,
          functionArguments: [employeeWallet],
        },
      };

      const result = await signAndSubmitTransaction(transaction as any);
      
      setSuccess(`Payment successful! Transaction: ${result.hash}`);
      
      // Refresh data after successful payment
      setTimeout(() => {
        fetchEmployees();
        fetchTreasuryBalance();
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
      const transaction = {
        sender: account.address,
        data: {
          function: `${contractAddress}::paylance::pay_selected_employees`,
          functionArguments: [selectedEmployeeWallets],
        },
      };

      const result = await signAndSubmitTransaction(transaction as any);
      
      setSuccess(`Successfully paid ${selectedEmployeeWallets.length} employee(s) in a single transaction! Hash: ${result.hash}`);
      
      // Refresh data after successful payment
      setTimeout(() => {
        fetchEmployees();
        fetchTreasuryBalance();
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

  // Calculate total payroll
  const calculateTotalPayroll = () => {
    return employees
      .filter(emp => selectedEmployees.has(emp.wallet) && !emp.paused)
      .reduce((total, emp) => total + (emp.salary / 100000000), 0);
  };

  // Format salary
  const formatSalary = (salary: number) => {
    return (salary / 100000000).toFixed(4);
  };

  // Format address
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Fetch data on component mount
  useEffect(() => {
    if (account?.address) {
      fetchEmployees();
      fetchTreasuryBalance();
    }
  }, [account?.address]);

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

      {/* Treasury Balance */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-lg font-medium text-gray-700">Treasury Balance</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {isLoadingTreasury ? (
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              ) : (
                `${treasuryBalance.toFixed(4)} APT`
              )}
            </span>
            <button
              onClick={fetchTreasuryBalance}
              disabled={isLoadingTreasury}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              title="Refresh Treasury Balance"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

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
                          <span className="text-sm font-medium text-gray-700">Amount</span>
                          {paymentMode === 'bulk' && (
                            <button className="p-1 text-gray-400 hover:text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatSalary(employee.salary)} APT
                        </p>
                      </div>

                      {paymentMode === 'single' && (
                        <button
                          onClick={() => paySingleEmployee(employee.wallet)}
                          disabled={isPaying || employee.paused}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPaying ? 'Paying...' : 'Pay Now'}
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
              <p className="text-sm text-gray-600">
                Send {calculateTotalPayroll().toFixed(4)} APT to {selectedEmployees.size} recipients
              </p>
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
                {isPaying ? 'Processing...' : `Send ${calculateTotalPayroll().toFixed(4)} APT to ${selectedEmployees.size} Recipients`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
