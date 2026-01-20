import { useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { globalActions } from "@/store/globalSlices";
import type { RootState, AppDispatch } from "@/store";

export const useLoading = (key: string) => {
  const dispatch = useDispatch<AppDispatch>();
  const isLoading = useSelector<RootState, boolean>((state) =>
    Boolean((state.globalStates as { loading: Record<string, boolean> }).loading[key])
  );

  const setLoading = useCallback(
    (value: boolean) => {
      dispatch(globalActions.setLoading({ key, value }));
    },
    [dispatch, key]
  );

  const startLoading = useCallback(() => {
    dispatch(globalActions.setLoading({ key, value: true }));
  }, [dispatch, key]);

  const stopLoading = useCallback(() => {
    dispatch(globalActions.setLoading({ key, value: false }));
  }, [dispatch, key]);

  return {
    isLoading,
    setLoading,
    startLoading,
    stopLoading,
  };
};
