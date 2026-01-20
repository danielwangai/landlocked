import { createAsyncThunk } from "@reduxjs/toolkit";
import { RegistrarService } from "@/services/blockchain";
import { Registrar, SerializedRegistrar } from "@/utils/interfaces";

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
