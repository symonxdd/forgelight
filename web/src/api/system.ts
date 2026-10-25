import { useQuery } from "@tanstack/react-query";
import type { ImageStats } from "../stores/session";
import { request } from "./forgelight";

export interface SystemVersions {
  forge: string | null;
  forgelight: string;
  python: string;
  torch: string;
  cuda: string | null;
  windows: string;
}

/** Settings > System, apart from the live values. */
export interface SystemOverview {
  gpu: string | null;
  vramTotal: number | null;
  ramTotal: number;
  /** A notebook, by the case type in the firmware (or a battery when that is missing). */
  portable: boolean;
  versions: SystemVersions;
  storage: { drive: string; free: number; total: number; images: number; models: number; vault: number };
  usage: { total: number; today: number; topModel: { name: string; count: number } | null };
}

export interface SystemLive {
  vram: { used: number; total: number } | null;
  ram: { used: number; total: number };
  gpu: { temperature: number; load: number } | null;
}

// Paused by React Query while the tab is hidden.
const LIVE_INTERVAL_MS = 2000;

export function useSystemOverview(enabled = true) {
  return useQuery({ queryKey: ["system"], queryFn: () => request<SystemOverview>("system"), enabled, staleTime: 0 });
}

/** Memory, temperature and load, asked every two seconds; the top bar meter and Settings share it. */
export function useSystemLive(enabled = true) {
  return useQuery({
    queryKey: ["system-live"],
    queryFn: () => request<SystemLive>("system/live"),
    enabled,
    refetchInterval: LIVE_INTERVAL_MS,
  });
}

/** How long a job took since it started, and the most VRAM in use meanwhile. */
export async function jobStats(startedAt: number, images: number): Promise<ImageStats> {
  const seconds = (Date.now() - startedAt) / 1000;
  try {
    const { peak, total } = await request<{ peak: number | null; total: number | null }>(
      `system/peak?since=${startedAt / 1000}`,
    );
    return { seconds, images, peakVram: peak, totalVram: total };
  } catch {
    return { seconds, images, peakVram: null, totalVram: null };
  }
}
