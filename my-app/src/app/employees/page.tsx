import { EmployeeManagement, RouteGuard } from '../components';

const CONTRACT_ADDRESS = '0x8922d3e9d9b5ea2175ac47c083d1b5b83af560113481d02b03d143552d14f994';

export default function EmployeesPage() {
  return (
    <RouteGuard requireWallet={true} requireCompany={true}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Employee Management</h1>
          <p className="text-lg text-gray-600">Add and manage your company's employees</p>
        </div>

        {/* Employee Management Component */}
        <EmployeeManagement contractAddress={CONTRACT_ADDRESS} />
      </div>
    </RouteGuard>
  );
}
