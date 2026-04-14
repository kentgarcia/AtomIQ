import React, { useEffect } from "react";
import { AppState } from "react-native";
import {
    ensureSupabaseAuthUserId,
    isSupabaseConfigured,
    supabase,
} from "../supabase";
import { useLocalFirst } from "./hooks";

export const LocalFirstSyncBootstrap: React.FC = () => {
  const { isReady, syncManager, syncNow } = useLocalFirst();

  useEffect(() => {
    if (!syncManager || !isReady) {
      return;
    }

    let active = true;

    const bootstrapSync = async () => {
      if (!isSupabaseConfigured()) {
        syncManager.clearSupabaseClient();
        return;
      }

      await ensureSupabaseAuthUserId();
      if (!active) {
        return;
      }

      syncManager.setSupabaseClient(supabase);
      await syncNow();
    };

    void bootstrapSync();

    return () => {
      active = false;
      syncManager.stopAutoSync();
    };
  }, [isReady, syncManager, syncNow]);

  useEffect(() => {
    if (!syncManager) {
      return;
    }

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && syncManager.isEnabled()) {
        syncManager.syncNow().catch((error) => {
          console.warn("Failed to sync on foreground:", error);
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [syncManager]);

  return null;
};

export default LocalFirstSyncBootstrap;
