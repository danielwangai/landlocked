import { configureStore } from "@reduxjs/toolkit";
import globalSlices from "./globalSlices";

export const store = configureStore({
  reducer: {
    globalStates: globalSlices,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
