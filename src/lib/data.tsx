import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, invoke, supabase } from "./supabase";
import type { Command, Lobby, Snapshot } from "./types";
import { useUI } from "../stores/ui";
import { useToast } from "../components/ui/core";
import { errorMessage } from "./utils";
const AuthContext = createContext<{
  session: Session | null;
  loading: boolean;
  recovering: boolean;
  finishRecovery: () => void;
}>({
  session: null,
  loading: true,
  recovering: false,
  finishRecovery: () => {},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(!!supabase),
    [recovering, setRecovering] = useState(false);
  const qc = useQueryClient();
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, value) => {
      if (event === "SIGNED_OUT") {
        qc.clear();
        useUI
          .getState()
          .set({ matchId: null, viewTeam: null, selectedId: null });
      }
      setSession(value);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [qc]);
  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        recovering,
        finishRecovery: () => setRecovering(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
export function useLobby() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["lobby", session?.user.id],
    queryFn: async () => {
      const { data, error } = await client().rpc("game_lobby");
      if (error) throw error;
      return data as Lobby;
    },
    enabled: !!session,
    retry: 1,
  });
}
interface GameContextValue {
  data: Snapshot;
  now: number;
  connection: string;
  command: (
    action: string,
    payload?: Record<string, unknown>,
  ) => Promise<unknown>;
  pending: boolean;
  canAct: boolean;
  refetch: () => void;
}
const GameContext = createContext<GameContextValue | null>(null);
export const useGame = () => {
  const v = useContext(GameContext);
  if (!v) throw new Error("Missing game context");
  return v;
};
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value) ?? "null";
}
export function useCommand(matchId?: string) {
  const qc = useQueryClient(),
    toast = useToast(),
    { session } = useAuth();
  const m = useMutation({
    mutationFn: ({
      intent_key: _,
      ...command
    }: Command & { intent_key: string }) =>
      invoke<{ ok: boolean; id?: string }>(
        "game-command",
        command as unknown as Record<string, unknown>,
      ),
    retry: (count, error) => count < 1 && /fetch|network/i.test(String(error)),
    onSuccess: (_data, variables) => {
      sessionStorage.removeItem(variables.intent_key);
      void qc.invalidateQueries({ queryKey: ["snapshot"] });
      void qc.invalidateQueries({ queryKey: ["lobby"] });
    },
    onError: (e, variables) => {
      if (!/fetch|network|request_failed|non-2xx/i.test(String(e)))
        sessionStorage.removeItem(variables.intent_key);
      toast(errorMessage(e), "error");
    },
  });
  return {
    ...m,
    command: (action: string, payload: Record<string, unknown> = {}) => {
      const key = `game-intent:${session?.user.id}:${matchId ?? "new"}:${action}:${canonical(payload)}`;
      let request = crypto.randomUUID();
      try {
        const prior = JSON.parse(sessionStorage.getItem(key) ?? "null");
        if (prior && Date.now() - prior.created_at < 86400000)
          request = prior.request_id;
      } catch {
        /* expired local intent */
      }
      sessionStorage.setItem(
        key,
        JSON.stringify({ request_id: request, created_at: Date.now() }),
      );
      return m.mutateAsync({
        match_id: matchId,
        action,
        payload,
        request_id: request,
        intent_key: key,
      });
    },
  };
}
export function GameProvider({
  data,
  children,
  refetch,
}: {
  data: Snapshot;
  children: ReactNode;
  refetch: () => void;
}) {
  const qc = useQueryClient(),
    { session } = useAuth(),
    { command, isPending } = useCommand(data.match.id),
    [connection, setConnection] = useState("connecting"),
    [time, setTime] = useState(Date.now());
  const offset = useRef(Date.parse(data.server_time) - Date.now());
  const toast = useToast();
  const lastEvent = useRef(0);
  useEffect(() => {
    offset.current = Date.parse(data.server_time) - Date.now();
  }, [data.server_time]);
  useEffect(() => {
    const t = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!supabase || !session) return;
    const changed = () => {
      void qc.invalidateQueries({
        queryKey: ["snapshot", session.user.id, data.match.id],
      });
    };
    const channel = supabase
      .channel(`game:${data.match.id}:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_events",
          filter: `match_id=eq.${data.match.id}`,
        },
        changed,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${data.match.id}`,
        },
        changed,
      )
      .subscribe((status) => {
        setConnection(
          status === "SUBSCRIBED"
            ? "connected"
            : status === "CHANNEL_ERROR" || status === "TIMED_OUT"
              ? "reconnecting"
              : "connecting",
        );
        if (status === "SUBSCRIBED") changed();
      });
    const online = () => {
      changed();
      setConnection("reconnecting");
    };
    const offline = () => setConnection("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      void supabase?.removeChannel(channel);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [data.match.id, qc, session]);
  useEffect(() => {
    const max = data.events.at(-1)?.seq ?? 0;
    if (
      lastEvent.current &&
      max > lastEvent.current &&
      useUI.getState().notifications
    ) {
      const newest = data.events.at(-1);
      if (newest) toast(newest.title);
      if (useUI.getState().sound) {
        try {
          const ctx = new AudioContext(),
            osc = ctx.createOscillator(),
            gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.value = 0.035;
          osc.frequency.value = 620;
          osc.start();
          osc.stop(ctx.currentTime + 0.12);
          osc.onended = () => void ctx.close();
        } catch {
          /* sound optional */
        }
      }
    }
    lastEvent.current = max;
  }, [data.events, toast]);
  const canAct =
    data.profile.role !== "spectator" &&
    data.membership?.role !== "spectator" &&
    !!data.membership &&
    data.match.status === "running" &&
    !data.rules.maintenance;
  return (
    <GameContext.Provider
      value={{
        data,
        now:
          data.match.status === "paused" && data.match.paused_at
            ? Date.parse(data.match.paused_at)
            : time + offset.current,
        connection,
        command,
        pending: isPending,
        canAct,
        refetch,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
