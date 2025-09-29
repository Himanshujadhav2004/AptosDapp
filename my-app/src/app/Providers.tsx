'use client';

import { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import AptosCoreProvider from "./AptosCoreProvider";

const queryClient = new QueryClient();

export default function Providers({ children }: PropsWithChildren) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      onError={(error) => {
        // Silently handle wallet errors to prevent crashes
        console.warn('Wallet adapter error (handled):', error?.message || error);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AptosCoreProvider>{children}</AptosCoreProvider>
      </QueryClientProvider>
    </AptosWalletAdapterProvider>
  );
}
