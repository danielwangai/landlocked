import { Landlocked } from "../../../target/types/landlocked";
import { Program } from "@coral-xyz/anchor";
import {
  getProtocolState,
  getRegistrarPDA,
  getUserAddress,
  UserService,
} from "@/services/blockchain";
import { PublicKey } from "@solana/web3.js";
import { getClusterURL } from "./constants";

export const getCluster = (cluster: string): string => {
  const clusters: any = {
    "https://api.mainnet-beta.solana.com": "mainnet-beta",
    "https://api.testnet.solana.com": "testnet",
    "https://api.devnet.solana.com": "devnet",
    "http://127.0.0.1:8899": "localnet",
  };

  return clusters[getClusterURL(cluster)] ?? "devnet";
};

/**
 * Extract and format error message from various error formats
 * Handles Solana transaction errors, Anchor errors, and generic errors
 * @param error - The error object or string
 * @param defaultMessage - Default message if error cannot be parsed
 * @returns User-friendly error message
 */
export const extractOnchainErrorMessage = (
  error: any,
  defaultMessage: string = "An error occurred. Please try again."
): string => {
  let errorMessage = defaultMessage;

  // Check for transaction logs first (Solana-specific)
  if (error?.logs && Array.isArray(error.logs)) {
    console.error("Transaction logs:", error.logs);
    errorMessage = error.logs.join(" ") || errorMessage;
  }

  // Extract error message from various error formats
  if (error?.message) {
    errorMessage = error.message;
  } else if (error?.error?.message) {
    errorMessage = error.error.message;
  } else if (error?.error?.errorMessage) {
    errorMessage = error.error.errorMessage;
  } else if (typeof error === "string") {
    errorMessage = error;
  }

  // Check for specific error types and provide user-friendly messages
  const errorLower = errorMessage.toLowerCase();

  // Insufficient funds error
  if (
    errorLower.includes("debit") ||
    errorLower.includes("credit") ||
    errorLower.includes("insufficient") ||
    errorLower.includes("attempt to debit")
  ) {
    return "Insufficient SOL balance. Please ensure your wallet has enough SOL to pay for transaction fees.";
  }

  // Account already exists / duplicate error
  if (
    errorLower.includes("already in use") ||
    errorLower.includes("accountalreadyinuse") ||
    errorLower.includes("constraintseeds") ||
    errorLower.includes("duplicate") ||
    errorLower.includes("already exists")
  ) {
    return "This resource already exists. Please use a different value.";
  }

  // Network/connection errors
  if (
    errorLower.includes("network") ||
    errorLower.includes("connection") ||
    errorLower.includes("fetch failed") ||
    errorLower.includes("timeout")
  ) {
    return "Network error. Please check your internet connection and try again.";
  }

  // Transaction rejected by user
  if (
    errorLower.includes("rejected") ||
    errorLower.includes("user rejected") ||
    errorLower.includes("user cancelled")
  ) {
    return "Transaction was cancelled. Please try again.";
  }

  // Return the extracted or default error message
  return errorMessage;
};

/**
 * Get the user type based on the wallet address and onchain data
 * @param program - The program instance
 * @param publicKey - The public key of the user
 * @param idNumber - Optional ID number to optimize user lookup
 * @returns The user type
 */
export const getUserType = async (
  program: Program<Landlocked>,
  publicKey: PublicKey,
  idNumber?: string
): Promise<"admin" | "registrar" | "user" | null> => {
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
    const registrarAccount = await program.account.registrar.fetch(registrarPDA).catch(() => null);
    if (registrarAccount && registrarAccount.authority.toString() === publicKey.toString()) {
      return "registrar";
    }

    const userService = new UserService(program);
    const allUsers = await userService.fetchUsers();
    const userAccount = allUsers.find((user) => user.authority.toString() === publicKey.toString());
    if (userAccount) {
      return "user";
    }
    // User doesn't have any account (not admin, registrar, or user)
    return null;
  } catch (error) {
    console.error("Error getting user type:", error);
    return null;
  }
};
