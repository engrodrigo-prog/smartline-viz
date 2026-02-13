import { useEffect, useMemo, useState } from "react";
import { liveQuery } from "dexie";
import { useQueryClient } from "@tanstack/react-query";
import { vegOfflineDb } from "@/modules/vegetacao/offline/vegOfflineDb";
import { isOnline, syncPendingQueue } from "@/modules/vegetacao/offline/vegOffline";

export function useVegOfflineStatus() {
  const qc = useQueryClient();
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);

  useEffect(() => {
    const obs = liveQuery(() => vegOfflineDb.offline_queue.count());
    const sub = obs.subscribe({
      next: (count) => setPendingCount(count),
      error: () => setPendingCount(0),
    });
    return () => sub.unsubscribe();
  }, []);

  const canSync = online && pendingCount > 0 && !isSyncing;

  const syncNow = useMemo(
    () => async () => {
      if (!online) return;
      setIsSyncing(true);
      setLastError(null);
      try {
        await syncPendingQueue({ maxItems: 100 });
        qc.invalidateQueries({ queryKey: ["veg"] });
      } catch (err: any) {
        setLastError(err?.message ?? String(err));
      } finally {
        setIsSyncing(false);
      }
    },
    [online, qc],
  );

  return { online, pendingCount, isSyncing, lastError, canSync, syncNow };
}

export default useVegOfflineStatus;

