import { PublicKey } from "@solana/web3.js";

export interface GlobalState {
  titleDeed: TitleDeed | null;
  titleDeeds: TitleDeed[];
}

export interface ProtocolState {
  admins: PublicKey[];
  isPaused: boolean;
  bump: number;
}

export interface Admin {
  firstName: string;
  lastName: string;
  idNumber: string;
  authority: PublicKey;
  bump: number;
}

export interface Registrar {
  firstName: string;
  lastName: string;
  idNumber: string;
  authority: PublicKey;
  addedBy: PublicKey;
  isActive: boolean;
  bump: number;
}

export interface User {
  firstName: string;
  lastName: string;
  idNumber: string;
  phoneNumber: string;
  authority: PublicKey;
}

export interface TitleDeed {
  owner: User;
  authority: PublicKey;
  titleNumber: string;
  location: string;
  acreage: number;
  districtLandRegistry: string;
  registrationDate: number;
  registryMapsheetNumber: number;
  isForSale: boolean;
  totalTransfers: number;
}
