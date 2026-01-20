import { createSlice } from "@reduxjs/toolkit";
import { globalState as GlobalState } from "./globalState";
import { actions as GlobalActions } from "./actions";

export const globalSlices = createSlice({
  name: "global",
  initialState: GlobalState,
  reducers: GlobalActions,
});

export const globalActions = globalSlices.actions;
export default globalSlices.reducer;
