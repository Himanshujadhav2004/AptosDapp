'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import MagicCard from './ui/MagicCard';
import { useToast } from './ui/Toast';
import { cn } from '../lib/utils';
import Image from 'next/image';

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
  const [aptToUsdRate, setAptToUsdRate] = useState<number>(10);
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 5;
  const { push } = useToast();

  // Constants
  const APT_DECIMALS = 8;
  const USDC_DECIMALS = 6;
  const APT_DIVISOR = Math.pow(10, APT_DECIMALS);
  const USDC_DIVISOR = Math.pow(10, USDC_DECIMALS);

  const convertUsdcToApt = (usdcAmount: number): number => {
    return usdcAmount / aptToUsdRate;
  };

  const formatAPT = (amountInOctas: number): string => {
    return (amountInOctas / APT_DIVISOR).toFixed(6);
  };

  const formatUSDC = (amountInMicroUsdc: number): string => {
    return (amountInMicroUsdc / USDC_DIVISOR).toFixed(2);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Fetch APT price
  const fetchAptToUsdRate = async () => {
    setIsLoadingPrice(true);
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=aptos&vs_currencies=usd');
      const data = await response.json();
      
      if (data.aptos && data.aptos.usd) {
        setAptToUsdRate(data.aptos.usd);
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Failed to fetch APT rate:', error);
      setAptToUsdRate(10);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    if (!account?.address) return;
    
    setIsLoading(true);
    
    try {
      const addressString = typeof account.address === 'string' 
        ? account.address 
        : account.address.toString();
      
      const companyResponse = await fetch(
        `https://fullnode.testnet.aptoslabs.com/v1/accounts/${addressString}/resource/${contractAddress}::paylance_v12::Company`
      );
      
      if (!companyResponse.ok) {
        setEmployees([]);
        return;
      }
      
      const companyData = await companyResponse.json();
      
      if (companyData.data && companyData.data.employees) {
        const employeeList = companyData.data.employees;
        
        const formattedEmployees: Employee[] = employeeList.map((emp: any) => ({
          name: emp.name || 'Unknown',
          email: emp.email || 'Unknown',
          wallet: emp.wallet || 'Unknown',
          role: emp.role || 'Unknown',
          salary_usdc: emp.salary_usdc || 0,
          paused: emp.paused || false,
          last_paid: emp.last_paid || 0,
          total_paid_usdc: emp.total_paid_usdc || 0,
          total_paid_apt: emp.total_paid_apt || 0,
        }));
        
        setEmployees(formattedEmployees);
      } else {
        setEmployees([]);
      }
      
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Pay single employee
  const payEmployee = async (employeeWallet: string) => {
    if (!account?.address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsPaying(true);
    setError(null);
    setSuccess(null);

    try {
      // Use the bulk entry functions with a single wallet to avoid missing single-pay ABI
      const functionName = paymentToken === 'apt' 
        ? 'pay_selected_employees' 
        : 'pay_selected_employees_usdc';
      
      const transaction = {
        sender: typeof account.address === 'string' ? account.address : account.address.toString(),
        data: {
          function: `${contractAddress}::paylance_v12::${functionName}`,
          functionArguments: [[employeeWallet]],
        },
      };

      const result = await signAndSubmitTransaction(transaction as any);
      
      setSuccess(`Payment successful in ${paymentToken.toUpperCase()}! Transaction: ${result.hash}`);
      push({ kind: 'success', message: `Payment successful in ${paymentToken.toUpperCase()}` });
      try { window.dispatchEvent(new Event('treasury:refresh')); } catch {}
      
      setTimeout(() => {
        fetchEmployees();
        setSuccess(null);
      }, 3000);

    } catch (err: any) {
      console.error('Payment failed:', err);
      const msg = `Payment failed: ${err.message || 'Unknown error'}`;
      setError(msg);
      push({ kind: 'error', message: msg });
    } finally {
      setIsPaying(false);
    }
  };

  // Pay selected employees (bulk)
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
      
      setPaymentProgress({
        current: 1,
        total: 1,
        currentEmployee: `Processing ${selectedEmployeeWallets.length} employees...`
      });

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
      push({ kind: 'success', message: `Paid ${selectedEmployeeWallets.length} employee(s)` });
      try { window.dispatchEvent(new Event('treasury:refresh')); } catch {}
      
      setTimeout(() => {
        fetchEmployees();
        setSuccess(null);
      }, 3000);

    } catch (err: any) {
      console.error('Bulk payment failed:', err);
      const msgB = `Bulk payment failed: ${err.message || 'Unknown error'}`;
      setError(msgB);
      push({ kind: 'error', message: msgB });
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
    const selectedEmployeeData = employees.filter(emp => selectedEmployees.has(emp.wallet) && !emp.paused);
    
    if (paymentToken === 'usdc') {
      return selectedEmployeeData.reduce((total, emp) => total + (emp.salary_usdc / USDC_DIVISOR), 0);
    } else {
      return selectedEmployeeData.reduce((total, emp) => {
        const usdcSalary = emp.salary_usdc / USDC_DIVISOR;
        return total + convertUsdcToApt(usdcSalary);
      }, 0);
    }
  };

  // Get display amount for employee
  const getEmployeeDisplayAmount = (employee: Employee) => {
    if (paymentToken === 'usdc') {
      return `${formatUSDC(employee.salary_usdc)} USDC`;
    } else {
      const usdcAmount = employee.salary_usdc / USDC_DIVISOR;
      const aptAmount = convertUsdcToApt(usdcAmount);
      return `${aptAmount.toFixed(6)} APT`;
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(employees.length / entriesPerPage);
  const indexOfFirstEntry = (currentPage - 1) * entriesPerPage;
  const indexOfLastEntry = indexOfFirstEntry + entriesPerPage;
  const currentEmployees = employees.slice(indexOfFirstEntry, indexOfLastEntry);

  // Reset to first page when employees change
  useEffect(() => {
    setCurrentPage(1);
  }, [employees.length]);

  useEffect(() => {
    if (account?.address) {
      fetchEmployees();
      fetchAptToUsdRate();
    }
  }, [account?.address]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-semibold text-foreground">Employee payroll with Aptos and USDC</h2>
       
          </div>



      {/* Single Card: Token selection + table + actions */}

      

      {/* Employee List Table */}
      {isLoading ? null : employees.length > 0 ? (
        <>
        <div className="bg-secondary/10 overflow-hidden rounded-xl lg:rounded-2xl border border-border">
          {/* Card header */}
          <div className="px-6 py-4 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <h3 className="text-base md:text-lg font-semibold text-foreground">Payment Dashboard</h3>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setPaymentMode('bulk')}
                className={cn('px-3 py-1.5 text-xs rounded-lg border', paymentMode === 'bulk' ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/20 border-border text-muted-foreground hover:text-foreground')}
              >
                Bulk Pay
              </button>
              <button
                onClick={() => setPaymentMode('single')}
                className={cn('px-3 py-1.5 text-xs rounded-lg border', paymentMode === 'single' ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/20 border-border text-muted-foreground hover:text-foreground')}
              >
                P2P Transfer
              </button>
            </div>
          </div>
          {/* Token selection inside card */}
          <div className="px-6 pt-5 pb-3">
            <h3 className="text-lg font-heading font-semibold text-foreground mb-3">Select Payment Token</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentToken('apt')}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors',
                  paymentToken === 'apt' ? 'bg-primary/10 border-primary' : 'bg-secondary/10 border-border hover:bg-secondary/20'
                )}
              >
                <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
                  <Image src="/icons/apt.png" alt="APT" width={16} height={16} className="w-6 h-6 object-contain" />
                </div>
                <span className="text-sm font-semibold">APT</span>
              </button>
              <button
                onClick={() => setPaymentToken('usdc')}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors',
                  paymentToken === 'usdc' ? 'bg-primary/10 border-primary' : 'bg-secondary/10 border-border hover:bg-secondary/20'
                )}
              >
                <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
                  <Image src="/icons/usdc.png" alt="USDC" width={16} height={16} className="w-6 h-6 object-contain" />
                </div>
                <span className="text-sm font-semibold">USDC</span>
              </button>
            </div>
          </div>
          {/* Controls above list (bulk only) */}
          {paymentMode === 'bulk' && (
            <div className="flex items-center justify-between px-6 pt-4">
              <div className="text-sm text-muted-foreground">
                {selectedEmployees.size} of {employees.length} employees selected
              </div>
              <div className="flex items-center gap-2">
                <button onClick={selectAllEmployees} className="px-3 py-1.5 text-xs bg-secondary/20 border border-border rounded-lg hover:bg-secondary">Select All</button>
                <button onClick={unselectAllEmployees} className="px-3 py-1.5 text-xs bg-secondary/20 border border-border rounded-lg hover:bg-secondary">Unselect All</button>
                <button onClick={fetchEmployees} className="px-3 py-1.5 text-xs bg-secondary/20 border border-border rounded-lg hover:bg-secondary flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Refresh
                </button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {paymentMode === 'bulk' && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.size === employees.filter(emp => !emp.paused).length && employees.filter(emp => !emp.paused).length > 0}
                        onChange={(e) => e.target.checked ? selectAllEmployees() : unselectAllEmployees()}
                        className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Salary
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Amount ({paymentToken.toUpperCase()})
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  {paymentMode === 'single' && (
                    <th className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentEmployees.map((employee, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-border/50 hover:bg-primary/5 transition-colors"
                  >
                    {paymentMode === 'bulk' && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.has(employee.wallet)}
                          onChange={() => toggleEmployeeSelection(employee.wallet)}
                          disabled={employee.paused}
                          className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-primary font-semibold text-sm uppercase">
                            {employee.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{employee.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{formatAddress(employee.wallet)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary border border-primary/30">
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">
                      ${formatUSDC(employee.salary_usdc)} USDC
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">
                      {getEmployeeDisplayAmount(employee)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex px-3 py-1 text-xs font-semibold rounded-full",
                        employee.paused 
                          ? "bg-red-500/20 text-red-500 border border-red-500/30" 
                          : "bg-green-500/20 text-green-500 border border-green-500/30"
                      )}>
                        {employee.paused ? 'Paused' : 'Active'}
                      </span>
                    </td>
                    {paymentMode === 'single' && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => payEmployee(employee.wallet)}
                            disabled={isPaying || employee.paused}
                            className="px-4 py-2 btn-primary rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            type="button"
                          >
                            Pay Now
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {indexOfFirstEntry + 1}-{Math.min(indexOfLastEntry, employees.length)} of {employees.length} employees
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-secondary/20 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? "bg-primary text-white"
                        : "bg-secondary/10 border border-border text-foreground hover:bg-secondary"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-secondary/10 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Status Messages handled by toast now */}
          {/* Bottom action button for bulk */}
          {paymentMode === 'bulk' && (
            <div className="flex justify-center mt-4">
              <button
                onClick={paySelectedEmployees}
                disabled={isPaying || selectedEmployees.size === 0}
                className="w-full md:w-auto max-w-md px-6 py-3 rounded-xl bg-secondary/20 border border-border text-foreground hover:bg-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPaying
                  ? 'Processing…'
                  : `Send ${calculateTotalPayroll().toFixed(paymentToken === 'apt' ? 6 : 2)} ${paymentToken.toUpperCase()} to ${selectedEmployees.size} Recipient${selectedEmployees.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <svg className="mx-auto h-16 w-16 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Employees Found</h3>
          <p className="text-muted-foreground">Add employees first to start making payments</p>
        </div>
      )}

      {/* Removed old bulk summary in favor of compact controls and bottom button */}
    </div>
  );
};