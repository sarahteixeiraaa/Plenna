import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand"><div className="brand-mark">P<span>•</span></div><strong>Plenna</strong></div>
        <div className="login-copy">
          <span>OPERAÇÃO CRIATIVA</span>
          <h1>Organização para criar com mais liberdade.</h1>
          <p>Clientes, briefings, reuniões e conteúdos em uma central feita para Sarah Teixeira.</p>
        </div>
        <small>Plenna · Sua operação criativa em um só lugar.</small>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <span className="eyebrow">BEM-VINDA</span>
          <h2>Acesse seu espaço</h2>
          <p>Entre para acompanhar sua rotina, clientes e produção.</p>
          <Suspense fallback={<div className="login-loading">Carregando...</div>}><LoginForm /></Suspense>
        </div>
      </section>
    </main>
  );
}
