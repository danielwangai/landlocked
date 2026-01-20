import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

// use union type to extend WalletAdapterNetwork
export type WalletAdapterNetworkExtended = WalletAdapterNetwork | "localnet";

export const NETWORK = process.env.NEXT_PUBLIC_CLUSTER as WalletAdapterNetworkExtended;
