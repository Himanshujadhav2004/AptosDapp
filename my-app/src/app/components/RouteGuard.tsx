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
      router.push('/dashboard');
      return;
    }
  }, [requireWallet, requireCompany, connected, hasCompany, isChecking, router]);

  // While checking, avoid showing loader; defer rendering
  if (isChecking && (requireWallet || requireCompany)) {
    return null;
  }



  return <>{children}</>;
};
