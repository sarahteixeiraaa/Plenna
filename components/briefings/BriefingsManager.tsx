"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { ArrowIcon, CheckIcon, ClipboardIcon, ClockIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { BriefingRecord, BriefingStatus, createDemoBriefing } from "@/lib/briefing";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { clients as demoClientData } from "@/lib/data";

type ClientOption = {
  id: string;
  name: string;
  segment: string;
  accent: string;
};

type BriefingRow = BriefingRecord & {
  clients: { name: string; segment: string; accent?: string } | null;
};

const statusOptions: Array<"Todos" | BriefingStatus> = ["Todos", "Não iniciado", "Em andamento", "Concluído", "Revisado"];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CL";
}

function normalizeBriefing(value: Record<string, unknown>): BriefingRow {
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
    checklist: (value.checklist as Record<string, boolean>) ?? {},
    onboarding_notes: (value.onboarding_notes as BriefingRecord["onboarding_notes"]) ?? {},
    summary: (value.summary as BriefingRecord["summary"]) ?? {
      objective: "", audience: "", offer: "", ticket_cycle: "", positioning: "", pillars: "", cta: "", next_steps: "",
    },
    completed_at: value.completed_at ? String(value.completed_at) : null,
    created_at: String(value.created_at ?? new Date().toISOString()),
    updated_at: String(value.updated_at ?? new Date().toISOString()),
    clients: clientValue ? {
      name: String(clientValue.name ?? "Cliente"),
      segment: String(clientValue.segment ?? "Não informado"),
      accent: String(clientValue.accent ?? "#7B214B"),
    } : null,
  };
}

function localClients(): ClientOption[] {
  try {
    const raw = window.localStorage.getItem("plenna-demo-clients");
    if (!raw) return demoClientData.map((client, index) => ({ id: `demo-${index + 1}`, name: client.name, segment: client.segment, accent: client.accent }));
    const values = JSON.parse(raw) as Array<Record<string, unknown>>;
    return values.map((value) => ({
      id: String(value.id),
      name: String(value.name ?? "Cliente"),
      segment: String(value.segment ?? "Não informado"),
      accent: String(value.accent ?? "#7B214B"),
    }));
  } catch {
    return [];
  }
}

function localBriefings(clients: ClientOption[]): BriefingRow[] {
  try {
    const raw = window.localStorage.getItem("plenna-demo-briefings");
    if (!raw) return [];
    const values = JSON.parse(raw) as BriefingRecord[];
    return values.map((value) => ({
      ...value,
      clients: clients.find((client) => client.id === value.client_id) ?? null,
    }));
  } catch {
    return [];
  }
}

export default function BriefingsManager() {
  const [briefings, setBriefings] = useState<BriefingRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"Todos" | BriefingStatus>("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("Briefing Estratégico em 5 Pilares");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    async function load() {
      setMessage("");
      if (!isSupabaseConfigured) {
        const localClientRows = localClients();
        setClients(localClientRows);
        setBriefings(localBriefings(localClientRows));
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const [{ data: clientData, error: clientError }, { data: briefingData, error: briefingError }] = await Promise.all([
          supabase.from("clients").select("id,name,segment,accent").order("name"),
          supabase.from("briefings").select("*, clients(name,segment,accent)").order("created_at", { ascending: false }),
        ]);
        if (clientError) throw clientError;
        if (briefingError) throw briefingError;
        setClients((clientData ?? []).map((item) => ({
          id: String(item.id), name: String(item.name), segment: String(item.segment), accent: String(item.accent ?? "#7B214B"),
        })));
        setBriefings((briefingData ?? []).map((item) => normalizeBriefing(item as Record<string, unknown>)));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível carregar os briefings.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const counts = useMemo(() => ({
    total: briefings.length,
    pending: briefings.filter((item) => item.status === "Não iniciado" || item.status === "Em andamento").length,
    completed: briefings.filter((item) => item.status === "Concluído" || item.status === "Revisado").length,
    average: briefings.length ? Math.round(briefings.reduce((sum, item) => sum + item.progress, 0) / briefings.length) : 0,
  }), [briefings]);

  const filtered = useMemo(() => briefings.filter((item) => {
    const matchesStatus = status === "Todos" || item.status === status;
    const search = query.trim().toLowerCase();
    const matchesSearch = !search || item.title.toLowerCase().includes(search) || item.clients?.name.toLowerCase().includes(search) || item.clients?.segment.toLowerCase().includes(search);
    return matchesStatus && matchesSearch;
  }), [briefings, query, status]);

  function openCreate() {
    setClientId(clients[0]?.id ?? "");
    setTitle("Briefing Estratégico em 5 Pilares");
    setMessage("");
    setModalOpen(true);
  }

  async function createBriefing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientId) {
      setMessage("Cadastre ou selecione um cliente antes de criar o briefing.");
      return;
    }
    setSaving(true);
    setMessage("");

    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw userError ?? new Error("Sessão não encontrada.");
        const { data, error } = await supabase
          .from("briefings")
          .insert({ owner_id: userData.user.id, client_id: clientId, title: title.trim() || "Briefing Estratégico" })
          .select("*, clients(name,segment,accent)")
          .single();
        if (error) throw error;
        setBriefings((current) => [normalizeBriefing(data as Record<string, unknown>), ...current]);
      } else {
        const value = createDemoBriefing(clientId, title.trim() || "Briefing Estratégico");
        const next = [value, ...briefings.map(({ clients: _clients, ...item }) => item)];
        window.localStorage.setItem("plenna-demo-briefings", JSON.stringify(next));
        setBriefings((current) => [{ ...value, clients: clients.find((client) => client.id === clientId) ?? null }, ...current]);
      }
      setModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar o briefing.");
    } finally {
      setSaving(false);
    }
  }

  async function copyPublicLink(briefing: BriefingRow) {
    const link = `${window.location.origin}/briefing/${briefing.public_token}`;
    await navigator.clipboard.writeText(link);
    setCopied(briefing.id);
    window.setTimeout(() => setCopied(""), 1800);
  }

  async function deleteBriefing(briefing: BriefingRow) {
    if (!window.confirm(`Excluir o briefing de ${briefing.clients?.name ?? "cliente"}?`)) return;
    setMessage("");
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase.from("briefings").delete().eq("id", briefing.id);
        if (error) throw error;
      } else {
        const next = briefings.filter((item) => item.id !== briefing.id);
        window.localStorage.setItem("plenna-demo-briefings", JSON.stringify(next.map(({ clients: _clients, ...item }) => item)));
      }
      setBriefings((current) => current.filter((item) => item.id !== briefing.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir o briefing.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ESTRATÉGIA"
        title="Briefings e onboarding"
        description="Colete informações, acompanhe o preenchimento e transforme respostas em direção estratégica."
        actionNode={<button className="primary-button" onClick={openCreate}><PlusIcon size={17}/>Criar briefing</button>}
      />

      <section className="briefing-highlight briefing-v12-highlight">
        <div className="highlight-icon"><ClipboardIcon size={30}/></div>
        <div><span>MODELO DE ELITE</span><h2>Briefing Estratégico em 5 Pilares</h2><p>Link público, salvamento automático, onboarding guiado e documento estratégico em um único fluxo.</p></div>
        <button className="light-button" onClick={openCreate}>Usar modelo <ArrowIcon size={16}/></button>
      </section>

      <section className="briefing-stats-grid">
        <article><span>Total</span><strong>{counts.total}</strong><small>briefings criados</small></article>
        <article><span>Pendentes</span><strong>{counts.pending}</strong><small>exigem acompanhamento</small></article>
        <article><span>Concluídos</span><strong>{counts.completed}</strong><small>prontos para diagnóstico</small></article>
        <article><span>Progresso médio</span><strong>{counts.average}%</strong><small>de preenchimento</small></article>
      </section>

      <div className="briefing-toolbar-v12">
        <div className="filter-search"><SearchIcon size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente ou briefing"/></div>
        <div className="briefing-status-filters">{statusOptions.map((option) => <button key={option} className={status === option ? "filter active" : "filter"} onClick={() => setStatus(option)}>{option}</button>)}</div>
      </div>

      {message && <div className="briefing-page-alert">{message}</div>}

      {loading ? <div className="clients-loading">Carregando briefings...</div> : filtered.length === 0 ? (
        <div className="empty-state"><strong>Nenhum briefing encontrado</strong><p>Crie um link de pré-briefing para iniciar o onboarding de um cliente.</p><button className="primary-button" onClick={openCreate}><PlusIcon size={16}/>Criar briefing</button></div>
      ) : (
        <section className="briefing-list briefing-v12-list">{filtered.map((briefing) => {
          const clientName = briefing.clients?.name ?? "Cliente";
          const accent = briefing.clients?.accent ?? "#7B214B";
          const done = briefing.status === "Concluído" || briefing.status === "Revisado";
          return <article key={briefing.id} className="briefing-row briefing-v12-row">
            <div className="client-avatar" style={{ background: accent }}>{initials(clientName)}</div>
            <div className="briefing-info"><strong>{clientName}</strong><span>{briefing.clients?.segment ?? "Não informado"} · {briefing.title}</span></div>
            <div className="briefing-progress"><div><span>Progresso</span><b>{briefing.progress}%</b></div><div className="progress-bar"><i style={{ width: `${briefing.progress}%` }}/></div></div>
            <span className={`brief-state ${done ? "done" : "ongoing"}`}>{done ? <CheckIcon size={14}/> : <ClockIcon size={14}/>} {briefing.status}</span>
            <div className="briefing-row-actions">
              <button className="briefing-copy-button" onClick={() => copyPublicLink(briefing)}>{copied === briefing.id ? "Link copiado" : "Copiar link"}</button>
              <Link className="card-link compact" href={`/briefings/${briefing.id}`}>Abrir <ArrowIcon size={14}/></Link>
              <button className="briefing-delete-button" onClick={() => deleteBriefing(briefing)}>Excluir</button>
            </div>
          </article>;
        })}</section>
      )}

      {modalOpen && <div className="modal-backdrop" onMouseDown={() => !saving && setModalOpen(false)}>
        <section className="client-modal briefing-create-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Criar briefing">
          <div className="modal-header"><div><span className="eyebrow">ONBOARDING PLENNA</span><h2>Novo briefing</h2><p>Crie um link exclusivo para o cliente preencher antes da reunião.</p></div><button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Fechar">×</button></div>
          <form className="briefing-create-form" onSubmit={createBriefing}>
            <label>Cliente<select value={clientId} onChange={(event) => setClientId(event.target.value)} required><option value="">Selecione...</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.segment}</option>)}</select></label>
            <label>Título do briefing<input value={title} onChange={(event) => setTitle(event.target.value)} required/></label>
            {clients.length === 0 && <p className="form-message">Nenhum cliente cadastrado. Cadastre o cliente primeiro na área Clientes.</p>}
            {message && <p className="form-message">{message}</p>}
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button><button type="submit" className="primary-button" disabled={saving || clients.length === 0}>{saving ? "Criando..." : "Criar e gerar link"}</button></div>
          </form>
        </section>
      </div>}
    </>
  );
}
