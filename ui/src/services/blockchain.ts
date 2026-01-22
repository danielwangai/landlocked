import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram, TransactionSignature } from "@solana/web3.js";
import { Landlocked } from "../../../target/types/landlocked";
import idl from "../../../target/idl/landlocked.json";
import { ProtocolState, Registrar, TitleDeed, User } from "../utils/interfaces";
import { getClusterURL, NETWORK } from "../utils/constants";
import * as crypto from "crypto";

const RPC_URL: string = getClusterURL(NETWORK);

export const getProvider = (
  publicKey: PublicKey | null,
  signTransaction: any,
  sendTransaction: any
): Program<Landlocked> | null => {
  if (!publicKey || !signTransaction) {
    // Silently return null if wallet is not connected - this is expected behavior
    return null;
  }

  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new AnchorProvider(
    connection,
    { publicKey, signTransaction, sendTransaction } as unknown as Wallet,
    { commitment: "processed" }
  );

  return new Program<Landlocked>(idl as any, provider);
};

export const getProviderReadonly = (): Program<Landlocked> => {
  const connection = new Connection(RPC_URL, "confirmed");
  const walllet = {
    publicKey: PublicKey.default,
    signTransaction: async () => {
      throw new Error("Read-only provider cannot sign transactions.");
    },
    signAllTransaction: async () => {
      throw new Error("Read-only provider cannot sign transactions.");
    },
  };

  const provider = new AnchorProvider(connection, walllet as unknown as Wallet, {
    commitment: "processed",
  });

  return new Program<Landlocked>(idl as any, provider);
};

/**
 * Get the protocol state
 * @param program
 * @returns Promise<ProtocolState>
 */
export const getProtocolState = async (program: Program<Landlocked>): Promise<ProtocolState> => {
  const protocolState = await program.account.protocolState.fetch(
    getProtocolAddress(program.programId)
  );
  return protocolState as ProtocolState;
};

// REGISTRARS
/**
 * RegistrarService - Class-based service for registrar operations
 * Similar to Go/Rust structs with methods
 */
export class RegistrarService {
  private program: Program<Landlocked>;
  private programId: PublicKey;

  constructor(program: Program<Landlocked>) {
    this.program = program;
    this.programId = program.programId;
  }

  /**
   * Get all registrars
   * @returns Promise<Registrar[]>
   */
  async getRegistrars(): Promise<Registrar[]> {
    const registrars = await this.program.account.registrar.all();
    return registrars.map((r) => {
      const account = r.account as any;
      return account as Registrar;
    });
  }

  /**
   * Add a registrar - for admins only
   * @param firstName
   * @param lastName
   * @param idNumber
   * @param registrarAuthority
   * @param adminAuthority
   * @returns Promise<TransactionSignature>
   */
  async addRegistrar(
    firstName: string,
    lastName: string,
    idNumber: string,
    registrarAuthority: PublicKey,
    adminAuthority: PublicKey
  ): Promise<TransactionSignature> {
    const registrarPDA = getRegistrarPDA(registrarAuthority, this.programId);
    const adminPDA = getAdminPDA(adminAuthority, this.programId);
    const protocolStatePDA = getProtocolAddress(this.programId);
    const tx = await this.program.methods
      .addRegistrar(registrarAuthority, firstName, lastName, idNumber)
      .accounts({
        authority: adminAuthority,
        registrar: registrarPDA,
        admin: adminPDA,
        protocolState: protocolStatePDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
    return tx;
  }
}

export class UserService {
  private program: Program<Landlocked>;
  private programId: PublicKey;

  constructor(program: Program<Landlocked>) {
    this.program = program;
    this.programId = program.programId;
  }

  async createUserAccount(
    firstName: string,
    lastName: string,
    idNumber: string,
    phoneNumber: string,
    userAuthority: PublicKey
  ): Promise<TransactionSignature> {
    const userPDA = getUserAddress(idNumber, userAuthority, this.programId);
    const idNumberClaimPDA = getIdNumberClaimPDA(idNumber, this.programId);
    const tx = await this.program.methods
      .createUserAccount(firstName, lastName, idNumber, phoneNumber)
      .accounts({
        authority: userAuthority,
        user: userPDA,
        idNumberClaim: idNumberClaimPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
    return tx;
  }

  async fetchUsers(): Promise<User[]> {
    const users = await this.program.account.user.all();
    return users.map((u) => {
      const account = u.account as any;
      return account as User;
    });
  }
}

export class TitleDeedService {
  private program: Program<Landlocked>;
  private programId: PublicKey;

  constructor(program: Program<Landlocked>) {
    this.program = program;
    this.programId = program.programId;
  }

  /**
   * Fetch all title deeds
   * @returns Promise<TitleDeed[]>
   */
  async fetchTitleDeeds(): Promise<TitleDeed[]> {
    const titleDeeds = await this.program.account.titleDeed.all();
    return titleDeeds.map((t) => {
      const account = t.account as any;
      return {
        owner: {
          firstName: account.owner.firstName || account.owner.first_name,
          lastName: account.owner.lastName || account.owner.last_name,
          idNumber: account.owner.idNumber || account.owner.id_number,
          phoneNumber: account.owner.phoneNumber || account.owner.phone_number,
          authority: account.owner.authority,
        },
        authority: account.authority,
        titleNumber: account.titleNumber || account.title_number,
        location: account.location,
        acreage: account.acreage,
        districtLandRegistry: account.districtLandRegistry || account.district_land_registry,
        registrationDate: account.registrationDate || account.registration_date,
        registryMapsheetNumber: account.registryMapsheetNumber || account.registry_mapsheet_number,
        isForSale: account.isForSale ?? account.is_for_sale ?? false,
        totalTransfers: account.totalTransfers ?? account.total_transfers ?? 0,
      } as TitleDeed;
    });
  }

  /**
   * Assign a title deed to an owner
   * @param registrarAuthority
   * @param newOwnerAddress
   * @param ownerUserPDA
   * @param titleNumber
   * @param location
   * @param acreage
   * @param districtLandRegistry
   * @param registryMapsheetNumber
   * @returns Promise<TransactionSignature>
   */
  async assignTitleDeedToOwner(
    registrarAuthority: PublicKey,
    newOwnerAddress: PublicKey,
    ownerUserPDA: PublicKey,
    titleNumber: string,
    location: string,
    acreage: number,
    districtLandRegistry: string,
    registryMapsheetNumber: number
  ): Promise<TransactionSignature> {
    const registrarPDA = getRegistrarPDA(registrarAuthority, this.programId);
    const titleDeedPDA = getTitleDeedPDA(newOwnerAddress, this.programId);
    const ownershipHistoryPDA = getOwnershipHistoryPDA(titleDeedPDA, 0, this.programId);

    const tx = await this.program.methods
      .assignTitleDeedToOwner(
        newOwnerAddress,
        titleNumber,
        location,
        acreage,
        districtLandRegistry,
        new BN(registryMapsheetNumber)
      )
      .accounts({
        authority: registrarAuthority,
        registrar: registrarPDA,
        titleDeed: titleDeedPDA,
        owner: ownerUserPDA,
        ownershipHistory: ownershipHistoryPDA,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    return tx;
  }
}

// HELPER FUNCTIONS
/**
 * Get the PDA for a registrar
 * @param authority
 * @param programId
 * @returns
 */
export const getRegistrarPDA = (authority: PublicKey, programId: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("registrar"), authority.toBuffer()],
    programId
  )[0];
};

/**
 * Get the PDA for a user
 * @param idNumber
 * @param authority
 * @param programId
 * @returns
 */
export const getUserAddress = (
  idNumber: string,
  authority: PublicKey,
  programId: PublicKey
): PublicKey => {
  const utf8Bytes = Buffer.from(idNumber, "utf-8");
  const hash = crypto.createHash("sha256").update(utf8Bytes).digest();
  const idNumberSeed = new Uint8Array(hash);

  return PublicKey.findProgramAddressSync(
    [Buffer.from("person"), idNumberSeed, authority.toBuffer()],
    programId
  )[0];
};

/**
 * Get the PDA for a id number claim
 * @param idNumber
 * @param programId
 * @returns
 */
export const getIdNumberClaimPDA = (idNumber: string, programId: PublicKey): PublicKey => {
  const utf8Bytes = Buffer.from(idNumber, "utf-8");
  const hash = crypto.createHash("sha256").update(utf8Bytes).digest();
  const idNumberSeed = new Uint8Array(hash);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("id_number_claim"), idNumberSeed],
    programId
  )[0];
};

/**
 * Get the PDA for a title deed
 * @param owner
 * @param programId
 * @returns
 */
export const getTitleDeedPDA = (owner: PublicKey, programId: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("title_deed"), owner.toBuffer()],
    programId
  )[0];
};

/**
 * Get the PDA for a ownership history
 * @param titleDeed
 * @param sequenceNumber
 * @param programId
 * @returns
 */
export const getOwnershipHistoryPDA = (
  titleDeed: PublicKey,
  sequenceNumber: number,
  programId: PublicKey
): PublicKey => {
  const sequenceBuffer = Buffer.allocUnsafe(8);
  sequenceBuffer.writeBigUInt64LE(BigInt(sequenceNumber), 0);

  return PublicKey.findProgramAddressSync(
    [Buffer.from("ownership_history"), titleDeed.toBuffer(), sequenceBuffer],
    programId
  )[0];
};

/**
 * Get the PDA for the protocol state
 * @param programId
 * @returns
 */
export const getProtocolAddress = (programId: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync([Buffer.from("land_registry")], programId)[0];
};

/**
 * Get the PDA for an admin
 * @param authority
 * @param programId
 * @returns
 */
export const getAdminPDA = (authority: PublicKey, programId: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("admin"), authority.toBuffer()],
    programId
  )[0];
};
