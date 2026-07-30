"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isSupabaseConfigured) return null;

  async function logout() {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return <button className="logout-button" type="button" onClick={logout} disabled={loading}>{loading ? "..." : "Sair"}</button>;
}
