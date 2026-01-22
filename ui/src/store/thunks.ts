import { createAsyncThunk } from "@reduxjs/toolkit";
import { RegistrarService, UserService } from "@/services/blockchain";
import { SerializedRegistrar, SerializedUser } from "@/utils/interfaces";
import { PublicKey } from "@solana/web3.js";
import { extractOnchainErrorMessage } from "@/utils/helpers";

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
    return rejectWithValue(extractOnchainErrorMessage(error, "Failed to fetch registrars"));
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
      return rejectWithValue(extractOnchainErrorMessage(error, "Failed to add registrar"));
    }
  }
);

export const createUserAccount = createAsyncThunk<
  SerializedUser,
  {
    userService: UserService;
    firstName: string;
    lastName: string;
    idNumber: string;
    phoneNumber: string;
    walletAddress: string;
  },
  { rejectValue: string }
>(
  "users/createUserAccount",
  async (
    { userService, firstName, lastName, idNumber, phoneNumber, walletAddress },
    { rejectWithValue }
  ) => {
    try {
      const userAuthority = new PublicKey(walletAddress);
      await userService.createUserAccount(
        firstName,
        lastName,
        idNumber,
        phoneNumber,
        userAuthority
      );

      const serializedUser: SerializedUser = {
        firstName,
        lastName,
        idNumber,
        phoneNumber,
        authority: userAuthority.toString(),
      };

      return serializedUser;
    } catch (error: any) {
      const errorMessage = extractOnchainErrorMessage(error, "Failed to create user account");
      console.error("Create user account thunk error:", error);
      return rejectWithValue(errorMessage);
    }
  }
);

// fetch users
export const fetchUsers = createAsyncThunk<
  SerializedUser[],
  { userService: UserService },
  { rejectValue: string }
>("users/fetchUsers", async ({ userService }, { rejectWithValue }) => {
  try {
    const users = await userService.fetchUsers();
    const serializedUsers: SerializedUser[] = users.map((user) => ({
      ...user,
      authority: user.authority.toString(),
    }));
    return serializedUsers;
  } catch (error: any) {
    return rejectWithValue(extractOnchainErrorMessage(error, "Failed to fetch users"));
  }
});
