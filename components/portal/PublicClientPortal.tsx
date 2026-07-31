"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, Dispatch, FormEvent, SetStateAction } from "react";
import { ArrowIcon, CalendarIcon, CheckIcon, ClipboardIcon, CloseIcon, FileIcon, HomeIcon, LayersIcon } from "@/components/icons";
import {
  PublicPortalData,
  PortalTask,
  formatPortalDate,
  portalInitials,
  portalStatusClass,
} from "@/lib/portal";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const tabs = [
  { id: "inicio", label: "Visão geral", icon: HomeIcon },
  { id: "conteudos", label: "Conteúdos", icon: LayersIcon },
  { id: "agenda", label: "Agenda", icon: CalendarIcon },
  { id: "briefing", label: "Briefing", icon: ClipboardIcon },
  { id: "arquivos", label: "Arquivos", icon: FileIcon },
] as const;

type Tab = (typeof tabs)[number]["id"];
type PortalShell = { client_name: string; client_segment: string; client_accent: string; portal_enabled: boolean };

function localPortal(token: string, code: string): PublicPortalData | null {
  try {
    const clientRaw = window.localStorage.getItem("plenna-demo-clients");
    if (!clientRaw) return null;
    const client = (JSON.parse(clientRaw) as Array<Record<string, unknown>>).find((row) => String(row.portal_token) === token);
    if (!client || !client.portal_enabled) return null;
    const savedCode = window.localStorage.getItem(`plenna-demo-portal-code-${token}`);
    if (!savedCode || savedCode !== code) throw new Error("Código de acesso incorreto.");
    const clientId = String(client.id);
    const contentRaw = window.localStorage.getItem("plenna-demo-content-items");
    const eventRaw = window.localStorage.getItem("plenna-demo-calendar-events");
    const briefingRaw = window.localStorage.getItem("plenna-demo-briefings");
    const fileRaw = window.localStorage.getItem("plenna-demo-portal-files");
    const taskRaw = window.localStorage.getItem("plenna-demo-portal-tasks");
    const contents = contentRaw ? (JSON.parse(contentRaw) as Array<Record<string, unknown>>).filter((row) => String(row.client_id) === clientId && ["Aprovação", "Agendado", "Publicado"].includes(String(row.status))) : [];
    const events = eventRaw ? (JSON.parse(eventRaw) as Array<Record<string, unknown>>).filter((row) => String(row.client_id) === clientId && String(row.status) !== "Cancelado") : [];
    const briefings = briefingRaw ? (JSON.parse(briefingRaw) as Array<Record<string, unknown>>).filter((row) => String(row.client_id) === clientId) : [];
    const files = fileRaw ? (JSON.parse(fileRaw) as Array<Record<string, unknown>>).filter((row) => String(row.client_id) === clientId) : [];
    const tasks = taskRaw ? (JSON.parse(taskRaw) as Array<Record<string, unknown>>).filter((row) => String(row.client_id) === clientId) : [];
    return {
      client: { id: clientId, name: String(client.name), segment: String(client.segment ?? ""), accent: String(client.accent ?? "#7B214B"), welcome_message: String(client.portal_welcome_message ?? ""), instagram: String(client.instagram ?? "") },
      contents: contents.map((row) => ({ id: String(row.id), title: String(row.title ?? "Conteúdo"), content_format: String(row.content_format ?? ""), status: String(row.status ?? ""), publication_date: String(row.publication_date ?? ""), publication_time: String(row.publication_time ?? "").slice(0, 5), caption: String(row.caption ?? ""), cta: String(row.cta ?? ""), asset_url: String(row.asset_url ?? ""), approval_token: String(row.approval_token ?? ""), approval_status: String(row.approval_status ?? "Não enviado"), approval_due_date: String(row.approval_due_date ?? "") })),
      events: events.map((row) => ({ id: String(row.id), title: String(row.title ?? "Compromisso"), event_type: String(row.event_type ?? ""), status: String(row.status ?? ""), start_at: String(row.start_at ?? ""), end_at: String(row.end_at ?? ""), location: String(row.location ?? ""), platform: String(row.platform ?? ""), meeting_url: String(row.meeting_url ?? "") })),
      briefings: briefings.map((row) => ({ id: String(row.id), title: String(row.title ?? "Briefing"), status: String(row.status ?? ""), progress: Number(row.progress ?? 0), public_token: String(row.public_token ?? ""), updated_at: String(row.updated_at ?? "") })),
      files: files.map((row) => ({ id: String(row.id), client_id: clientId, name: String(row.name ?? "Arquivo"), category: String(row.category ?? "Geral"), url: String(row.url ?? ""), notes: String(row.notes ?? ""), created_at: String(row.created_at ?? "") })),
      tasks: tasks.map((row) => ({ id: String(row.id), client_id: clientId, title: String(row.title ?? "Pendência"), description: String(row.description ?? ""), due_date: String(row.due_date ?? ""), status: row.status as PortalTask["status"], priority: row.priority as PortalTask["priority"], client_response: String(row.client_response ?? ""), created_at: String(row.created_at ?? ""), updated_at: String(row.updated_at ?? "") })),
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    return null;
  }
}

function normalizePublicData(value: unknown): PublicPortalData {
  const data = value as Record<string, unknown>;
  return {
    client: data.client as PublicPortalData["client"],
    contents: Array.isArray(data.contents) ? data.contents as PublicPortalData["contents"] : [],
    events: Array.isArray(data.events) ? data.events as PublicPortalData["events"] : [],
    briefings: Array.isArray(data.briefings) ? data.briefings as PublicPortalData["briefings"] : [],
    files: Array.isArray(data.files) ? data.files as PublicPortalData["files"] : [],
    tasks: Array.isArray(data.tasks) ? data.tasks as PublicPortalData["tasks"] : [],
  };
}

export default function PublicClientPortal({ token }: { token: string }) {
  const [shell, setShell] = useState<PortalShell | null>(null);
  const [data, setData] = useState<PublicPortalData | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("inicio");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadShell() {
      setLoading(true);
      try {
        if (!isSupabaseConfigured) {
          const raw = window.localStorage.getItem("plenna-demo-clients");
          const client = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>).find((row) => String(row.portal_token) === token) : null;
          if (!client) throw new Error("Portal não encontrado.");
          setShell({ client_name: String(client.name), client_segment: String(client.segment ?? ""), client_accent: String(client.accent ?? "#7B214B"), portal_enabled: Boolean(client.portal_enabled) });
        } else {
          const supabase = createClient();
          const { data: result, error } = await supabase.rpc("get_client_portal_info", { p_token: token });
          if (error) throw error;
          if (!result) throw new Error("Portal não encontrado.");
          setShell(result as PortalShell);
        }
        const remembered = window.sessionStorage.getItem(`plenna-portal-session-${token}`);
        if (remembered) {
          setAccessCode(remembered);
          await authenticate(remembered, false);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível abrir o portal.");
      } finally {
        setLoading(false);
      }
    }
    void loadShell();
    // authenticate is intentionally called only during the initial token load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function authenticate(code = accessCode, showLoading = true) {
    if (!code.trim()) {
      setMessage("Informe o código de acesso.");
      return;
    }
    if (showLoading) setSubmitting(true);
    setMessage("");
    try {
      let result: PublicPortalData | null;
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { data: rpcData, error } = await supabase.rpc("get_client_portal", { p_token: token, p_access_code: code.trim() });
        if (error) throw error;
        result = rpcData ? normalizePublicData(rpcData) : null;
      } else {
        result = localPortal(token, code.trim());
      }
      if (!result) throw new Error("Não foi possível carregar este portal.");
      setData(result);
      setResponses(Object.fromEntries(result.tasks.map((task) => [task.id, task.client_response])));
      window.sessionStorage.setItem(`plenna-portal-session-${token}`, code.trim());
    } catch (error) {
      window.sessionStorage.removeItem(`plenna-portal-session-${token}`);
      setData(null);
      setMessage(error instanceof Error ? error.message : "Código inválido.");
    } finally {
      if (showLoading) setSubmitting(false);
    }
  }

  function logout() {
    window.sessionStorage.removeItem(`plenna-portal-session-${token}`);
    setData(null);
    setAccessCode("");
    setActiveTab("inicio");
  }

  async function updateTask(task: PortalTask, status: PortalTask["status"]) {
    if (!data) return;
    setSubmitting(true);
    setMessage("");
    const response = responses[task.id] ?? "";
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { data: updated, error } = await supabase.rpc("update_client_portal_task", {
          p_token: token,
          p_access_code: accessCode,
          p_task_id: task.id,
          p_status: status,
          p_client_response: response,
        });
        if (error) throw error;
        const row = updated as PortalTask;
        setData((current) => current ? { ...current, tasks: current.tasks.map((item) => item.id === task.id ? row : item) } : current);
      } else {
        const updated = { ...task, status, client_response: response, updated_at: new Date().toISOString() };
        const next = data.tasks.map((item) => item.id === task.id ? updated : item);
        setData({ ...data, tasks: next });
        const allRaw = window.localStorage.getItem("plenna-demo-portal-tasks");
        const all = allRaw ? JSON.parse(allRaw) as PortalTask[] : [];
        window.localStorage.setItem("plenna-demo-portal-tasks", JSON.stringify(all.map((item) => item.id === task.id ? updated : item)));
      }
      setMessage(status === "Concluída" ? "Pendência marcada como concluída." : "Resposta atualizada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a pendência.");
    } finally {
      setSubmitting(false);
    }
  }

  const nextEvents = useMemo(() => data?.events.filter((event) => new Date(event.end_at).getTime() >= Date.now()).slice(0, 4) ?? [], [data]);
  const pendingTasks = useMemo(() => data?.tasks.filter((task) => task.status !== "Concluída") ?? [], [data]);
  const reviewContents = useMemo(() => data?.contents.filter((content) => content.approval_status === "Aguardando" || content.approval_status === "Ajustes solicitados") ?? [], [data]);

  if (loading) return <main className="client-portal-public-v17"><section className="client-portal-loading-v17">Carregando portal...</section></main>;

  if (!shell || !shell.portal_enabled) return <main className="client-portal-public-v17"><section className="client-portal-unavailable-v17"><div className="brand-mark">P<span>•</span></div><h1>Portal indisponível</h1><p>{message || "Este espaço ainda não foi ativado."}</p></section></main>;

  if (!data) return <main className="client-portal-login-v17" style={{ "--portal-accent": shell.client_accent } as CSSProperties}>
    <section className="client-portal-login-brand-v17"><div className="public-portal-logo-v17"><div className="brand-mark">P<span>•</span></div><strong>Plenna</strong></div><div><span>PORTAL DO CLIENTE</span><h1>Tudo o que estamos construindo, em um só lugar.</h1><p>Acompanhe conteúdos, reuniões, briefings, arquivos e próximas ações com clareza.</p></div><small>Plenna · operação criativa de Sarah Teixeira</small></section>
    <section className="client-portal-login-panel-v17"><form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void authenticate(); }}><div className="client-portal-avatar-v17" style={{ background: shell.client_accent }}>{portalInitials(shell.client_name)}</div><span className="eyebrow">ACESSO PRIVADO</span><h2>{shell.client_name}</h2><p>{shell.client_segment}</p><label>Código de acesso<input autoFocus type="password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder="Digite o código enviado pela Sarah"/></label>{message && <p className="client-portal-error-v17">{message}</p>}<button className="primary-button full" disabled={submitting}>{submitting ? "Entrando..." : "Acessar meu portal"}</button></form></section>
  </main>;

  return <main className="client-portal-shell-v17" style={{ "--portal-accent": data.client.accent } as CSSProperties}>
    <aside className="client-portal-sidebar-v17">
      <div className="public-portal-logo-v17"><div className="brand-mark">P<span>•</span></div><div><strong>Plenna</strong><small>portal do cliente</small></div></div>
      <div className="client-portal-account-v17"><div style={{ background: data.client.accent }}>{portalInitials(data.client.name)}</div><strong>{data.client.name}</strong><span>{data.client.segment}</span></div>
      <nav>{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}><Icon size={18}/><span>{label}</span>{id === "conteudos" && reviewContents.length > 0 && <em>{reviewContents.length}</em>}</button>)}</nav>
      <button className="client-portal-logout-v17" onClick={logout}><CloseIcon size={17}/>Sair do portal</button>
    </aside>

    <section className="client-portal-main-v17">
      <header><div><span>PORTAL DO CLIENTE</span><h1>Olá, {data.client.name.split(" ")[0]}!</h1><p>{data.client.welcome_message}</p></div><div className="client-portal-mobile-account-v17" style={{ background: data.client.accent }}>{portalInitials(data.client.name)}</div></header>
      {message && <div className="client-portal-toast-v17">{message}<button onClick={() => setMessage("")}><CloseIcon size={14}/></button></div>}

      {activeTab === "inicio" && <div className="client-portal-overview-v17">
        <section className="client-portal-stats-v17"><article><LayersIcon size={20}/><div><strong>{reviewContents.length}</strong><span>Aguardando sua revisão</span></div></article><article><CalendarIcon size={20}/><div><strong>{nextEvents.length}</strong><span>Próximos compromissos</span></div></article><article><ClipboardIcon size={20}/><div><strong>{pendingTasks.length}</strong><span>Pendências abertas</span></div></article><article><FileIcon size={20}/><div><strong>{data.files.length}</strong><span>Arquivos disponíveis</span></div></article></section>
        <section className="client-portal-overview-grid-v17">
          <article className="client-portal-card-v17"><div className="client-portal-section-title-v17"><div><span>PRÓXIMAS AÇÕES</span><h2>O que precisa da sua atenção</h2></div><button onClick={() => setActiveTab("conteudos")}>Ver conteúdos</button></div>{reviewContents.length === 0 && pendingTasks.length === 0 ? <p className="client-portal-empty-v17">Tudo em dia por aqui.</p> : <div className="client-portal-action-list-v17">{reviewContents.slice(0, 2).map((content) => <a key={content.id} href={`/aprovacao/${content.approval_token}`}><i/><div><strong>Revisar: {content.title}</strong><span>{content.content_format} · prazo {formatPortalDate(content.approval_due_date)}</span></div><ArrowIcon size={16}/></a>)}{pendingTasks.slice(0, 3).map((task) => <button key={task.id} onClick={() => setActiveTab("inicio")}><i className={portalStatusClass(task.priority)}/><div><strong>{task.title}</strong><span>{task.due_date ? `Prazo ${formatPortalDate(task.due_date)}` : "Sem prazo definido"}</span></div><ArrowIcon size={16}/></button>)}</div>}</article>
          <article className="client-portal-card-v17"><div className="client-portal-section-title-v17"><div><span>AGENDA</span><h2>Próximos compromissos</h2></div><button onClick={() => setActiveTab("agenda")}>Ver agenda</button></div>{nextEvents.length === 0 ? <p className="client-portal-empty-v17">Nenhum compromisso próximo.</p> : <div className="client-portal-mini-events-v17">{nextEvents.map((event) => <article key={event.id}><time>{formatPortalDate(event.start_at, true)}</time><div><strong>{event.title}</strong><span>{event.event_type} · {event.platform}</span></div></article>)}</div>}</article>
        </section>
        <section className="client-portal-card-v17 client-portal-tasks-v17"><div className="client-portal-section-title-v17"><div><span>PENDÊNCIAS</span><h2>Materiais e retornos</h2></div></div><TaskList tasks={data.tasks} responses={responses} setResponses={setResponses} updateTask={updateTask} submitting={submitting}/></section>
      </div>}

      {activeTab === "conteudos" && <section className="client-portal-page-v17"><div className="client-portal-page-heading-v17"><span>CALENDÁRIO EDITORIAL</span><h2>Conteúdos</h2><p>Acompanhe o que está em revisão, agendado e publicado.</p></div><div className="client-portal-content-grid-v17">{data.contents.length === 0 && <p className="client-portal-empty-v17">Nenhum conteúdo disponível no momento.</p>}{data.contents.map((content) => <article key={content.id}><header><span>{content.content_format}</span><em className={portalStatusClass(content.approval_status)}>{content.approval_status === "Não enviado" ? content.status : content.approval_status}</em></header><h3>{content.title}</h3><p>{content.caption || "Legenda em preparação."}</p><footer><span>{formatPortalDate(content.publication_date)}{content.publication_time ? ` · ${content.publication_time}` : ""}</span>{content.approval_status !== "Não enviado" && content.approval_token ? <a href={`/aprovacao/${content.approval_token}`}>{content.approval_status === "Aguardando" ? "Revisar agora" : "Ver aprovação"}<ArrowIcon size={14}/></a> : content.asset_url ? <a href={content.asset_url} target="_blank" rel="noreferrer">Abrir material<ArrowIcon size={14}/></a> : null}</footer></article>)}</div></section>}

      {activeTab === "agenda" && <section className="client-portal-page-v17"><div className="client-portal-page-heading-v17"><span>AGENDA COMPARTILHADA</span><h2>Reuniões e gravações</h2><p>Datas relacionadas ao seu projeto.</p></div><div className="client-portal-event-list-v17">{data.events.length === 0 && <p className="client-portal-empty-v17">Nenhum compromisso cadastrado.</p>}{data.events.map((event) => <article key={event.id}><div className="client-portal-event-date-v17"><strong>{new Date(event.start_at).getDate().toString().padStart(2, "0")}</strong><span>{new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(event.start_at)).replace(".", "")}</span></div><div><span>{event.event_type} · {event.status}</span><h3>{event.title}</h3><p>{formatPortalDate(event.start_at, true)} · {event.platform}{event.location ? ` · ${event.location}` : ""}</p></div>{event.meeting_url && <a href={event.meeting_url} target="_blank" rel="noreferrer">Entrar<ArrowIcon size={14}/></a>}</article>)}</div></section>}

      {activeTab === "briefing" && <section className="client-portal-page-v17"><div className="client-portal-page-heading-v17"><span>ESTRATÉGIA</span><h2>Briefing e onboarding</h2><p>Acompanhe o preenchimento das informações estratégicas.</p></div><div className="client-portal-briefing-grid-v17">{data.briefings.length === 0 && <p className="client-portal-empty-v17">Nenhum briefing vinculado.</p>}{data.briefings.map((briefing) => <article key={briefing.id}><div className="client-portal-briefing-progress-v17" style={{ background: `conic-gradient(var(--portal-accent) ${briefing.progress}%, #eadfe3 0)` }}><span>{briefing.progress}%</span></div><div><span>{briefing.status}</span><h3>{briefing.title}</h3><p>Atualizado em {formatPortalDate(briefing.updated_at, true)}</p></div><a href={`/briefing/${briefing.public_token}`}>{briefing.progress < 100 ? "Continuar preenchimento" : "Consultar briefing"}<ArrowIcon size={14}/></a></article>)}</div></section>}

      {activeTab === "arquivos" && <section className="client-portal-page-v17"><div className="client-portal-page-heading-v17"><span>CENTRAL DE ARQUIVOS</span><h2>Materiais compartilhados</h2><p>Links, pastas e documentos organizados pela Sarah.</p></div><div className="client-portal-files-v17">{data.files.length === 0 && <p className="client-portal-empty-v17">Nenhum arquivo disponível.</p>}{data.files.map((file) => <a key={file.id} href={file.url} target="_blank" rel="noreferrer"><span><FileIcon size={20}/></span><div><em>{file.category}</em><strong>{file.name}</strong><p>{file.notes || "Abrir material compartilhado"}</p></div><ArrowIcon size={17}/></a>)}</div></section>}
    </section>

    <nav className="client-portal-bottom-nav-v17">{tabs.slice(0, 5).map(({ id, label, icon: Icon }) => <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}><Icon size={19}/><span>{label}</span></button>)}</nav>
  </main>;
}

function TaskList({ tasks, responses, setResponses, updateTask, submitting }: {
  tasks: PortalTask[];
  responses: Record<string, string>;
  setResponses: Dispatch<SetStateAction<Record<string, string>>>;
  updateTask: (task: PortalTask, status: PortalTask["status"]) => Promise<void>;
  submitting: boolean;
}) {
  if (tasks.length === 0) return <p className="client-portal-empty-v17">Nenhuma pendência aberta.</p>;
  return <div className="client-portal-task-list-v17">{tasks.map((task) => <article key={task.id} className={task.status === "Concluída" ? "done" : ""}><button className="client-portal-task-check-v17" onClick={() => void updateTask(task, task.status === "Concluída" ? "Pendente" : "Concluída")} disabled={submitting}>{task.status === "Concluída" && <CheckIcon size={15}/>}</button><div><span>{task.priority} prioridade{task.due_date ? ` · até ${formatPortalDate(task.due_date)}` : ""}</span><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<textarea rows={2} placeholder="Escreva uma resposta ou cole o link do material" value={responses[task.id] ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [task.id]: event.target.value }))}/><button className="secondary-button" onClick={() => void updateTask(task, task.status === "Concluída" ? "Concluída" : "Em andamento")} disabled={submitting}>Salvar resposta</button></div></article>)}</div>;
}
