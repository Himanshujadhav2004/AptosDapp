import { PropsWithChildren } from "react";
import { AptosJSCoreProvider, useWalletAdapterCore } from "@aptos-labs/react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

function AptosCoreProvider({ children }: PropsWithChildren) {
  const wallet = useWallet();
  const core = useWalletAdapterCore({ wallet });

  return <AptosJSCoreProvider core={core}>{children}</AptosJSCoreProvider>;
}


export default AptosCoreProvider;