import { GlobalState, TitleDeed } from "@/utils/interfaces";
import { PayloadAction } from "@reduxjs/toolkit";

export const actions = {
  setTitleDeeds: (state: GlobalState, action: PayloadAction<TitleDeed[]>) => {
    state.titleDeeds = action.payload;
  },
};
