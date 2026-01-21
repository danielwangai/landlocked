import { createAsyncThunk } from "@reduxjs/toolkit";
import { RegistrarService } from "@/services/blockchain";
import { SerializedRegistrar } from "@/utils/interfaces";
import { PublicKey } from "@solana/web3.js";

export const fetchRegistrars = createAsyncThunk<
  SerializedRegistrar[],
  { registrarService: RegistrarService },
  { rejectValue: string }
>("registrars/fetchRegistrars", async ({ registrarService }, { rejectWithValue }) => {
  try {
    const registrars = await registrarService.getRegistrars();
    // Serialize PublicKey objects to strings
    const serializedRegistrars: SerializedRegistrar[] = registrars.map((registrar) => ({
      ...registrar,
      authority: registrar.authority.toString(),
      addedBy: registrar.addedBy.toString(),
    }));
    return serializedRegistrars;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to fetch registrars");
  }
});

export const addRegistrar = createAsyncThunk<
  SerializedRegistrar,
  {
    registrarService: RegistrarService;
    firstName: string;
    lastName: string;
    idNumber: string;
    walletAddress: string;
    adminAuthority: PublicKey;
  },
  { rejectValue: string }
>(
  "registrars/addRegistrar",
  async (
    { registrarService, firstName, lastName, idNumber, walletAddress, adminAuthority },
    { rejectWithValue }
  ) => {
    try {
      const registrarAuthority = new PublicKey(walletAddress);
      // Add registrar
      await registrarService.addRegistrar(
        firstName,
        lastName,
        idNumber,
        registrarAuthority,
        adminAuthority
      );

      const serializedRegistrar: SerializedRegistrar = {
        firstName,
        lastName,
        idNumber,
        authority: registrarAuthority.toString(),
        addedBy: adminAuthority.toString(),
        isActive: true,
        bump: 0, // We don't know the bump, but it's not critical
      };

      return serializedRegistrar;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to add registrar");
    }
  }
);
