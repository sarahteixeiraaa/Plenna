"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("Use uma senha com pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setMessage("As senhas não são iguais.");
      return;
    }
    if (!isSupabaseConfigured) {
      setMessage("O Supabase ainda não está configurado.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.replace("/");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>Nova senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <label>Confirmar senha<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
      {message && <p className="form-message">{message}</p>}
      <button className="primary-button full" type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar nova senha"}</button>
    </form>
  );
}
