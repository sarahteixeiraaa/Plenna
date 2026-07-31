"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckIcon, ClockIcon, FileIcon, SparklesIcon } from "@/components/icons";
import {
  PublicApprovalContent,
  approvalStatusClass,
  formatApprovalDate,
  isImageAsset,
  isVideoAsset,
} from "@/lib/approval";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { normalizeContent } from "@/lib/content";

type Decision = "Aprovado" | "Ajustes solicitados";

function loadLocalContent(token: string): PublicApprovalContent | null {
  try {
    const raw = window.localStorage.getItem("plenna-demo-content-items");
    if (!raw) return null;
    const values = JSON.parse(raw) as Array<Record<string, unknown>>;
    const item = values.map(normalizeContent).find((row) => row.approval_token === token);
    if (!item) return null;
    const clientsRaw = window.localStorage.getItem("plenna-demo-clients");
    const client = clientsRaw && item.client_id
      ? (JSON.parse(clientsRaw) as Array<Record<string, unknown>>).find((row) => String(row.id) === item.client_id)
      : null;
    return {
      id: item.id,
      title: item.title,
      content_format: item.content_format,
      caption: item.caption,
      cta: item.cta,
      asset_url: item.asset_url,
      reference_url: item.reference_url,
      publication_date: item.publication_date,
      publication_time: item.publication_time,
      approval_status: item.approval_status,
      approval_due_date: item.approval_due_date,
      approval_requested_at: item.approval_requested_at,
      approval_decided_at: item.approval_decided_at,
      approval_reviewer_name: item.approval_reviewer_name,
      approval_feedback: item.approval_feedback,
      client_name: client ? String(client.name ?? "Cliente Plenna") : "Cliente Plenna",
      client_accent: client ? String(client.accent ?? "#7B214B") : "#7B214B",
    };
  } catch {
    return null;
  }
}

function submitLocalDecision(token: string, decision: Decision, reviewerName: string, feedback: string) {
  const raw = window.localStorage.getItem("plenna-demo-content-items");
  if (!raw) throw new Error("Conteúdo não encontrado.");
  const values = JSON.parse(raw) as Array<Record<string, unknown>>;
  const now = new Date().toISOString();
  let found = false;
  const next = values.map((value) => {
    const item = normalizeContent(value);
    if (item.approval_token !== token) return value;
    found = true;
    return {
      ...value,
      approval_status: decision,
      approval_decided_at: now,
      approval_reviewer_name: reviewerName,
      approval_feedback: feedback,
      status: decision === "Aprovado" ? "Agendado" : "Aprovação",
      updated_at: now,
    };
  });
  if (!found) throw new Error("Conteúdo não encontrado.");
  window.localStorage.setItem("plenna-demo-content-items", JSON.stringify(next));

  const eventsRaw = window.localStorage.getItem("plenna-demo-approval-events");
  const events = eventsRaw ? (JSON.parse(eventsRaw) as Array<Record<string, unknown>>) : [];
  events.unshift({
    id: `local-approval-${Date.now()}`,
    content_item_id: String(next.find((value) => String(value.approval_token) === token)?.id ?? ""),
    action: decision,
    reviewer_name: reviewerName,
    feedback,
    created_at: now,
  });
  window.localStorage.setItem("plenna-demo-approval-events", JSON.stringify(events));
}

function AssetPreview({ content }: { content: PublicApprovalContent }) {
  if (!content.asset_url) {
    return <div className="approval-empty-asset"><SparklesIcon size={28}/><strong>Prévia ainda não anexada</strong><p>A legenda e os detalhes da publicação estão disponíveis abaixo.</p></div>;
  }

  if (isImageAsset(content.asset_url)) {
    // A URL é fornecida pela própria social media no cadastro do conteúdo.
    // eslint-disable-next-line @next/next/no-img-element
    return <a href={content.asset_url} target="_blank" rel="noreferrer" className="approval-media-link"><img src={content.asset_url} alt={`Prévia de ${content.title}`}/></a>;
  }

  if (isVideoAsset(content.asset_url)) {
    return <video className="approval-video" src={content.asset_url} controls preload="metadata"/>;
  }

  return <a className="approval-file-card" href={content.asset_url} target="_blank" rel="noreferrer"><FileIcon size={24}/><div><strong>Abrir arquivo para revisão</strong><span>Canva, Drive, CapCut ou pasta de entrega</span></div></a>;
}

export default function PublicContentApproval({ token }: { token: string }) {
  const [content, setContent] = useState<PublicApprovalContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewerName, setReviewerName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMessage("");
      try {
        if (!isSupabaseConfigured) {
          const local = loadLocalContent(token);
          if (!local) throw new Error("Este link de aprovação não foi encontrado neste navegador.");
          setContent(local);
          return;
        }
        const supabase = createClient();
        const { data, error } = await supabase.rpc("get_public_content_approval", { p_token: token });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw new Error("Link inválido ou conteúdo indisponível.");
        setContent({
          id: String(row.id),
          title: String(row.title ?? "Conteúdo"),
          content_format: String(row.content_format ?? "Conteúdo"),
          caption: String(row.caption ?? ""),
          cta: String(row.cta ?? ""),
          asset_url: String(row.asset_url ?? ""),
          reference_url: String(row.reference_url ?? ""),
          publication_date: String(row.publication_date ?? ""),
          publication_time: String(row.publication_time ?? "").slice(0, 5),
          approval_status: row.approval_status,
          approval_due_date: String(row.approval_due_date ?? ""),
          approval_requested_at: String(row.approval_requested_at ?? ""),
          approval_decided_at: String(row.approval_decided_at ?? ""),
          approval_reviewer_name: String(row.approval_reviewer_name ?? ""),
          approval_feedback: String(row.approval_feedback ?? ""),
          client_name: String(row.client_name ?? "Cliente Plenna"),
          client_accent: String(row.client_accent ?? "#7B214B"),
        });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível abrir a aprovação.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token]);

  const alreadyDecided = useMemo(() => content?.approval_status === "Aprovado" || content?.approval_status === "Ajustes solicitados", [content]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision) {
      setMessage("Escolha aprovar ou solicitar ajustes.");
      return;
    }
    if (!reviewerName.trim()) {
      setMessage("Informe seu nome para registrar a decisão.");
      return;
    }
    if (decision === "Ajustes solicitados" && !feedback.trim()) {
      setMessage("Descreva os ajustes necessários.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase.rpc("submit_content_approval", {
          p_token: token,
          p_action: decision,
          p_reviewer_name: reviewerName.trim(),
          p_feedback: feedback.trim(),
        });
        if (error) throw error;
      } else {
        submitLocalDecision(token, decision, reviewerName.trim(), feedback.trim());
      }
      setContent((current) => current ? {
        ...current,
        approval_status: decision,
        approval_reviewer_name: reviewerName.trim(),
        approval_feedback: feedback.trim(),
        approval_decided_at: new Date().toISOString(),
      } : current);
      setMessage(decision === "Aprovado" ? "Conteúdo aprovado com sucesso." : "Solicitação de ajustes registrada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar sua decisão.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="public-approval-page">
    <header className="public-approval-brand"><div className="brand-mark">P<span>•</span></div><div><strong>Plenna</strong><small>aprovação de conteúdo</small></div></header>
    {loading ? <section className="public-approval-loading">Carregando conteúdo...</section> : !content ? <section className="public-approval-error"><strong>Não foi possível abrir esta aprovação.</strong><p>{message}</p></section> : <div className="public-approval-layout">
      <section className="public-approval-preview">
        <div className="public-approval-heading"><span>REVISÃO DE CONTEÚDO</span><h1>{content.title}</h1><p>{content.client_name} · {content.content_format}</p></div>
        <AssetPreview content={content}/>
        {content.reference_url && <a className="approval-reference-link" href={content.reference_url} target="_blank" rel="noreferrer">Abrir referência utilizada</a>}
      </section>

      <aside className="public-approval-panel">
        <div className="approval-summary-card">
          <div><span className={`approval-status ${approvalStatusClass(content.approval_status)}`}>{content.approval_status}</span></div>
          <dl>
            <div><dt>Publicação</dt><dd>{content.publication_date ? formatApprovalDate(content.publication_date) : "A definir"}{content.publication_time ? ` · ${content.publication_time}` : ""}</dd></div>
            <div><dt>Prazo para retorno</dt><dd>{formatApprovalDate(content.approval_due_date)}</dd></div>
          </dl>
        </div>

        <section className="approval-copy-card"><span>LEGENDA</span><p>{content.caption || "Legenda ainda não preenchida."}</p>{content.cta && <div><strong>Chamada final</strong><p>{content.cta}</p></div>}</section>

        {alreadyDecided ? <section className={`approval-decision-result ${content.approval_status === "Aprovado" ? "approved" : "changes"}`}>
          {content.approval_status === "Aprovado" ? <CheckIcon size={26}/> : <ClockIcon size={26}/>}<div><strong>{content.approval_status}</strong><p>Registrado por {content.approval_reviewer_name || "cliente"}.</p>{content.approval_feedback && <blockquote>{content.approval_feedback}</blockquote>}</div>
        </section> : <form className="public-approval-form" onSubmit={submit}>
          <label>Seu nome<input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} placeholder="Quem está aprovando?"/></label>
          <div className="approval-choice-grid">
            <button type="button" className={decision === "Aprovado" ? "selected approved" : ""} onClick={() => setDecision("Aprovado")}><CheckIcon size={19}/><strong>Aprovar</strong><span>Conteúdo pronto para seguir</span></button>
            <button type="button" className={decision === "Ajustes solicitados" ? "selected changes" : ""} onClick={() => setDecision("Ajustes solicitados")}><ClockIcon size={19}/><strong>Solicitar ajustes</strong><span>Descrever alterações necessárias</span></button>
          </div>
          <label>Comentário ou ajustes<textarea rows={5} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder={decision === "Ajustes solicitados" ? "Explique objetivamente o que precisa ser alterado." : "Comentário opcional."}/></label>
          {message && <p className="approval-form-message">{message}</p>}
          <button className="primary-button full" disabled={submitting}>{submitting ? "Registrando..." : "Confirmar decisão"}</button>
        </form>}
      </aside>
    </div>}
  </main>;
}
