'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { useRouter } from 'next/navigation';
import MagicCard from './ui/MagicCard';
import { cn } from '../lib/utils';
import { useToast } from './ui/Toast';

interface EmployeeManagementProps {
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

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ contractAddress }) => {
  const router = useRouter();
  const { account, signAndSubmitTransaction } = useWallet();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFetchingEmployees, setIsFetchingEmployees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { push } = useToast();
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 5;
  
  // Add employee form state
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    wallet: '',
    role: '',
    salary_usdc: ''
  });
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isUpdatingEmployee, setIsUpdatingEmployee] = useState(false);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, employee: Employee | null}>({
    isOpen: false,
    employee: null
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    wallet: '',
    role: '',
    salary_usdc: '',
    paused: false
  });

  // Initialize Aptos client
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  // Fetch employees from the contract
  const fetchEmployees = async () => {
    if (!account?.address) return;
    
    setIsFetchingEmployees(true);
    setError(null);
    
    try {
      const addressString = typeof account.address === 'string' 
        ? account.address 
        : account.address.toString();
      
      const companyResponse = await fetch(
        `https://fullnode.testnet.aptoslabs.com/v1/accounts/${addressString}/resource/${contractAddress}::paylance_v12::Company`
      );
      
      if (!companyResponse.ok) {
        if (companyResponse.status === 404) {
          setError('No company found. Please create a company first.');
          setEmployees([]);
          setFilteredEmployees([]);
          return;
        }
        throw new Error(`HTTP error! status: ${companyResponse.status}`);
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
        setFilteredEmployees(formattedEmployees);
      } else {
          setEmployees([]);
        setFilteredEmployees([]);
      }
      
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setError(`Failed to load employees: ${err.message || 'Unknown error'}`);
      setEmployees([]);
      setFilteredEmployees([]);
    } finally {
      setIsFetchingEmployees(false);
    }
  };

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.wallet.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
    setCurrentPage(1); // Reset to first page on search
  }, [searchQuery, employees]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account?.address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!newEmployee.name || !newEmployee.email || !newEmployee.wallet || !newEmployee.role || !newEmployee.salary_usdc) {
      setError('Please fill in all fields');
      return;
    }

    setIsAddingEmployee(true);
    setError(null);
    setSuccess(null);

    try {
      const salaryInMicroUSDC = Math.floor(parseFloat(newEmployee.salary_usdc) * 1000000);

      const transaction = {
        sender: typeof account.address === 'string' ? account.address : account.address.toString(),
        data: {
          function: `${contractAddress}::paylance_v12::add_employee`,
          typeArguments: [],
          functionArguments: [
            newEmployee.name,
            newEmployee.email,
            newEmployee.wallet,
            newEmployee.role,
            salaryInMicroUSDC.toString(),
          ],
        },
      };

      const result = await signAndSubmitTransaction(transaction as any);
      setSuccess(`Employee added successfully! Transaction: ${result.hash}`);
      push({ kind: 'success', message: 'Employee added successfully' });
      
      setNewEmployee({
        name: '',
        email: '',
        wallet: '',
        role: '',
        salary_usdc: ''
      });
      
      setIsAddModalOpen(false);
      
      setTimeout(() => {
        fetchEmployees();
        setSuccess(null);
      }, 2000);

    } catch (err: any) {
      console.error('Add employee failed:', err);
      const msg = `Failed to add employee: ${err.message || 'Unknown error'}`;
      setError(msg);
      push({ kind: 'error', message: msg });
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const openAddModal = () => {
    setNewEmployee({
      name: '',
      email: '',
      wallet: '',
      role: '',
      salary_usdc: ''
    });
    setError(null);
    setSuccess(null);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setNewEmployee({
      name: '',
      email: '',
      wallet: '',
      role: '',
      salary_usdc: ''
    });
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditFormData({
      name: employee.name,
      email: employee.email,
      wallet: '',
      role: employee.role,
      salary_usdc: formatUSDC(employee.salary_usdc),
      paused: employee.paused
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingEmployee(null);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account?.address || !editingEmployee) {
      setError('Please connect your wallet first');
      return;
    }

    if (!editFormData.name || !editFormData.email || !editFormData.role || !editFormData.salary_usdc) {
      setError('Please fill in all required fields');
      return;
    }

    setIsUpdatingEmployee(true);
    setError(null);
    setSuccess(null);

    try {
      const salaryInMicroUSDC = Math.floor(parseFloat(editFormData.salary_usdc) * 1000000);
      const newWallet = editFormData.wallet.trim() !== '' ? editFormData.wallet : editingEmployee.wallet;

      console.log('Updating employee:', {
        oldWallet: editingEmployee.wallet,
        name: editFormData.name,
        email: editFormData.email,
        newWallet: newWallet,
        role: editFormData.role,
        salary: salaryInMicroUSDC
      });

      const transaction = {
        sender: typeof account.address === 'string' ? account.address : account.address.toString(),
        data: {
          function: `${contractAddress}::paylance_v12::update_employee_complete`,
          typeArguments: [],
          functionArguments: [
            editingEmployee.wallet,         // employee_wallet
            editFormData.name,              // new_name
            editFormData.email,             // new_email
            editFormData.role,              // new_role
            salaryInMicroUSDC.toString(),   // new_salary (micro USDC)
            newWallet,                      // new_wallet
            editFormData.paused,            // new_paused
          ],
        },
      };

      const result = await signAndSubmitTransaction(transaction as any);
      console.log('Employee updated successfully:', result.hash);
      setSuccess(`Employee updated successfully! Transaction: ${result.hash}`);
      push({ kind: 'success', message: 'Employee updated successfully' });
      
      
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      
      setTimeout(() => {
        fetchEmployees();
        setSuccess(null);
      }, 2000);

    } catch (err: any) {
      console.error('Update employee failed:', err);
      const msgU = `Failed to update employee: ${err.message || 'Unknown error'}`;
      setError(msgU);
      push({ kind: 'error', message: msgU });
    } finally {
      setIsUpdatingEmployee(false);
    }
  };

  const handleDeleteEmployee = async (employeeWallet: string) => {
    if (!account?.address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsDeletingEmployee(true);
    setError(null);
    setSuccess(null);

    try {
      const transaction = {
        sender: typeof account.address === 'string' ? account.address : account.address.toString(),
        data: {
          function: `${contractAddress}::paylance_v12::remove_employee`,
          typeArguments: [],
          functionArguments: [employeeWallet],
        },
      };

      const result = await signAndSubmitTransaction(transaction as any);
      setSuccess(`Employee deleted successfully! Transaction: ${result.hash}`);
      push({ kind: 'success', message: 'Employee deleted successfully' });
      
      setTimeout(() => {
        fetchEmployees();
        setSuccess(null);
      }, 2000);

    } catch (err: any) {
      console.error('Delete employee failed:', err);
      const msgD = `Failed to delete employee: ${err.message || 'Unknown error'}`;
      setError(msgD);
      push({ kind: 'error', message: msgD });
    } finally {
      setIsDeletingEmployee(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Wallet address copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  useEffect(() => {
    if (account?.address) {
      fetchEmployees();
    } else {
      setEmployees([]);
      setFilteredEmployees([]);
      setError(null);
    }
  }, [account?.address]);

  const formatAddress = (address: any) => {
    if (!address) return '';
    const addressString = typeof address === 'string' ? address : address.toString();
    return `${addressString.slice(0, 6)}...${addressString.slice(-4)}`;
  };

  const formatUSDC = (salary: number) => {
    return (salary / 1000000).toFixed(2);
  };

  // Pagination calculations
  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstEmployee, indexOfLastEmployee);
  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);

  return (
    <div className="w-full">
      

      {/* Search and Action Buttons */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
              </div>
          </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
                <button
                  onClick={openAddModal}
                  disabled={!account?.address}
            className="btn-primary px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
                >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
            Add Employee
                </button>
                <button
            onClick={() => router.push('/pay')}
            disabled={!account?.address || filteredEmployees.length === 0}
            className="btn-primary px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pay Employee
                </button>
              </div>
            </div>

      {/* Employee Table */}
      {isFetchingEmployees ? null : filteredEmployees.length > 0 ? (
        <>
          <div className="bg-secondary/10 overflow-hidden rounded-xl lg:rounded-2xl border border-border">
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Employee Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Salary
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Wallet Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Paid
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                    </tr>
                  </thead>
                <tbody>
                  {currentEmployees.map((employee, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-border/50 hover:bg-primary/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary font-semibold text-sm uppercase">
                              {employee.name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-foreground">{employee.name}</span>
                        </div>
                        </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                          {employee.email}
                        </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary border border-primary/30">
                          {employee.role}
                        </span>
                        </td>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">
                        ${formatUSDC(employee.salary_usdc)}
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground font-mono">
                            {formatAddress(employee.wallet)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(employee.wallet)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Copy wallet address"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                        </td>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">
                        ${formatUSDC(employee.total_paid_usdc)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(employee)}
                              disabled={isUpdatingEmployee}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                              title="Edit Employee"
                            type="button"
                            >
                            <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmation({ isOpen: true, employee });
                              }}
                              disabled={isDeletingEmployee}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                              title="Delete Employee"
                            type="button"
                            >
                            <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>

          {/* Status Messages handled by toast now */}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {indexOfFirstEmployee + 1}-{Math.min(indexOfLastEmployee, filteredEmployees.length)} of {filteredEmployees.length} employees
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-secondary/50 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      currentPage === page
                        ? "bg-primary text-white"
                        : "bg-secondary/50 border border-border text-foreground hover:bg-secondary"
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-secondary/50 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
          </div>
            </div>
          )}
        </>
      ) : !account?.address ? (
        <div className="text-center py-20">
          <svg className="mx-auto h-16 w-16 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-xl font-semibold text-foreground mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">Please connect your wallet to manage employees</p>
          </div>
      ) : (
        <div className="text-center py-20">
          <svg className="mx-auto h-16 w-16 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {searchQuery ? 'No employees found' : 'No Employees Yet'}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery ? `No employees match "${searchQuery}"` : 'Get started by adding your first employee'}
          </p>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
              <h3 className="text-lg font-heading font-semibold text-foreground">Add New Employee</h3>
              <button
                onClick={closeAddModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddEmployee} className="p-4 space-y-2.5">
              <div className="space-y-2.5">
                <h4 className="text-sm font-semibold text-primary">Employee Information</h4>
                
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Full Name *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                      className="block w-full pl-8 pr-3 py-2 bg-secondary/10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Email *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                      className="block w-full pl-8 pr-3 py-2 bg-secondary/10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Wallet Address */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Wallet Address *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={newEmployee.wallet}
                      onChange={(e) => setNewEmployee({...newEmployee, wallet: e.target.value})}
                      className="block w-full pl-8 pr-3 py-2 bg-secondary/10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground font-mono text-xs"
                      placeholder="0x..."
                      required
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Role *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={newEmployee.role}
                      onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                      className="block w-full pl-8 pr-3 py-2 bg-secondary/10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm"
                      placeholder="Developer"
                      required
                    />
                  </div>
                </div>

                {/* Monthly Salary */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Monthly Salary (USDC) *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <span className="text-muted-foreground font-semibold text-xs">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={newEmployee.salary_usdc}
                      onChange={(e) => setNewEmployee({...newEmployee, salary_usdc: e.target.value})}
                      className="block w-full pl-7 pr-3 py-2 bg-secondary/10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm"
                      placeholder="1000.00"
                      required
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Enter salary in USDC</p>
                  </div>
                </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2.5">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 px-3 py-2 bg-secondary/40 hover:bg-secondary/20 text-foreground rounded-lg font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingEmployee}
                  className="flex-1 btn-primary px-3 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isAddingEmployee ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && deleteConfirmation.employee && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                <div>
                  <h3 className="text-xl font-heading font-semibold text-foreground">Delete Employee</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                  </div>
                </div>
              </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-foreground mb-2">
                Are you sure you want to delete <span className="font-semibold text-primary">{deleteConfirmation.employee.name}</span>?
              </p>
              <p className="text-sm text-muted-foreground">
                This will permanently remove the employee from your payroll system.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border flex gap-3">
              <button
                onClick={() => setDeleteConfirmation({ isOpen: false, employee: null })}
                disabled={isDeletingEmployee}
                className="flex-1 px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteEmployee(deleteConfirmation.employee!.wallet);
                  setDeleteConfirmation({ isOpen: false, employee: null });
                }}
                disabled={isDeletingEmployee}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                type="button"
              >
                {isDeletingEmployee ? 'Deleting...' : 'Delete Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {isEditModalOpen && editingEmployee && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
              <h3 className="text-lg font-heading font-semibold text-foreground">Edit Employee</h3>
              <button
                onClick={closeEditModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUpdateEmployee} className="p-4 space-y-2.5">
              <div className="space-y-2.5">
                <h4 className="text-sm font-semibold text-primary">Employee Information</h4>
                
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      className="block w-full pl-8 pr-3 py-2 bg-secondary/10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                      className="block w-full pl-8 pr-3 py-2 bg-secondary/10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm"
                    />
                  </div>
                </div>

                {/* New Wallet */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">New Wallet (optional)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={editFormData.wallet}
                      onChange={(e) => setEditFormData({...editFormData, wallet: e.target.value})}
                      className="block w-full pl-8 pr-3 py-2 bg-secondary/10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground font-mono text-xs"
                      placeholder="0x..."
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Role</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                      className="block w-full pl-8 pr-3 py-2 bg-secondary/10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm"
                    />
                  </div>
                </div>

                {/* Monthly Salary */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Monthly Salary (USDC)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <span className="text-muted-foreground font-semibold text-xs">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.salary_usdc}
                      onChange={(e) => setEditFormData({...editFormData, salary_usdc: e.target.value})}
                      className="block w-full pl-7 pr-3 py-2 bg-secondary/10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm"
                    />
                </div>
              </div>
              
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Status</label>
                <div className="relative">
                  <select
                    value={editFormData.paused ? 'Paused' : 'Active'}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      paused: e.target.value === 'Paused'
                    })}
                    className="block w-full pl-3 pr-8 py-2 bg-secondary/10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground text-sm custom-select"
                  >
                    <option className="bg-secondary text-foreground" value="Active">Active</option>
                    <option className="bg-secondary text-foreground" value="Paused">Paused</option>
                  </select>
                </div>
              </div>
            </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2.5">
              <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-3 py-2 bg-secondary/30 hover:bg-secondary/50 text-foreground rounded-lg font-medium transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                  type="submit"
                  disabled={isUpdatingEmployee}
                  className="flex-1 btn-primary px-3 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isUpdatingEmployee ? 'Updating...' : 'Update Employee'}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};