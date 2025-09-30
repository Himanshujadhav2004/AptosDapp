'use client';

import { useRouter } from 'next/navigation';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useCompanyStatus } from '../hooks/useCompanyStatus';
import { useEffect } from 'react';

interface RouteGuardProps {
  children: React.ReactNode;
  requireWallet?: boolean;
  requireCompany?: boolean;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  requireWallet = false,
  requireCompany = false 
}) => {
  const router = useRouter();
  const { connected } = useWallet();
  const { hasCompany, isChecking } = useCompanyStatus();

  useEffect(() => {
    // If wallet is required but not connected
    if (requireWallet && !connected) {
      router.push('/');
      return;
    }

    // If company is required but doesn't exist (and not checking)
    if (requireCompany && !isChecking && !hasCompany && connected) {
      router.push('/create-company');
      return;
    }

    // If on create-company page but user already has a company, redirect to employees
    if (!requireCompany && requireWallet && !isChecking && hasCompany && connected) {
      router.push('/employees');
      return;
    }
  }, [requireWallet, requireCompany, connected, hasCompany, isChecking, router]);

  // Show loading state while checking
  if (isChecking && (requireWallet || requireCompany)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  // Don't render if requirements not met
  if (requireWallet && !connected) {
    return null;
  }

  if (requireCompany && !hasCompany && connected) {
    return null;
  }

  return <>{children}</>;
};
