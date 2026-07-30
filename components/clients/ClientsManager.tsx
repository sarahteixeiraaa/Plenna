"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { ArrowIcon, MoreIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Client } from "@/lib/data";

type ClientStatus = "Ativo" | "Onboarding" | "Pausado";

type ClientRecord = {
  id: string;
  name: string;
  segment: string;
  contact_name: string;
  email: string;
  phone: string;
  instagram: string;
  status: ClientStatus;
  plan: string;
  monthly_value: number;
  next_action: string;
  progress: number;
  accent: string;
};

type ClientForm = Omit<ClientRecord, "id" | "accent">;

const emptyForm: ClientForm = {
  name: "",
  segment: "",
  contact_name: "",
  email: "",
  phone: "",
  instagram: "",
  status: "Onboarding",
  plan: "",
  monthly_value: 0,
  next_action: "Concluir onboarding",
  progress: 20,
};

const accents = ["#7B214B", "#A34A5E", "#556F54", "#86662D", "#65516F", "#3F6B70"];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CL";
}

function normalizeDemoClients(clients: Client[]): ClientRecord[] {
  return clients.map((client, index) => ({
    id: `demo-${index + 1}`,
    name: client.name,
    segment: client.segment,
    contact_name: "",
    email: "",
    phone: "",
    instagram: "",
    status: client.status,
    plan: "Gestão mensal",
    monthly_value: 0,
    next_action: client.nextAction,
    progress: client.progress,
    accent: client.accent,
  }));
}

function mapDatabaseClient(value: Record<string, unknown>, index = 0): ClientRecord {
  return {
    id: String(value.id),
    name: String(value.name ?? "Cliente"),
    segment: String(value.segment ?? "Não informado"),
    contact_name: String(value.contact_name ?? ""),
    email: String(value.email ?? ""),
    phone: String(value.phone ?? ""),
    instagram: String(value.instagram ?? ""),
    status: (value.status as ClientStatus) ?? "Onboarding",
    plan: String(value.plan ?? ""),
    monthly_value: Number(value.monthly_value ?? 0),
    next_action: String(value.next_action ?? "Definir próxima ação"),
    progress: Number(value.progress ?? 0),
    accent: String(value.accent ?? accents[index % accents.length]),
  };
}

export default function ClientsManager({ demoClients }: { demoClients: Client[] }) {
  const initialClients = useMemo(() => normalizeDemoClients(demoClients), [demoClients]);
  const [clients, setClients] = useState<ClientRecord[]>(initialClients);
  const [filter, setFilter] = useState<"Todos" | ClientStatus>("Todos");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(isSupabaseConfigured);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadClients() {
      if (!isSupabaseConfigured) {
        const saved = window.localStorage.getItem("plenna-demo-clients");
        if (saved) {
          try {
            setClients(JSON.parse(saved) as ClientRecord[]);
          } catch {
            window.localStorage.removeItem("plenna-demo-clients");
          }
        }
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        setClients((data ?? []).map((item, index) => mapDatabaseClient(item as Record<string, unknown>, index)));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível carregar os clientes.");
      } finally {
        setLoadingClients(false);
      }
    }

    void loadClients();
  }, []);

  function persistDemo(nextClients: ClientRecord[]) {
    setClients(nextClients);
    window.localStorage.setItem("plenna-demo-clients", JSON.stringify(nextClients));
  }

  function openNewClient() {
    setEditing(null);
    setForm(emptyForm);
    setMessage("");
    setModalOpen(true);
  }

  function openEditClient(client: ClientRecord) {
    setEditing(client);
    setForm({
      name: client.name,
      segment: client.segment,
      contact_name: client.contact_name,
      email: client.email,
      phone: client.phone,
      instagram: client.instagram,
      status: client.status,
      plan: client.plan,
      monthly_value: client.monthly_value,
      next_action: client.next_action,
      progress: client.progress,
    });
    setMessage("");
    setModalOpen(true);
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    const accent = editing?.accent ?? accents[clients.length % accents.length];
    const payload = {
      ...form,
      name: form.name.trim(),
      segment: form.segment.trim() || "Não informado",
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      instagram: form.instagram.trim(),
      plan: form.plan.trim(),
      next_action: form.next_action.trim() || "Definir próxima ação",
      progress: Math.min(100, Math.max(0, Number(form.progress))),
      monthly_value: Math.max(0, Number(form.monthly_value)),
      accent,
    };

    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        if (editing) {
          const { data, error } = await supabase.from("clients").update(payload).eq("id", editing.id).select().single();
          if (error) throw error;
          const updated = mapDatabaseClient(data as Record<string, unknown>);
          setClients((current) => current.map((client) => client.id === editing.id ? updated : client));
        } else {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) throw userError ?? new Error("Sessão não encontrada.");
          const { data, error } = await supabase.from("clients").insert({ ...payload, owner_id: userData.user.id }).select().single();
          if (error) throw error;
          setClients((current) => [mapDatabaseClient(data as Record<string, unknown>), ...current]);
        }
      } else {
        const nextClient: ClientRecord = editing
          ? { ...editing, ...payload }
          : { id: `local-${Date.now()}`, ...payload };
        const nextClients = editing
          ? clients.map((client) => client.id === editing.id ? nextClient : client)
          : [nextClient, ...clients];
        persistDemo(nextClients);
      }

      setModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o cliente.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteClient(client: ClientRecord) {
    if (!window.confirm(`Excluir ${client.name}? Esta ação não poderá ser desfeita.`)) return;
    setMessage("");

    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase.from("clients").delete().eq("id", client.id);
        if (error) throw error;
        setClients((current) => current.filter((item) => item.id !== client.id));
      } else {
        persistDemo(clients.filter((item) => item.id !== client.id));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir o cliente.");
    }
  }

  const filteredClients = clients.filter((client) => {
    const matchesFilter = filter === "Todos" || client.status === filter;
    const search = query.trim().toLowerCase();
    const matchesSearch = !search || [client.name, client.segment, client.contact_name, client.instagram].some((value) => value.toLowerCase().includes(search));
    return matchesFilter && matchesSearch;
  });

  const counts = {
    Todos: clients.length,
    Ativo: clients.filter((client) => client.status === "Ativo").length,
    Onboarding: clients.filter((client) => client.status === "Onboarding").length,
    Pausado: clients.filter((client) => client.status === "Pausado").length,
  };

  return (
    <>
      <PageHeader
        eyebrow="RELACIONAMENTO"
        title="Clientes"
        description="Acompanhe estratégia, operação e saúde de cada conta."
        actionNode={<button className="primary-button" onClick={openNewClient}><PlusIcon size={17}/>Novo cliente</button>}
      />

      <div className="data-mode-row">
        <span className={`connection-badge ${isSupabaseConfigured ? "connected" : "demo"}`}>
          <i />{isSupabaseConfigured ? "Supabase conectado" : "Modo demonstração · salvo neste navegador"}
        </span>
        {message && <span className="inline-alert">{message}</span>}
      </div>

      <div className="toolbar clients-toolbar">
        <div className="filter-search"><SearchIcon size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente..."/></div>
        {(["Todos", "Ativo", "Onboarding", "Pausado"] as const).map((status) => (
          <button key={status} className={`filter ${filter === status ? "active" : ""}`} onClick={() => setFilter(status)}>{status === "Ativo" ? "Ativos" : status === "Pausado" ? "Pausados" : status} <b>{counts[status]}</b></button>
        ))}
      </div>

      {loadingClients ? (
        <div className="clients-loading">Carregando clientes...</div>
      ) : filteredClients.length === 0 ? (
        <div className="empty-state"><strong>Nenhum cliente encontrado</strong><p>Cadastre uma nova conta ou altere os filtros de busca.</p><button className="primary-button" onClick={openNewClient}><PlusIcon size={16}/>Cadastrar cliente</button></div>
      ) : (
        <section className="clients-grid">{filteredClients.map((client) => <article className="client-card" key={client.id}>
          <div className="client-card-top"><div className="client-avatar large" style={{background: client.accent}}>{initials(client.name)}</div><button className="client-more" type="button" onClick={() => openEditClient(client)} title="Editar cliente"><MoreIcon/></button></div>
          <div><h3>{client.name}</h3><p>{client.segment}{client.contact_name ? ` · ${client.contact_name}` : ""}</p></div>
          <div className="client-status-row"><span className={`status ${client.status.toLowerCase()}`}>{client.status}</span><small>{client.progress}% organizado</small></div>
          <div className="progress-bar"><i style={{width: `${client.progress}%`}}/></div>
          <div className="client-next"><span>PRÓXIMA AÇÃO</span><strong>{client.next_action}</strong></div>
          <div className="client-card-actions"><button className="card-link" onClick={() => openEditClient(client)}>Editar informações <ArrowIcon size={15}/></button><button className="delete-link" onClick={() => deleteClient(client)}>Excluir</button></div>
        </article>)}</section>
      )}

      {modalOpen && <div className="modal-backdrop" onMouseDown={() => !loading && setModalOpen(false)}>
        <section className="client-modal" role="dialog" aria-modal="true" aria-label={editing ? "Editar cliente" : "Novo cliente"} onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-header"><div><span className="eyebrow">CRM PLENNA</span><h2>{editing ? "Editar cliente" : "Novo cliente"}</h2><p>Centralize os dados essenciais da conta.</p></div><button className="modal-close" type="button" onClick={() => setModalOpen(false)} aria-label="Fechar">×</button></div>
          <form className="client-form" onSubmit={saveClient}>
            <label>Nome da marca ou cliente<input value={form.name} onChange={(event) => setForm({...form, name: event.target.value})} required autoFocus /></label>
            <label>Segmento<input value={form.segment} onChange={(event) => setForm({...form, segment: event.target.value})} placeholder="Ex.: Advocacia" /></label>
            <label>Responsável<input value={form.contact_name} onChange={(event) => setForm({...form, contact_name: event.target.value})} /></label>
            <label>Status<select value={form.status} onChange={(event) => setForm({...form, status: event.target.value as ClientStatus})}><option>Ativo</option><option>Onboarding</option><option>Pausado</option></select></label>
            <label>E-mail<input type="email" value={form.email} onChange={(event) => setForm({...form, email: event.target.value})} /></label>
            <label>Telefone<input value={form.phone} onChange={(event) => setForm({...form, phone: event.target.value})} placeholder="(14) 99999-9999" /></label>
            <label>Instagram<input value={form.instagram} onChange={(event) => setForm({...form, instagram: event.target.value})} placeholder="@cliente" /></label>
            <label>Plano contratado<input value={form.plan} onChange={(event) => setForm({...form, plan: event.target.value})} /></label>
            <label>Mensalidade<input type="number" min="0" step="0.01" value={form.monthly_value} onChange={(event) => setForm({...form, monthly_value: Number(event.target.value)})} /></label>
            <label>Organização (%)<input type="number" min="0" max="100" value={form.progress} onChange={(event) => setForm({...form, progress: Number(event.target.value)})} /></label>
            <label className="full-field">Próxima ação<input value={form.next_action} onChange={(event) => setForm({...form, next_action: event.target.value})} /></label>
            {message && <p className="form-message full-field">{message}</p>}
            <div className="modal-actions full-field"><button className="secondary-button" type="button" onClick={() => setModalOpen(false)} disabled={loading}>Cancelar</button><button className="primary-button" type="submit" disabled={loading}>{loading ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar cliente"}</button></div>
          </form>
        </section>
      </div>}
    </>
  );
}
