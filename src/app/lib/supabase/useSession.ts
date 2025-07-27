"use client";

import { useEffect, useState } from "react";
import { supabase } from "./client";

export function useSession() {
  const supabaseClient = supabase;
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => listener?.subscription.unsubscribe();
  }, [supabaseClient]);

  return { session, loading };
}
