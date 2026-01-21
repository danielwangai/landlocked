import { Landlocked } from "../../../target/types/landlocked";
import { Program } from "@coral-xyz/anchor";
import { getProtocolState, getRegistrarPDA } from "@/services/blockchain";
import { PublicKey } from "@solana/web3.js";
import { getClusterURL } from "./constants";

export const getCluster = (cluster: string): string => {
  const clusters: any = {
    "https://api.mainnet-beta.solana.com": "mainnet-beta",
    "https://api.testnet.solana.com": "testnet",
    "https://api.devnet.solana.com": "devnet",
    "http://127.0.0.1:8899": "localnet",
  };

  return clusters[getClusterURL(cluster)];
};

/**
 * Get the user type based on the wallet address and onchain data
 * @param program - The program instance
 * @param publicKey - The public key of the user
 * @returns The user type
 */
export const getUserType = async (program: Program<Landlocked>, publicKey: PublicKey) => {
  try {
    const protocolState = await getProtocolState(program);

    // Check if user is admin
    if (
      protocolState.admins.filter((admin: PublicKey) => admin.toString() === publicKey.toString())
        .length > 0
    ) {
      return "admin";
    }

    // Check if user is registrar
    const registrarPDA = getRegistrarPDA(publicKey, program.programId);
    const registrarAccount = await program.account.registrar.fetch(registrarPDA);
    if (registrarAccount.authority.toString() === publicKey.toString()) {
      return "registrar";
    }

    return "user";
  } catch (error) {
    console.error("Error getting user type:", error);
  }
};
