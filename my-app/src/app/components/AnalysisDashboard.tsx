'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import MagicCard from './ui/MagicCard';
import Image from 'next/image';
import { useToast } from './ui/Toast';
import DonutChart from './ui/DonutChart';
import BarChart from './ui/BarChart';

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
  const { push } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [aptPrice, setAptPrice] = useState<number | null>(null);
  const [usdcPrice, setUsdcPrice] = useState<number | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 5;

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
      const msg = `Failed to fetch employees: ${err.message || 'Unknown error'}`;
      setError(msg);
      push({ kind: 'error', message: msg });
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
            function: `${contractAddress}::paylance_v12::get_all_payment_logs`,
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
            function: `${contractAddress}::paylance_v12::get_all_payment_logs`,
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
      const msg2 = `Failed to fetch payment logs: ${err.message || 'Unknown error'}`;
      setError(msg2);
      push({ kind: 'error', message: msg2 });
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

  // Fetch live prices from Binance (public endpoints)
  const fetchLivePrices = async () => {
    try {
      setIsPriceLoading(true);
      const [aptRes, usdcRes] = await Promise.all([
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=APTUSDT'),
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDCUSDT')
      ]);
      const aptJson = await aptRes.json();
      const usdcJson = await usdcRes.json();
      const apt = parseFloat(aptJson?.price ?? '0');
      const usdc = parseFloat(usdcJson?.price ?? '0');
      if (!isNaN(apt)) setAptPrice(apt);
      if (!isNaN(usdc)) setUsdcPrice(usdc);
    } catch (e) {
      console.warn('Failed to fetch live prices', e);
    } finally {
      setIsPriceLoading(false);
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

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / entriesPerPage);
  const indexOfFirstEntry = (currentPage - 1) * entriesPerPage;
  const indexOfLastEntry = indexOfFirstEntry + entriesPerPage;
  const currentEntries = filteredLogs.slice(indexOfFirstEntry, indexOfLastEntry);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

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

  // Print recent activities
  const handlePrintHistory = () => {
    try {
      const win = window.open('', 'PRINT', 'height=650,width=900,top=100,left=150');
      if (!win) return;
      const rows = filteredLogs
        .map((log) => `
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;">${log.employee_name}</td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${log.employee_role}</td>
            <td style="padding:8px;border:1px solid #e5e7eb; text-align:right;">${formatAmount(log.amount, log.token_type)} ${log.token_type}</td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${formatTimestamp(log.timestamp)}</td>
          </tr>`)
        .join('');

      win.document.write(`
        <html>
          <head>
            <title>Recent Activities</title>
            <style>
              body{font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial; color:#111827;}
              h1{font-size:20px;margin:16px 0;text-align:center}
              table{width:100%;border-collapse:collapse}
              th{background:#f3f4f6;text-align:left;padding:8px;border:1px solid #e5e7eb}
            </style>
          </head>
          <body>
            <h1>AptosPaylance - Recent Activities</h1>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Amount</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
      win.close();
    } catch (e) {
      console.error('Print failed', e);
    }
  };

  // Download CSV of recent activities (filtered)
  const handleDownloadCsv = () => {
    const headers = ['Employee', 'Role', 'Amount', 'Token', 'Timestamp'];
    const rows = filteredLogs.map((log) => [
      log.employee_name,
      log.employee_role,
      formatAmount(log.amount, log.token_type),
      log.token_type,
      formatTimestamp(log.timestamp),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'recent_activity.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Fetch data on component mount
  useEffect(() => {
    if (account?.address) {
      fetchAllData();
    }
  }, [account?.address]);

  // Load prices on mount and refresh every 60s
  useEffect(() => {
    fetchLivePrices();
    const id = setInterval(fetchLivePrices, 60000);
    return () => clearInterval(id);
  }, []);

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

      {/* Dashboard Cards: 3 columns layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1) Total Employees (Donut) */}
        <MagicCard particles={false} className="bg-primary/[0.08]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Total Employees</h3>
              <div className="text-2xl font-bold text-foreground">{employeeStats.total}</div>
            </div>
            <DonutChart
              labels={["Active", "Paused"]}
              values={[employeeStats.active, employeeStats.paused]}
              colors={["#22c55e", "#ef4444"]}
            />
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Active Employees</span><span className="text-green-500 font-semibold">{employeeStats.active}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Paused Employees</span><span className="text-red-500 font-semibold">{employeeStats.paused}</span></div>
            </div>
          </div>
        </MagicCard>
        {/* 2) Token Support Card */}
        <MagicCard particles={false} className="bg-primary/[0.08]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Token Support</h3>
                <p className="text-sm text-muted-foreground">Your token details</p>
              </div>
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              
            </div>

            {/* Token rows */}
            <div className="space-y-3">
              {/* APT */}
              <div className="flex items-center mt-16 justify-between">
                <div className="flex items-center gap-2">
                  <Image src="/icons/apt.png" alt="APT" width={20} height={20} className="w-8 h-8 object-contain" />
                  <span className="text-sm font-medium text-foreground">Aptos (APT)</span>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {isPriceLoading && aptPrice === null ? (
                    <span className="text-xs">—</span>
                  ) : (
                    `$${aptPrice?.toFixed(4) ?? '—'}`
                  )}
                </div>
              </div>

              {/* USDC */}
              <div className="flex items-center mt-8 justify-between">
                <div className="flex items-center gap-2">
                  <Image src="/icons/usdc.png" alt="USDC" width={20} height={20} className="w-8 h-8 object-contain" />
                  <span className="text-sm font-medium text-foreground">USD Coin (USDC)</span>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {isPriceLoading && usdcPrice === null ? (
                    <span className="text-xs">—</span>
                  ) : (
                    `$${usdcPrice?.toFixed(4) ?? '—'}`
                  )}
                </div>
              </div>
              <div className="flex items-center mt-18 justify-between">
                <div className="flex items-center gap-2">
                  
                  <span className="text-lg font-medium text-foreground">Total Payments</span>
                </div>
                <div className="text-lg font-semibold text-foreground">
               {paymentLogs.length}
                </div>
              </div>
            </div>
          </div>
        </MagicCard>

        {/* 3) Token Payouts (Bar) */}
        <MagicCard particles={false} className="bg-primary/[0.08]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Token Payouts</h3>
            </div>
            <BarChart
              labels={["APT", "USDC"]}
              values={[
                parseFloat(tokenStats.totalAptPaid.toFixed(4)),
                parseFloat(tokenStats.totalUsdcPaid.toFixed(4))
              ]}
              colors={["#0bc3a2", "#6366f1", "#f59e0b"]}
            />
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><Image src="/icons/apt.png" alt="APT" width={16} height={16} className="w-4 h-4"/>APT</span><span className="font-semibold text-foreground">{tokenStats.totalAptPaid.toFixed(4)} APT</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center  text-muted-foreground"><Image src="/icons/usdc.png" alt="USDC" width={16} height={16} className="w-4 h-4"/>USDC</span><span className="font-semibold text-foreground">{tokenStats.totalUsdcPaid.toFixed(4)} USDC</span></div>
             
            </div>
          </div>
        </MagicCard>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-secondary/10 rounded-xl lg:rounded-2xl border border-border">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
              <p className="text-sm text-muted-foreground">On-chain payments</p>
            </div>
            <div className="flex items-center  space-x-3">
             <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1 text-sm bg-secondary/30 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              <option value="All" className="bg-black text-foreground">All</option>
              <option value="APT" className="bg-black text-foreground">APT</option>
              <option value="USDC" className="bg-black text-foreground">USDC</option>
            </select>

              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1 text-sm bg-secondary/20 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? null : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-muted-foreground">No recent activity to display</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {currentEntries.map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-secondary/350 border border-border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        log.token_type === 'APT' ? 'bg-primary/20' : 'bg-green-500/20'
                      }`}>
                        <span className={`text-sm font-bold ${
                          log.token_type === 'APT' ? 'text-primary' : 'text-green-500'
                        }`}>
                          {log.token_type === 'APT' ? 'A' : 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{log.employee_name}</div>
                        <div className="text-sm text-muted-foreground">{log.employee_role}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        {formatAmount(log.amount, log.token_type)} {log.token_type}
                      </div>
                      <div className="text-sm text-muted-foreground">{formatTimestamp(log.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {indexOfFirstEntry + 1}-{Math.min(indexOfLastEntry, filteredLogs.length)} of {filteredLogs.length} activities
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
            </>
          )}
        </div>
      </div>

      {/* Download/Print Button */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={handlePrintHistory} className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold">
          Print History
        </button>
        <button onClick={handleDownloadCsv} className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-secondary/20 hover:bg-secondary/30 border border-border text-foreground">
          Download CSV
        </button>
      </div>
    </div>
  );
};
