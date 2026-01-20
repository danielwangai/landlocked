import { GlobalState, TitleDeed, SerializedRegistrar } from "@/utils/interfaces";
import { PayloadAction } from "@reduxjs/toolkit";

export const actions = {
  setTitleDeeds: (state: GlobalState, action: PayloadAction<TitleDeed[]>) => {
    state.titleDeeds = action.payload;
  },
  setRegistrars: (state: GlobalState, action: PayloadAction<SerializedRegistrar[]>) => {
    state.registrars = action.payload;
  },
};
