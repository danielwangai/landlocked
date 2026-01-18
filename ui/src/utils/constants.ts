import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

export const NETWORK = process.env.NEXT_PUBLIC_NETWORK as WalletAdapterNetwork || WalletAdapterNetwork.Devnet;