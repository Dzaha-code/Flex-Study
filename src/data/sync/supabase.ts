import type { RealtimeChannel, Session, SupabaseClient } from "@supabase/supabase-js";
import type { SyncKind, SyncRow } from "@/domain/sync";
import type { RemoteRow, SyncTransport } from "./engine";

/**
 * Everything that talks to Supabase, and nothing else does.
 *
 * The client is imported dynamically: someone who never signs in never
 * downloads it, and the offline app stays exactly as small as it was.
 *
 * Configuration comes from two public build-time variables. The anon key is
 * designed to be shipped to browsers; row-level security on `sync_rows` is
 * what keeps each person's data their own (see supabase/migrations).
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const syncConfigured = (): boolean => URL !== "" && ANON_KEY !== "";

let clientPromise: Promise<SupabaseClient> | null = null;

export function getClient(): Promise<SupabaseClient> {
  if (!syncConfigured()) return Promise.reject(new Error("sync-not-configured"));
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(URL, ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Codes are typed in, never followed as links: nothing to read from the URL.
        detectSessionInUrl: false,
        storageKey: "flexstudy.auth",
      },
      realtime: { params: { eventsPerSecond: 20 } },
    }),
  );
  return clientPromise;
}

/** Step one of signing in: a six-digit code goes to the address. */
export async function sendLoginCode(email: string): Promise<void> {
  const client = await getClient();
  const { error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

/** Step two: the code typed back proves the address. */
export async function verifyLoginCode(email: string, code: string): Promise<Session> {
  const client = await getClient();
  const { data, error } = await client.auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: "email",
  });
  if (error) throw error;
  if (!data.session) throw new Error("no-session");
  return data.session;
}

export async function currentSession(): Promise<Session | null> {
  if (!syncConfigured()) return null;
  const client = await getClient();
  const { data } = await client.auth.getSession();
  return data.session;
}

export async function onSessionChange(listener: (session: Session | null) => void): Promise<() => void> {
  const client = await getClient();
  const { data } = client.auth.onAuthStateChange((_event, session) => listener(session));
  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<void> {
  const client = await getClient();
  await client.auth.signOut();
}

interface DbRow {
  kind: string;
  id: string;
  data: unknown;
  updated_at: string;
  deleted: boolean;
  server_at: string;
}

/**
 * Postgres prints `2026-11-20 10:05:00.123456+00`; the client compares ISO
 * strings. Normalising both clocks here keeps last-write-wins honest.
 */
const iso = (value: string) => new Date(value).toISOString();

function fromDb(row: DbRow): RemoteRow {
  return {
    kind: row.kind as SyncKind,
    id: row.id,
    data: row.deleted ? null : row.data,
    updatedAt: iso(row.updated_at),
    deleted: row.deleted,
    serverAt: iso(row.server_at),
  };
}

const PAGE = 1000;
const PUSH_CHUNK = 500;

export function supabaseTransport(client: SupabaseClient, userId: string): SyncTransport {
  return {
    async pull(since) {
      const rows: RemoteRow[] = [];
      for (let from = 0; ; from += PAGE) {
        let query = client
          .from("sync_rows")
          .select("kind,id,data,updated_at,deleted,server_at")
          .order("server_at", { ascending: true })
          .range(from, from + PAGE - 1);
        if (since) query = query.gt("server_at", since);
        const { data, error } = await query;
        if (error) throw error;
        rows.push(...(data as DbRow[]).map(fromDb));
        if (!data || data.length < PAGE) break;
      }
      return rows;
    },

    async push(rows: SyncRow[]) {
      for (let start = 0; start < rows.length; start += PUSH_CHUNK) {
        const chunk = rows.slice(start, start + PUSH_CHUNK).map((row) => ({
          kind: row.kind,
          id: row.id,
          data: row.deleted ? null : row.data,
          updated_at: row.updatedAt,
          deleted: row.deleted,
        }));
        const { error } = await client.rpc("push_sync_rows", { rows: chunk });
        if (error) throw error;
      }
    },

    subscribe(onRow, onState) {
      const channel: RealtimeChannel = client
        .channel(`sync:${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sync_rows", filter: `user_id=eq.${userId}` },
          (payload) => {
            const row = payload.new as DbRow | undefined;
            if (row && typeof row.kind === "string") onRow(fromDb(row));
          },
        )
        .subscribe((status) => onState(status === "SUBSCRIBED"));
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}
