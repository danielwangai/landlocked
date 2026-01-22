import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

// use union type to extend WalletAdapterNetwork
export type WalletAdapterNetworkExtended = WalletAdapterNetwork | "localnet";

export const getClusterURL = (cluster: string): string => {
  const clusterUrls: any = {
    "mainnet-beta": "https://api.mainnet-beta.solana.com",
    testnet: "https://api.testnet.solana.com",
    devnet: "https://api.devnet.solana.com",
    localnet: "http://127.0.0.1:8899",
  };

  return clusterUrls[cluster] || clusterUrls.localnet;
};

export const NETWORK = process.env.NEXT_PUBLIC_CLUSTER as WalletAdapterNetworkExtended;
export const ITEMS_PER_PAGE = 10;
