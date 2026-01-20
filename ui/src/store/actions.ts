import { GlobalState, TitleDeed } from "@/utils/interfaces";
import { PayloadAction } from "@reduxjs/toolkit";

export const actions = {
  setTitleDeeds: (state: GlobalState, action: PayloadAction<TitleDeed[]>) => {
    state.titleDeeds = action.payload;
  },
  setLoading: (state: GlobalState, action: PayloadAction<{ key: string; value: boolean }>) => {
    state.loading[action.payload.key] = action.payload.value;
  },
  clearLoading: (state: GlobalState, action: PayloadAction<string>) => {
    delete state.loading[action.payload];
  },
};
