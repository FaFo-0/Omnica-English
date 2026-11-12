"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@convex";
import {
  createSubscription,
  currentSubscription,
  getPlatform,
  isStandalone,
  pushSupported,
} from "@/lib/pwa";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

/**
 * This device's push state, kept in step with the server:
 * - a phone whose permission is granted is silently (re)subscribed for the
 *   signed-in member, so an account switch or an expired subscription heals
 *   itself without asking again.
 */
export function usePushDevice() {
  const config = useQuery(api.push.getConfig, {});
  const [permission, setPermission] = useState<PushPermission>("unsupported");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const status = useQuery(api.push.getMyStatus, endpoint ? { endpoint } : {});
  const save = useMutation(api.push.subscribe);
  const remove = useMutation(api.push.unsubscribe);
  const sendTest = useMutation(api.push.sendTestToMe);

  const refresh = useCallback(async () => {
    if (!pushSupported()) {
      setPermission("unsupported");
      setReady(true);
      return;
    }
    setPermission(Notification.permission as PushPermission);
    const sub = await currentSubscription();
    setEndpoint(sub?.endpoint ?? null);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const publicKey = config?.publicKey ?? null;

  const enable = useCallback(async (): Promise<PushPermission> => {
    if (!pushSupported() || !publicKey) return "unsupported";
    setBusy(true);
    try {
      // Must run straight from the tap — iPhone ignores it otherwise.
      const result = (await Notification.requestPermission()) as PushPermission;
      setPermission(result);
      if (result !== "granted") return result;
      const keys = await createSubscription(publicKey);
      await save({ ...keys, platform: getPlatform() });
      setEndpoint(keys.endpoint);
      return "granted";
    } finally {
      setBusy(false);
    }
  }, [publicKey, save]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const sub = await currentSubscription();
      if (sub) {
        await remove({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setEndpoint(null);
    } finally {
      setBusy(false);
    }
  }, [remove]);

  // Self-heal: permission granted but this device isn't on the server for the
  // current member (new account on a shared phone, expired subscription).
  useEffect(() => {
    if (!ready || busy || !publicKey || permission !== "granted" || status === undefined) return;
    if (endpoint && status.thisDevice) return;
    let cancelled = false;
    void (async () => {
      try {
        // Reuses the existing subscription when there is one.
        const keys = await createSubscription(publicKey);
        if (cancelled) return;
        await save({ ...keys, platform: getPlatform() });
        setEndpoint(keys.endpoint);
      } catch (error) {
        console.warn("[push] resubscribe failed", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, busy, publicKey, permission, endpoint, status, save]);

  const platform = getPlatform();
  return {
    ready: ready && config !== undefined,
    configured: !!publicKey,
    supported: permission !== "unsupported",
    permission,
    platform,
    standalone: isStandalone(),
    /** iPhone only gets push inside the Home Screen app. */
    needsInstallForPush: platform === "ios" && !isStandalone(),
    on: permission === "granted" && !!endpoint && !!status?.thisDevice,
    deviceCount: status?.deviceCount ?? 0,
    busy,
    enable,
    disable,
    sendTest: () => sendTest({}),
  };
}
