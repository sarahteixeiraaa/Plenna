"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowIcon, CheckIcon, ClipboardIcon, ClockIcon } from "@/components/icons";
import {
  BriefingRecord,
  BriefingStatus,
  StrategySummary,
  answerLabel,
  briefingSteps,
  buildSuggestedSummary,
  checklistItems,
  emptyChecklist,
  emptyOnboarding,
  emptySummary,
  onboardingSections,
} from "@/lib/briefing";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { clients as demoClientData } from "@/lib/data";

type WorkspaceTab = "respostas" | "onboarding" | "checklist" | "resumo";

function normalizeRecord(value: Record<string, unknown>): BriefingRecord {
  const clientValue = value.clients as Record<string, unknown> | null | undefined;
  return {
    id: String(value.id),
    owner_id: value.owner_id ? String(value.owner_id) : undefined,
    client_id: String(value.client_id),
    title: String(value.title ?? "Briefing Estratégico"),
    status: (value.status as BriefingStatus) ?? "Não iniciado",
    public_token: String(value.public_token),
    current_step: Number(value.current_step ?? 0),
    progress: Number(value.progress ?? 0),
    answers: (value.answers as Record<string, string>) ?? {},
    internal_notes: String(value.internal_notes ?? ""),
    checklist: { ...emptyChecklist(), ...((value.checklist as Record<string, boolean>) ?? {}) },
    onboarding_notes: { ...emptyOnboarding(), ...((value.onboarding_notes as BriefingRecord["onboarding_notes"]) ?? {}) },
    summary: { ...emptySummary, ...((value.summary as StrategySummary) ?? {}) },
    completed_at: value.completed_at ? String(value.completed_at) : null,
    created_at: String(value.created_at ?? new Date().toISOString()),
    updated_at: String(value.updated_at ?? new Date().toISOString()),
    clients: clientValue ? {
      name: String(clientValue.name ?? "Cliente"),
      segment: String(clientValue.segment ?? "Não informado"),
      email: String(clientValue.email ?? ""),
      phone: String(clientValue.phone ?? ""),
      instagram: String(clientValue.instagram ?? ""),
    } : null,
  };
}

function loadLocalBriefing(id: string): BriefingRecord | null {
  try {
    const rawBriefings = window.localStorage.getItem("plenna-demo-briefings");
    const rawClients = window.localStorage.getItem("plenna-demo-clients");
    if (!rawBriefings) return null;
    const briefings = JSON.parse(rawBriefings) as BriefingRecord[];
    const clients = rawClients ? JSON.parse(rawClients) as Array<Record<string, unknown>> : demoClientData.map((client, index) => ({ id: `demo-${index + 1}`, name: client.name, segment: client.segment }));
    const briefing = briefings.find((item) => item.id === id);
    if (!briefing) return null;
    const client = clients.find((item) => String(item.id) === briefing.client_id);
    return normalizeRecord({ ...briefing, clients: client ?? null });
  } catch {
    return null;
  }
}

function persistLocalBriefing(record: BriefingRecord) {
  const raw = window.localStorage.getItem("plenna-demo-briefings");
  const values = raw ? JSON.parse(raw) as BriefingRecord[] : [];
  const stored = { ...record, clients: undefined, updated_at: new Date().toISOString() };
  const next = values.some((item) => item.id === record.id)
    ? values.map((item) => item.id === record.id ? stored : item)
    : [stored, ...values];
  window.localStorage.setItem("plenna-demo-briefings", JSON.stringify(next));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

export default function BriefingWorkspace({ briefingId }: { briefingId: string }) {
  const [briefing, setBriefing] = useState<BriefingRecord | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("respostas");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        if (isSupabaseConfigured) {
          const supabase = createClient();
          const { data, error } = await supabase.from("briefings").select("*, clients(name,segment,email,phone,instagram)").eq("id", briefingId).single();
          if (error) throw error;
          setBriefing(normalizeRecord(data as Record<string, unknown>));
        } else {
          const local = loadLocalBriefing(briefingId);
          if (!local) throw new Error("Briefing não encontrado.");
          setBriefing(local);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível carregar o briefing.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [briefingId]);

  const checklistProgress = useMemo(() => briefing ? Math.round((Object.values(briefing.checklist).filter(Boolean).length / checklistItems.length) * 100) : 0, [briefing]);
  const onboardingProgress = useMemo(() => briefing ? Math.round((Object.values(briefing.onboarding_notes).filter((item) => item.done).length / onboardingSections.length) * 100) : 0, [briefing]);

  async function savePatch(patch: Partial<BriefingRecord>, successMessage = "Alterações salvas.") {
    if (!briefing) return;
    setSaving(true);
    setMessage("");
    const updated = { ...briefing, ...patch, updated_at: new Date().toISOString() };
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const dbPatch: Record<string, unknown> = {};
        if (patch.internal_notes !== undefined) dbPatch.internal_notes = patch.internal_notes;
        if (patch.checklist !== undefined) dbPatch.checklist = patch.checklist;
        if (patch.onboarding_notes !== undefined) dbPatch.onboarding_notes = patch.onboarding_notes;
        if (patch.summary !== undefined) dbPatch.summary = patch.summary;
        if (patch.status !== undefined) dbPatch.status = patch.status;
        const { error } = await supabase.from("briefings").update(dbPatch).eq("id", briefing.id);
        if (error) throw error;
      } else {
        persistLocalBriefing(updated);
      }
      setBriefing(updated);
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!briefing) return;
    await navigator.clipboard.writeText(`${window.location.origin}/briefing/${briefing.public_token}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function updateOnboarding(sectionId: string, patch: { done?: boolean; notes?: string }) {
    if (!briefing) return;
    const current = briefing.onboarding_notes[sectionId] ?? { done: false, notes: "" };
    setBriefing({ ...briefing, onboarding_notes: { ...briefing.onboarding_notes, [sectionId]: { ...current, ...patch } } });
  }

  function updateSummary(field: keyof StrategySummary, value: string) {
    if (!briefing) return;
    setBriefing({ ...briefing, summary: { ...briefing.summary, [field]: value } });
  }

  if (loading) return <div className="clients-loading">Carregando workspace do briefing...</div>;
  if (!briefing) return <div className="empty-state"><strong>Briefing não encontrado</strong><p>{message}</p><Link className="primary-button" href="/briefings">Voltar aos briefings</Link></div>;

  const clientName = briefing.clients?.name ?? "Cliente";
  const isCompleted = briefing.status === "Concluído" || briefing.status === "Revisado";

  return (
    <>
      <div className="workspace-top-actions no-print">
        <Link href="/briefings" className="workspace-back">← Voltar aos briefings</Link>
        <div><button className="secondary-button" onClick={() => void copyLink()}>{copied ? "Link copiado" : "Copiar link público"}</button><button className="primary-button" onClick={() => window.print()}>Gerar documento / PDF</button></div>
      </div>

      <section className="briefing-workspace-hero no-print">
        <div className="workspace-hero-icon"><ClipboardIcon size={29}/></div>
        <div className="workspace-hero-copy"><span>WORKSPACE DE ONBOARDING</span><h1>{clientName}</h1><p>{briefing.title} · {briefing.clients?.segment ?? "Não informado"}</p></div>
        <div className="workspace-hero-metrics"><div><span>Preenchimento</span><strong>{briefing.progress}%</strong></div><div><span>Status</span><strong className={isCompleted ? "done-text" : "pending-text"}>{briefing.status}</strong></div><div><span>Atualizado</span><strong>{formatDate(briefing.updated_at)}</strong></div></div>
      </section>

      <nav className="workspace-tabs no-print">
        <button className={tab === "respostas" ? "active" : ""} onClick={() => setTab("respostas")}>Respostas</button>
        <button className={tab === "onboarding" ? "active" : ""} onClick={() => setTab("onboarding")}>Reunião <em>{onboardingProgress}%</em></button>
        <button className={tab === "checklist" ? "active" : ""} onClick={() => setTab("checklist")}>Checklist <em>{checklistProgress}%</em></button>
        <button className={tab === "resumo" ? "active" : ""} onClick={() => setTab("resumo")}>Resumo estratégico</button>
      </nav>

      {message && <div className={`workspace-message no-print ${message.includes("salv") ? "success" : ""}`}>{message}</div>}

      {tab === "respostas" && <div className="workspace-responses no-print">
        <section className="workspace-main-column">
          {briefingSteps.map((step) => <article className="answer-pillar" key={step.id}><header><span>{step.shortTitle}</span><div><h2>{step.title}</h2><p>{step.description}</p></div></header><div className="answer-list">{step.fields.map((field) => <div key={field.id}><strong>{field.label}</strong><p>{briefing.answers[field.id]?.trim() || <em>Ainda não respondido.</em>}</p></div>)}</div></article>)}
        </section>
        <aside className="workspace-notes-panel"><span className="eyebrow">ANOTAÇÕES INTERNAS</span><h2>Leitura estratégica da Sarah</h2><p>Registre padrões, contradições, oportunidades e pontos que precisam ser aprofundados na reunião.</p><textarea value={briefing.internal_notes} onChange={(event) => setBriefing({ ...briefing, internal_notes: event.target.value })} placeholder="Ex.: O diferencial ainda está genérico. Aprofundar percepção de valor e público empresarial..."/><button className="primary-button full" disabled={saving} onClick={() => void savePatch({ internal_notes: briefing.internal_notes })}>{saving ? "Salvando..." : "Salvar anotações"}</button></aside>
      </div>}

      {tab === "onboarding" && <section className="onboarding-workspace no-print">
        <div className="workspace-section-heading"><div><span className="eyebrow">REUNIÃO DE 45 MINUTOS</span><h2>Roteiro interativo de onboarding</h2><p>Marque as etapas concluídas e registre as decisões tomadas durante a chamada.</p></div><div className="workspace-progress-chip"><strong>{onboardingProgress}%</strong><span>concluído</span></div></div>
        <div className="onboarding-sections">{onboardingSections.map((section, index) => {
          const value = briefing.onboarding_notes[section.id] ?? { done: false, notes: "" };
          return <article key={section.id} className={value.done ? "onboarding-section done" : "onboarding-section"}><div className="onboarding-section-number">{value.done ? <CheckIcon size={18}/> : index + 1}</div><div className="onboarding-section-copy"><div><span>{section.time}</span><h3>{section.title}</h3><p>{section.prompt}</p></div><textarea value={value.notes} onChange={(event) => updateOnboarding(section.id, { notes: event.target.value })} placeholder="Anotações, decisões e próximos passos desta etapa..."/></div><label className="onboarding-check"><input type="checkbox" checked={value.done} onChange={(event) => updateOnboarding(section.id, { done: event.target.checked })}/><span>{value.done ? "Concluída" : "Marcar etapa"}</span></label></article>;
        })}</div>
        <div className="workspace-save-row"><button className="primary-button" disabled={saving} onClick={() => void savePatch({ onboarding_notes: briefing.onboarding_notes }, "Roteiro de onboarding salvo.")}>{saving ? "Salvando..." : "Salvar reunião"}</button></div>
      </section>}

      {tab === "checklist" && <section className="checklist-workspace no-print">
        <div className="workspace-section-heading"><div><span className="eyebrow">MATERIAIS E ACESSOS</span><h2>Checklist de onboarding</h2><p>Acompanhe o que já foi recebido e o que ainda depende do cliente.</p></div><div className="workspace-progress-chip"><strong>{checklistProgress}%</strong><span>organizado</span></div></div>
        <div className="onboarding-checklist-grid">{checklistItems.map((item) => <label key={item.id} className={briefing.checklist[item.id] ? "checked" : ""}><input type="checkbox" checked={Boolean(briefing.checklist[item.id])} onChange={(event) => setBriefing({ ...briefing, checklist: { ...briefing.checklist, [item.id]: event.target.checked } })}/><span><CheckIcon size={16}/></span><div><strong>{item.label}</strong><small>{briefing.checklist[item.id] ? "Recebido e conferido" : "Pendente do cliente"}</small></div></label>)}</div>
        <div className="workspace-save-row"><button className="primary-button" disabled={saving} onClick={() => void savePatch({ checklist: briefing.checklist }, "Checklist salvo.")}>{saving ? "Salvando..." : "Salvar checklist"}</button></div>
      </section>}

      {tab === "resumo" && <section className="summary-workspace no-print">
        <div className="workspace-section-heading"><div><span className="eyebrow">DIAGNÓSTICO EXECUTIVO</span><h2>Resumo estratégico</h2><p>Edite a síntese que será utilizada no documento e no plano inicial.</p></div><button className="secondary-button" onClick={() => setBriefing({ ...briefing, summary: buildSuggestedSummary(briefing.answers) })}>Preencher a partir das respostas</button></div>
        <div className="summary-form-grid">
          <label>Objetivo prioritário<textarea value={briefing.summary.objective} onChange={(event) => updateSummary("objective", event.target.value)}/></label>
          <label>Público prioritário<textarea value={briefing.summary.audience} onChange={(event) => updateSummary("audience", event.target.value)}/></label>
          <label>Oferta e diferencial<textarea value={briefing.summary.offer} onChange={(event) => updateSummary("offer", event.target.value)}/></label>
          <label>Ticket e ciclo de decisão<textarea value={briefing.summary.ticket_cycle} onChange={(event) => updateSummary("ticket_cycle", event.target.value)}/></label>
          <label>Posicionamento e tom de voz<textarea value={briefing.summary.positioning} onChange={(event) => updateSummary("positioning", event.target.value)}/></label>
          <label>Pilares editoriais<textarea value={briefing.summary.pillars} onChange={(event) => updateSummary("pillars", event.target.value)}/></label>
          <label>Chamada para ação principal<textarea value={briefing.summary.cta} onChange={(event) => updateSummary("cta", event.target.value)}/></label>
          <label>Próximos passos<textarea value={briefing.summary.next_steps} onChange={(event) => updateSummary("next_steps", event.target.value)}/></label>
        </div>
        <div className="workspace-save-row"><button className="secondary-button" disabled={saving} onClick={() => void savePatch({ summary: briefing.summary, status: "Revisado" }, "Resumo salvo e briefing marcado como revisado.")}>{saving ? "Salvando..." : "Salvar e marcar como revisado"}</button><button className="primary-button" onClick={() => window.print()}>Gerar documento / PDF</button></div>
      </section>}

      <section className="briefing-print-document">
        <header><div className="print-brand"><div className="public-brand-mark">P<span>•</span></div><div><strong>Plenna</strong><small>Estratégia por Sarah Teixeira</small></div></div><span>DIAGNÓSTICO ESTRATÉGICO</span></header>
        <div className="print-cover"><span>ONBOARDING E POSICIONAMENTO DIGITAL</span><h1>{clientName}</h1><p>{briefing.clients?.segment ?? ""}</p><div><strong>Data</strong><span>{formatDate(new Date().toISOString())}</span></div></div>
        <article className="print-intro"><h2>Visão geral</h2><p>Este documento consolida as informações coletadas no briefing e as decisões estratégicas registradas durante o onboarding. Ele orientará posicionamento, linha editorial, produção e análise dos primeiros ciclos de conteúdo.</p></article>
        {([
          ["Objetivo prioritário", briefing.summary.objective],
          ["Público prioritário", briefing.summary.audience],
          ["Oferta e diferencial", briefing.summary.offer],
          ["Ticket e ciclo de decisão", briefing.summary.ticket_cycle],
          ["Posicionamento e tom de voz", briefing.summary.positioning],
          ["Pilares editoriais", briefing.summary.pillars],
          ["Chamada para ação", briefing.summary.cta],
          ["Próximos passos", briefing.summary.next_steps],
        ] as const).map(([title, value]) => <article className="print-section" key={title}><span>PLENNA</span><h2>{title}</h2><p>{value || "A definir após validação estratégica."}</p></article>)}
        <article className="print-section print-key-data"><span>INFORMAÇÕES-CHAVE DO BRIEFING</span><h2>Base para a estratégia</h2>{briefingSteps.map((step) => <div key={step.id}><h3>{step.title}</h3>{step.fields.filter((field) => briefing.answers[field.id]).map((field) => <section key={field.id}><strong>{answerLabel(field.id)}</strong><p>{briefing.answers[field.id]}</p></section>)}</div>)}</article>
        <footer><strong>Plenna · Sarah Teixeira</strong><span>Sua operação criativa em um só lugar.</span></footer>
      </section>
    </>
  );
}
