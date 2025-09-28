'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

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
  const { account, signAndSubmitTransaction } = useWallet();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingEmployees, setIsFetchingEmployees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
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
      
      console.log('Fetching employees for address:', addressString);
      
      // Try to get the Company resource to check if it exists
      const companyResponse = await fetch(
        `https://fullnode.testnet.aptoslabs.com/v1/accounts/${addressString}/resource/${contractAddress}::paylance_v7::Company`
      );
      
      if (!companyResponse.ok) {
        if (companyResponse.status === 404) {
          setError('No company found. Please create a company first.');
          setEmployees([]);
          return;
        }
        throw new Error(`HTTP error! status: ${companyResponse.status}`);
      }
      
      const companyData = await companyResponse.json();
      console.log('Company data:', companyData);
      console.log('Company data structure:', JSON.stringify(companyData, null, 2));
      
      // Extract employees from the company data
      if (companyData.data && companyData.data.employees) {
        const employeeList = companyData.data.employees;
        console.log('Found employees:', employeeList);
        
        // Convert the employee data to our interface format
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
      } else {
        console.log('No employees found in company data');
        console.log('Available fields in company data:', Object.keys(companyData.data || {}));
        
        // Check if employees might be in a different structure
        if (companyData.data && Array.isArray(companyData.data)) {
          console.log('Company data is an array, checking for employees...');
          setEmployees([]);
          setSuccess('Company found, but employee structure is different than expected.');
        } else {
          setEmployees([]);
          setSuccess('Company found, but no employees added yet.');
        }
      }
      
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(`Failed to fetch employees: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setEmployees([]);
    } finally {
      setIsFetchingEmployees(false);
    }
  };

  // Add new employee
  const handleAddEmployee = async () => {
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
      const salaryInMicroUSDC = Math.floor(Number(newEmployee.salary_usdc) * 1000000); // Convert to micro-USDC (6 decimals)
      
      console.log('Adding employee with:', {
        contractAddress,
        function: `${contractAddress}::paylance_v7::add_employee`,
        employeeData: newEmployee,
        salaryInMicroUSDC
      });

      // Build transaction payload
      const transaction = {
        sender: account.address,
        data: {
          function: `${contractAddress}::paylance_v7::add_employee`,
          functionArguments: [
            newEmployee.name,
            newEmployee.email,
            newEmployee.wallet,
            newEmployee.role,
            salaryInMicroUSDC.toString()
          ],
        },
      };

      console.log('Transaction payload:', transaction);

      const result = await signAndSubmitTransaction(transaction);
      console.log('Employee added successfully:', result.hash);
      
      setSuccess(`Employee added successfully! Transaction: ${result.hash}`);
      
      // Close modal and reset form
      closeAddModal();
      
      // Refresh employee list
      setTimeout(() => {
        fetchEmployees();
      }, 2000);

    } catch (err: any) {
      console.error('Add employee failed:', err);
      setError(`Failed to add employee: ${err.message || 'Unknown error'}`);
    } finally {
      setIsAddingEmployee(false);
    }
  };

  // Open edit modal
  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditFormData({
      name: employee.name,
      email: employee.email,
      wallet: employee.wallet,
      role: employee.role,
      salary_usdc: formatUSDC(employee.salary_usdc),
      paused: employee.paused
    });
    setIsEditModalOpen(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingEmployee(null);
    setEditFormData({
      name: '',
      email: '',
      wallet: '',
      role: '',
      salary_usdc: '',
      paused: false
    });
  };

  // Open add modal
  const openAddModal = () => {
    setNewEmployee({
      name: '',
      email: '',
      wallet: '',
      role: '',
      salary_usdc: ''
    });
    setIsAddModalOpen(true);
  };

  // Close add modal
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

  // Update all employee fields at once in a single transaction
  const handleBulkUpdateEmployee = async () => {
    if (!account?.address || !editingEmployee) {
      setError('Please connect your wallet first');
      return;
    }

    setIsUpdatingEmployee(true);
    setError(null);
    setSuccess(null);

    try {
      // Convert salary to micro-USDC
      const salaryInMicroUSDC = Math.floor(Number(editFormData.salary_usdc) * 1000000);
      
      console.log('Updating employee with single transaction:', {
        contractAddress,
        function: `${contractAddress}::paylance_v7::update_employee_complete`,
        employeeWallet: editingEmployee.wallet,
        newName: editFormData.name,
        newEmail: editFormData.email,
        newRole: editFormData.role,
        newSalary: salaryInMicroUSDC,
        newWallet: editFormData.wallet,
        newPaused: editFormData.paused
      });

      const transaction = {
        sender: account.address,
        data: {
          function: `${contractAddress}::paylance_v7::update_employee_complete`,
          functionArguments: [
            editingEmployee.wallet,  // employee_wallet
            editFormData.name,       // new_name
            editFormData.email,      // new_email
            editFormData.role,       // new_role
            salaryInMicroUSDC.toString(), // new_salary
            editFormData.wallet,    // new_wallet
            editFormData.paused     // new_paused
          ],
        },
      };

      console.log('Single transaction payload:', transaction);

      const result = await signAndSubmitTransaction(transaction);
      console.log('Employee updated successfully in single transaction:', result.hash);
      
      setSuccess(`Employee updated successfully! Transaction: ${result.hash}`);
      closeEditModal();
      
      // Refresh employee list
      setTimeout(() => {
        fetchEmployees();
      }, 2000);

    } catch (err: any) {
      console.error('Update employee failed:', err);
      setError(`Failed to update employee: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUpdatingEmployee(false);
    }
  };

  // Update employee field (generic function) - keeping for individual updates
  const handleUpdateEmployeeField = async (employeeWallet: string, field: string, newValue: string) => {
    if (!account?.address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsUpdatingEmployee(true);
    setError(null);
    setSuccess(null);

    try {
      let functionName = '';
      let functionArguments: string[] = [employeeWallet];
      
      // Determine function and arguments based on field
      switch (field) {
        case 'name':
          functionName = 'update_employee_name';
          functionArguments.push(newValue);
          break;
        case 'email':
          functionName = 'update_employee_email';
          functionArguments.push(newValue);
          break;
        case 'role':
          functionName = 'update_employee_role';
          functionArguments.push(newValue);
          break;
        case 'salary_usdc':
          functionName = 'update_employee_salary';
          const salaryInMicroUSDC = Math.floor(Number(newValue) * 1000000);
          functionArguments.push(salaryInMicroUSDC.toString());
          break;
        case 'wallet':
          functionName = 'update_employee_wallet';
          functionArguments.push(newValue);
          break;
        default:
          throw new Error('Invalid field to update');
      }
      
      console.log(`Updating employee ${field}:`, {
        contractAddress,
        function: `${contractAddress}::paylance_v7::${functionName}`,
        employeeWallet,
        newValue
      });

      const transaction = {
        sender: account.address,
        data: {
          function: `${contractAddress}::paylance_v7::${functionName}`,
          functionArguments,
        },
      };

      console.log('Update transaction payload:', transaction);

      const result = await signAndSubmitTransaction(transaction);
      console.log(`Employee ${field} updated successfully:`, result.hash);
      
      setSuccess(`Employee ${field} updated successfully! Transaction: ${result.hash}`);
      
      // Refresh employee list
      setTimeout(() => {
        fetchEmployees();
      }, 2000);

    } catch (err: any) {
      console.error(`Update employee ${field} failed:`, err);
      setError(`Failed to update employee ${field}: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUpdatingEmployee(false);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (employeeWallet: string) => {
    if (!account?.address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsDeletingEmployee(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Deleting employee:', {
        contractAddress,
        function: `${contractAddress}::paylance_v7::remove_employee`,
        employeeWallet
      });

      const transaction = {
        sender: account.address,
        data: {
          function: `${contractAddress}::paylance_v7::remove_employee`,
          functionArguments: [employeeWallet],
        },
      };

      console.log('Delete transaction payload:', transaction);

      const result = await signAndSubmitTransaction(transaction);
      console.log('Employee deleted successfully:', result.hash);
      
      setSuccess(`Employee deleted successfully! Transaction: ${result.hash}`);
      
      // Refresh employee list
      setTimeout(() => {
        fetchEmployees();
      }, 2000);

    } catch (err: any) {
      console.error('Delete employee failed:', err);
      setError(`Failed to delete employee: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeletingEmployee(false);
    }
  };

  // Pause/Resume employee
  const handleToggleEmployeeStatus = async (employeeWallet: string, isPaused: boolean) => {
    if (!account?.address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsUpdatingEmployee(true);
    setError(null);
    setSuccess(null);

    try {
      const functionName = isPaused ? 'resume_employee' : 'pause_employee';
      
      console.log('Toggling employee status:', {
        contractAddress,
        function: `${contractAddress}::paylance_v7::${functionName}`,
        employeeWallet,
        action: isPaused ? 'resume' : 'pause'
      });

      const transaction = {
        sender: account.address,
        data: {
          function: `${contractAddress}::paylance_v7::${functionName}`,
          functionArguments: [employeeWallet],
        },
      };

      console.log('Toggle status transaction payload:', transaction);

      const result = await signAndSubmitTransaction(transaction);
      console.log('Employee status updated successfully:', result.hash);
      
      setSuccess(`Employee ${isPaused ? 'resumed' : 'paused'} successfully! Transaction: ${result.hash}`);
      
      // Refresh employee list
      setTimeout(() => {
        fetchEmployees();
      }, 2000);

    } catch (err: any) {
      console.error('Toggle employee status failed:', err);
      setError(`Failed to ${isPaused ? 'resume' : 'pause'} employee: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUpdatingEmployee(false);
    }
  };

  // Fetch employees when account changes
  useEffect(() => {
    if (account?.address) {
      fetchEmployees();
    } else {
      setEmployees([]);
      setError(null);
    }
  }, [account?.address]);

  const formatAddress = (address: any) => {
    if (!address) return '';
    const addressString = typeof address === 'string' ? address : address.toString();
    return `${addressString.slice(0, 6)}...${addressString.slice(-4)}`;
  };

  const formatSalary = (salary: number) => {
    return (salary / 100000000).toFixed(4); // Convert from octas to APT
  };

  const formatUSDC = (salary: number) => {
    return (salary / 1000000).toFixed(2); // Convert from micro-USDC to USDC
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Employee Management</h2>
              <p className="text-indigo-100">Manage your company's payroll employees</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Wallet Status */}
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
                    'Please connect your wallet to manage employees'
                  }
                </p>
              </div>
              {account?.address && (
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              )}
            </div>
          </div>


          {/* Employee List */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Employee List</h3>
              <div className="flex space-x-3">
                <button
                  onClick={openAddModal}
                  disabled={!account?.address}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add Employee</span>
                </button>
                <button
                  onClick={fetchEmployees}
                  disabled={isFetchingEmployees}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50"
                >
                  {isFetchingEmployees ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Loading State */}
            {isFetchingEmployees && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-600">Loading employees...</span>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Success State */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-700 text-sm">{success}</p>
                </div>
              </div>
            )}

            {/* Employee List */}
            {employees.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary (USDC)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallet</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Paid</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map((employee, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employee.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatUSDC(employee.salary_usdc)} USDC
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {formatAddress(employee.wallet)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            employee.paused 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {employee.paused ? 'Paused' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="text-gray-900 font-medium">
                            {formatUSDC(employee.total_paid_usdc)} USDC
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(employee)}
                              disabled={isUpdatingEmployee}
                              className="flex items-center space-x-1 text-blue-600 hover:text-blue-900 text-xs font-medium disabled:opacity-50 px-3 py-2 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                              title="Edit Employee"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit</span>
                            </button>
                            
                            
                            {/* Delete Button */}
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ${employee.name}? This action cannot be undone.`)) {
                                  handleDeleteEmployee(employee.wallet);
                                }
                              }}
                              disabled={isDeletingEmployee}
                              className="flex items-center space-x-1 text-red-600 hover:text-red-900 text-xs font-medium disabled:opacity-50 px-3 py-2 rounded bg-red-50 hover:bg-red-100 transition-colors"
                              title="Delete Employee"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !isFetchingEmployees && !error && (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No employees</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding your first employee.</p>
              </div>
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

      {/* Edit Employee Modal */}
      {isEditModalOpen && editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Employee</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Employee Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-green-600">Employee Information</h4>
                
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

                {/* New Wallet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Wallet (optional)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={editFormData.wallet}
                      onChange={(e) => setEditFormData({...editFormData, wallet: e.target.value})}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0x..."
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter role"
                    />
                  </div>
                </div>

                {/* Monthly Salary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (USDC)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.salary_usdc}
                      onChange={(e) => setEditFormData({...editFormData, salary_usdc: e.target.value})}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter salary in USDC"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <div className="relative">
                    <select
                      value={editFormData.paused ? 'Paused' : 'Active'}
                      onChange={(e) => setEditFormData({...editFormData, paused: e.target.value === 'Paused'})}
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Paused">Paused</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Change employee status</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpdateEmployee}
                disabled={isUpdatingEmployee}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingEmployee ? 'Updating...' : 'Update Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Employee</h3>
              <button
                onClick={closeAddModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Employee Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-green-600">Employee Information</h4>
                
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

                {/* Wallet Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Address *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={newEmployee.wallet}
                      onChange={(e) => setNewEmployee({...newEmployee, wallet: e.target.value})}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="0x..."
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={newEmployee.role}
                      onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter role"
                    />
                  </div>
                </div>

                {/* Monthly Salary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (USDC) *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={newEmployee.salary_usdc}
                      onChange={(e) => setNewEmployee({...newEmployee, salary_usdc: e.target.value})}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter salary in USDC"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Enter salary in USDC (e.g., 100 for 100 USDC)</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
              <button
                onClick={closeAddModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEmployee}
                disabled={isAddingEmployee || !account?.address || !newEmployee.name || !newEmployee.email || !newEmployee.wallet || !newEmployee.role || !newEmployee.salary_usdc}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingEmployee ? 'Adding...' : 'Add Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
