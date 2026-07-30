"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!isSupabaseConfigured) {
      router.push("/");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const redirect = searchParams.get("redirect") || "/";
      router.replace(redirect);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecovery() {
    if (!email) {
      setMessage("Digite seu e-mail para receber o link de recuperação.");
      return;
    }
    if (!isSupabaseConfigured) {
      setMessage("A recuperação será ativada quando o Supabase for conectado.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/redefinir-senha`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setMessage("Link de recuperação enviado para o seu e-mail.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar o link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>
        E-mail
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="sarah@exemplo.com"
          autoComplete="email"
          required={isSupabaseConfigured}
        />
      </label>
      <label>
        Senha
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Sua senha"
          autoComplete="current-password"
          required={isSupabaseConfigured}
        />
      </label>

      {message && <p className="form-message">{message}</p>}

      <button className="primary-button full login-submit" type="submit" disabled={loading}>
        {loading ? "Entrando..." : isSupabaseConfigured ? "Entrar na Plenna" : "Entrar no modo demonstração"}
      </button>

      {isSupabaseConfigured ? (
        <button className="text-button recovery-button" type="button" onClick={handleRecovery} disabled={loading}>
          Esqueci minha senha
        </button>
      ) : (
        <p className="demo-note">
          O projeto está em modo demonstração. Configure o Supabase para ativar login e banco de dados.
        </p>
      )}

      <Link className="login-back" href="/">Voltar para a apresentação</Link>
    </form>
  );
}
