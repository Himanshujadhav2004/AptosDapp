'use client';

import { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import AptosCoreProvider from "./AptosCoreProvider";
import { ToastProvider } from "./components/ui/Toast";

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
        <ToastProvider>
          <AptosCoreProvider>{children}</AptosCoreProvider>
        </ToastProvider>
      </QueryClientProvider>
    </AptosWalletAdapterProvider>
  );
}
