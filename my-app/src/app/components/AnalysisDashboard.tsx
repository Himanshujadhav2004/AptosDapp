'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

interface AnalysisDashboardProps {
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

interface PaymentLog {
  timestamp: number;
  amount: number;
  employee_name: string;
  employee_role: string;
  employee_email: string;
  employee_wallet: string;
  token_type: string;
}

interface EmployeeStats {
  total: number;
  active: number;
  paused: number;
}

interface TokenStats {
  totalAptPaid: number;
  totalUsdcPaid: number;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ contractAddress }) => {
  const { account } = useWallet();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats>({ total: 0, active: 0, paused: 0 });
  const [tokenStats, setTokenStats] = useState<TokenStats>({ totalAptPaid: 0, totalUsdcPaid: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Fetch employees
  const fetchEmployees = async () => {
    if (!account?.address) return;

    try {
      const addressString = account.address.toString();
      
      const testnetConfig = new AptosConfig({ network: Network.TESTNET });
      const testnetAptos = new Aptos(testnetConfig);
      
      try {
        const employeesData = await testnetAptos.view({
          payload: {
            function: `${contractAddress}::paylance_v10::get_all_employees`,
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
        
        // Calculate employee statistics
        const total = formattedEmployees.length;
        const active = formattedEmployees.filter(emp => !emp.paused).length;
        const paused = formattedEmployees.filter(emp => emp.paused).length;
        
        setEmployeeStats({ total, active, paused });
        
      } catch (testnetError) {
        console.log("Testnet failed, trying mainnet...");
        
        const mainnetConfig = new AptosConfig({ network: Network.MAINNET });
        const mainnetAptos = new Aptos(mainnetConfig);
        
        const employeesData = await mainnetAptos.view({
          payload: {
            function: `${contractAddress}::paylance_v10::get_all_employees`,
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
        
        // Calculate employee statistics
        const total = formattedEmployees.length;
        const active = formattedEmployees.filter(emp => !emp.paused).length;
        const paused = formattedEmployees.filter(emp => emp.paused).length;
        
        setEmployeeStats({ total, active, paused });
      }
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setError(`Failed to fetch employees: ${err.message || 'Unknown error'}`);
    }
  };

  // Fetch payment logs
  const fetchPaymentLogs = async () => {
    if (!account?.address) return;

    try {
      const addressString = account.address.toString();
      
      const testnetConfig = new AptosConfig({ network: Network.TESTNET });
      const testnetAptos = new Aptos(testnetConfig);
      
      try {
        const paymentLogsData = await testnetAptos.view({
          payload: {
            function: `${contractAddress}::paylance_v10::get_all_payment_logs`,
            functionArguments: [addressString],
          },
        });

        const logs = paymentLogsData[0] as any[];
        const formattedLogs: PaymentLog[] = logs.map((log: any) => ({
          timestamp: log.timestamp || 0,
          amount: log.amount || 0,
          employee_name: log.employee_name || 'Unknown',
          employee_role: log.employee_role || 'Unknown',
          employee_email: log.employee_email || 'Unknown',
          employee_wallet: log.employee_wallet || 'Unknown',
          token_type: log.token_type || 'APT'
        }));
        
        setPaymentLogs(formattedLogs);
        
        // Calculate token statistics
        const totalAptPaid = formattedLogs
          .filter(log => log.token_type === 'APT')
          .reduce((sum, log) => sum + (log.amount / 100000000), 0); // APT in octas

        const totalUsdcPaid = formattedLogs
          .filter(log => log.token_type === 'USDC')
          .reduce((sum, log) => sum + (log.amount / 1000000), 0); // USDC in 6 decimals

        setTokenStats({ totalAptPaid, totalUsdcPaid });
        
      } catch (testnetError) {
        console.log("Testnet failed, trying mainnet...");
        
        const mainnetConfig = new AptosConfig({ network: Network.MAINNET });
        const mainnetAptos = new Aptos(mainnetConfig);
        
        const paymentLogsData = await mainnetAptos.view({
          payload: {
            function: `${contractAddress}::paylance_v10::get_all_payment_logs`,
            functionArguments: [addressString],
          },
        });

        const logs = paymentLogsData[0] as any[];
        const formattedLogs: PaymentLog[] = logs.map((log: any) => ({
          timestamp: log.timestamp || 0,
          amount: log.amount || 0,
          employee_name: log.employee_name || 'Unknown',
          employee_role: log.employee_role || 'Unknown',
          employee_email: log.employee_email || 'Unknown',
          employee_wallet: log.employee_wallet || 'Unknown',
          token_type: log.token_type || 'APT'
        }));
        
        setPaymentLogs(formattedLogs);
        
        // Calculate token statistics
        const totalAptPaid = formattedLogs
          .filter(log => log.token_type === 'APT')
          .reduce((sum, log) => sum + (log.amount / 100000000), 0); // APT in octas

        const totalUsdcPaid = formattedLogs
          .filter(log => log.token_type === 'USDC')
          .reduce((sum, log) => sum + (log.amount / 1000000), 0); // USDC in 6 decimals

        setTokenStats({ totalAptPaid, totalUsdcPaid });
      }
    } catch (err: any) {
      console.error('Error fetching payment logs:', err);
      setError(`Failed to fetch payment logs: ${err.message || 'Unknown error'}`);
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchEmployees(),
        fetchPaymentLogs()
      ]);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(`Failed to fetch data: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter payment logs
  const filteredLogs = paymentLogs.filter(log => {
    const matchesSearch = log.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        log.employee_wallet.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'All') return matchesSearch;
    if (filterType === 'APT') return matchesSearch && log.token_type === 'APT';
    if (filterType === 'USDC') return matchesSearch && log.token_type === 'USDC';
    
    return matchesSearch;
  });

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp / 1000); // Convert from microseconds
    return date.toLocaleString();
  };

  // Format amount
  const formatAmount = (amount: number, token: string) => {
    if (token === 'APT') return (amount / 100000000).toFixed(4);
    if (token === 'USDC') return (amount / 1000000).toFixed(4);
    return amount.toString();
  };

  // Fetch data on component mount
  useEffect(() => {
    if (account?.address) {
      fetchAllData();
    }
  }, [account?.address]);

  return (
    <div className="space-y-8">
      {/* Error Message */}
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

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Employees Card */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Employees</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">{employeeStats.total}</div>
              <div className="space-y-1">
                <div className="flex items-center text-sm">
                  <span className="text-green-600 font-medium">Active: {employeeStats.active}</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-red-600 font-medium">Paused: {employeeStats.paused}</span>
                </div>
              </div>
            </div>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Token Payouts Card */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Token Payouts</h3>
              <p className="text-sm text-gray-600">Totals by Token</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">A</span>
                </div>
                <span className="text-sm font-medium text-gray-700">APT</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{tokenStats.totalAptPaid.toFixed(4)} APT</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">U</span>
                </div>
                <span className="text-sm font-medium text-gray-700">USDC</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{tokenStats.totalUsdcPaid.toFixed(4)} USDC</span>
            </div>
          </div>
        </div>

        {/* Token Support Card */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Token Support</h3>
              <p className="text-sm text-gray-600">Your token details</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">A</span>
                </div>
                <span className="text-sm font-medium text-gray-700">APT</span>
              </div>
              <span className="text-sm text-gray-600">Live price (USD)</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-semibold text-gray-900">$0.1519</span>
            </div>
          </div>
        </div>

        {/* Recent Activity Summary Card */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <p className="text-sm text-gray-600">On-chain payments</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">{paymentLogs.length}</div>
            <div className="text-sm text-gray-600">Total Payments</div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <p className="text-sm text-gray-600">On-chain payments</p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All</option>
                <option value="APT">APT</option>
                <option value="USDC">USDC</option>
              </select>
              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Loading activity...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-600">No recent activity to display</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      log.token_type === 'APT' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      <span className={`text-sm font-bold ${
                        log.token_type === 'APT' ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {log.token_type === 'APT' ? 'A' : 'U'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{log.employee_name}</div>
                      <div className="text-sm text-gray-600">{log.employee_role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatAmount(log.amount, log.token_type)} {log.token_type}
                    </div>
                    <div className="text-sm text-gray-600">{formatTimestamp(log.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
