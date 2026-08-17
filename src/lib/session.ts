import { supabase } from "@/integrations/supabase/client";

const KEY = "lifehub-device-account";

export type DeviceAccount = { email: string; password: string };

export function deviceAccount(): DeviceAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeviceAccount;
    return parsed?.email && parsed?.password ? parsed : null;
  } catch {
    return null;
  }
}

function newAccount(): DeviceAccount {
  const id = crypto.randomUUID();
  return { email: `hub-${id}@lifehub.app`, password: `Lh1!${crypto.randomUUID()}` };
}

let pending: Promise<void> | null = null;

/**
 * App pessoal sem tela de login: garante silenciosamente uma sessão
 * vinculada a este dispositivo (credenciais guardadas localmente).
 */
export function ensureSession() {
  if (typeof window === "undefined") return Promise.resolve();
  if (!pending) {
    pending = run().finally(() => {
      pending = null;
    });
  }
  return pending;
}

async function run() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;

  const saved = deviceAccount();
  if (saved) {
    const { error } = await supabase.auth.signInWithPassword(saved);
    if (!error) return;
  }

  const account = newAccount();
  const { error } = await supabase.auth.signUp({
    email: account.email,
    password: account.password,
    options: { data: { name: "Você" } },
  });
  if (error) throw error;
  localStorage.setItem(KEY, JSON.stringify(account));

  const { data: after } = await supabase.auth.getSession();
  if (!after.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword(account);
    if (signInError) throw signInError;
  }
}
