import { createSlice } from "@reduxjs/toolkit";
import { globalState as GlobalState } from "./globalState";
import { actions as GlobalActions } from "./actions";
import { fetchRegistrars, addRegistrar, createUserAccount } from "./thunks";

export const globalSlices = createSlice({
  name: "global",
  initialState: GlobalState,
  reducers: GlobalActions,
  extraReducers: (builder) => {
    builder
      .addCase(fetchRegistrars.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchRegistrars.fulfilled, (state, action) => {
        state.registrars = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchRegistrars.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(addRegistrar.pending, () => {})
      .addCase(addRegistrar.fulfilled, (state, action) => {
        state.registrars.push(action.payload);
      })
      .addCase(addRegistrar.rejected, () => {})
      // add case for createUserAccount
      .addCase(createUserAccount.pending, () => {})
      .addCase(createUserAccount.fulfilled, () => {})
      .addCase(createUserAccount.rejected, () => {});
  },
});

export const globalActions = globalSlices.actions;
export default globalSlices.reducer;
