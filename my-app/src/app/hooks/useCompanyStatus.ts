'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

const CONTRACT_ADDRESS = '0x8922d3e9d9b5ea2175ac47c083d1b5b83af560113481d02b03d143552d14f994';

export const useCompanyStatus = () => {
  const { account, connected } = useWallet();
  const [hasCompany, setHasCompany] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkCompany = async () => {
      if (!connected || !account?.address) {
        setHasCompany(false);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      try {
        const addressString = typeof account.address === 'string' 
          ? account.address 
          : account.address.toString();

        const response = await fetch(
          `https://fullnode.testnet.aptoslabs.com/v1/accounts/${addressString}/resource/${CONTRACT_ADDRESS}::paylance_v12::Company`
        );

        if (response.ok) {
          setHasCompany(true);
        } else {
          setHasCompany(false);
        }
      } catch (err) {
        console.error('Error checking company status:', err);
        setHasCompany(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkCompany();
  }, [connected, account?.address]);

  return { hasCompany, isChecking };
};
