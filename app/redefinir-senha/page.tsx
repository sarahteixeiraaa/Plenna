import ResetPasswordForm from "@/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main className="login-page reset-page">
      <section className="login-panel single-panel">
        <div className="login-card">
          <span className="eyebrow">SEGURANÇA</span>
          <h2>Crie uma nova senha</h2>
          <p>Escolha uma senha forte para continuar usando a Plenna.</p>
          <ResetPasswordForm />
        </div>
      </section>
    </main>
  );
}
