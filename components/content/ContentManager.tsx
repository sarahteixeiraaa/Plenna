"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { CalendarIcon, CloseIcon, MoreIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { clients as demoClientData } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  CONTENT_FORMATS,
  CONTENT_PRIORITIES,
  CONTENT_STATUSES,
  JOURNEY_STAGES,
  ContentClient,
  ContentItem,
  ContentPayload,
  ContentStatus,
  contentDateKey,
  contentMonthGrid,
  contentStatusClass,
  createDemoContents,
  emptyContentPayload,
  formatClass,
  longContentDate,
  normalizeContent,
  parseContentDate,
  priorityClass,
  shortContentDate,
  stripContentRelations,
} from "@/lib/content";

type ViewMode = "Kanban" | "Calendário" | "Lista";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const weekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function localClients(): ContentClient[] {
  try {
    const raw = window.localStorage.getItem("plenna-demo-clients");
    if (!raw) return demoClientData.map((client, index) => ({ id: `demo-${index + 1}`, name: client.name, segment: client.segment, accent: client.accent }));
    const values = JSON.parse(raw) as Array<Record<string, unknown>>;
    return values.map((value) => ({
      id: String(value.id),
      name: String(value.name ?? "Cliente"),
      segment: String(value.segment ?? ""),
      accent: String(value.accent ?? "#7B214B"),
    }));
  } catch {
    return [];
  }
}

function attachClients(items: ContentItem[], clients: ContentClient[]) {
  return items.map((item) => ({
    ...item,
    clients: item.client_id ? clients.find((client) => client.id === item.client_id) ?? null : null,
  }));
}

function contentPayload(item: ContentItem): ContentPayload {
  return {
    client_id: item.client_id,
    title: item.title,
    content_format: item.content_format,
    status: item.status,
    pillar: item.pillar,
    objective: item.objective,
    journey_stage: item.journey_stage,
    hook: item.hook,
    script: item.script,
    caption: item.caption,
    cta: item.cta,
    publication_date: item.publication_date,
    publication_time: item.publication_time,
    reference_url: item.reference_url,
    asset_url: item.asset_url,
    notes: item.notes,
    priority: item.priority,
  };
}

export default function ContentManager() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [clients, setClients] = useState<ContentClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("Todos");
  const [formatFilter, setFormatFilter] = useState("Todos");
  const [view, setView] = useState<ViewMode>("Kanban");
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [form, setForm] = useState<ContentPayload>(emptyContentPayload);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setMessage("");
      if (!isSupabaseConfigured) {
        const clientRows = localClients();
        setClients(clientRows);
        try {
          const raw = window.localStorage.getItem("plenna-demo-content-items");
          const saved = raw ? (JSON.parse(raw) as ContentItem[]) : createDemoContents(clientRows);
          if (!raw) window.localStorage.setItem("plenna-demo-content-items", JSON.stringify(saved.map(stripContentRelations)));
          setItems(attachClients(saved, clientRows));
        } catch {
          setItems(createDemoContents(clientRows));
        }
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const [{ data: clientData, error: clientError }, { data: contentData, error: contentError }] = await Promise.all([
          supabase.from("clients").select("id,name,segment,accent").order("name"),
          supabase.from("content_items").select("*, clients(name,segment,accent)").order("created_at", { ascending: false }),
        ]);
        if (clientError) throw clientError;
        if (contentError) throw contentError;
        setClients((clientData ?? []).map((item) => ({ id: String(item.id), name: String(item.name), segment: String(item.segment ?? ""), accent: String(item.accent ?? "#7B214B") })));
        setItems((contentData ?? []).map((item) => normalizeContent(item as Record<string, unknown>)));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível carregar o planejamento de conteúdo.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function persistLocal(next: ContentItem[]) {
    setItems(next);
    window.localStorage.setItem("plenna-demo-content-items", JSON.stringify(next.map(stripContentRelations)));
  }

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesClient = clientFilter === "Todos" || item.client_id === clientFilter;
      const matchesFormat = formatFilter === "Todos" || item.content_format === formatFilter;
      const matchesSearch = !search || [item.title, item.clients?.name ?? "", item.pillar, item.hook, item.caption].some((value) => value.toLowerCase().includes(search));
      return matchesClient && matchesFormat && matchesSearch;
    });
  }, [items, query, clientFilter, formatFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthItems = items.filter((item) => {
      const date = parseContentDate(item.publication_date);
      return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    return {
      month: monthItems.length,
      production: items.filter((item) => ["Roteiro", "Gravação", "Edição"].includes(item.status)).length,
      approval: items.filter((item) => item.status === "Aprovação").length,
      scheduled: items.filter((item) => item.status === "Agendado").length,
      published: monthItems.filter((item) => item.status === "Publicado").length,
    };
  }, [items]);

  function openCreate(status: ContentStatus = "Ideia", date = "") {
    setEditing(null);
    setForm({ ...emptyContentPayload, status, publication_date: date });
    setMessage("");
    setOpenMenu(null);
    setModalOpen(true);
  }

  function openEdit(item: ContentItem) {
    setEditing(item);
    setForm(contentPayload(item));
    setMessage("");
    setOpenMenu(null);
    setModalOpen(true);
  }

  function linkedClient(clientId: string | null) {
    if (!clientId) return null;
    const client = clients.find((row) => row.id === clientId);
    return client ? { name: client.name, segment: client.segment, accent: client.accent } : null;
  }

  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const payload: ContentPayload = {
      ...form,
      title: form.title.trim(),
      pillar: form.pillar.trim(),
      objective: form.objective.trim(),
      hook: form.hook.trim(),
      script: form.script.trim(),
      caption: form.caption.trim(),
      cta: form.cta.trim(),
      reference_url: form.reference_url.trim(),
      asset_url: form.asset_url.trim(),
      notes: form.notes.trim(),
      publication_time: form.publication_time ? form.publication_time.slice(0, 5) : "",
    };

    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const databasePayload = { ...payload, publication_date: payload.publication_date || null, publication_time: payload.publication_time || null };
        if (editing) {
          const { data, error } = await supabase.from("content_items").update(databasePayload).eq("id", editing.id).select("*, clients(name,segment,accent)").single();
          if (error) throw error;
          const updated = normalizeContent(data as Record<string, unknown>);
          setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
        } else {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) throw userError ?? new Error("Sessão não encontrada.");
          const { data, error } = await supabase.from("content_items").insert({ ...databasePayload, owner_id: userData.user.id }).select("*, clients(name,segment,accent)").single();
          if (error) throw error;
          setItems((current) => [normalizeContent(data as Record<string, unknown>), ...current]);
        }
      } else {
        const now = new Date().toISOString();
        const record: ContentItem = editing
          ? { ...editing, ...payload, updated_at: now, clients: linkedClient(payload.client_id) }
          : { ...payload, id: `local-content-${Date.now()}`, created_at: now, updated_at: now, clients: linkedClient(payload.client_id) };
        const next = editing ? items.map((item) => item.id === editing.id ? record : item) : [record, ...items];
        persistLocal(next);
      }
      setModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o conteúdo.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(item: ContentItem, status: ContentStatus) {
    if (item.status === status) return;
    setMessage("");
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { data, error } = await supabase.from("content_items").update({ status }).eq("id", item.id).select("*, clients(name,segment,accent)").single();
        if (error) throw error;
        const updated = normalizeContent(data as Record<string, unknown>);
        setItems((current) => current.map((row) => row.id === item.id ? updated : row));
      } else {
        persistLocal(items.map((row) => row.id === item.id ? { ...row, status, updated_at: new Date().toISOString() } : row));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível mover o conteúdo.");
    }
  }

  async function deleteContent(item: ContentItem) {
    if (!window.confirm(`Excluir “${item.title}”?`)) return;
    setMessage("");
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase.from("content_items").delete().eq("id", item.id);
        if (error) throw error;
        setItems((current) => current.filter((row) => row.id !== item.id));
      } else {
        persistLocal(items.filter((row) => row.id !== item.id));
      }
      setOpenMenu(null);
      if (editing?.id === item.id) setModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir o conteúdo.");
    }
  }

  async function duplicateContent(item: ContentItem) {
    setMessage("");
    const payload = { ...contentPayload(item), title: `${item.title} — cópia`, status: "Ideia" as ContentStatus, publication_date: "", publication_time: "" };
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw userError ?? new Error("Sessão não encontrada.");
        const { data, error } = await supabase.from("content_items").insert({ ...payload, owner_id: userData.user.id, publication_date: null, publication_time: null }).select("*, clients(name,segment,accent)").single();
        if (error) throw error;
        setItems((current) => [normalizeContent(data as Record<string, unknown>), ...current]);
      } else {
        const now = new Date().toISOString();
        persistLocal([{ ...payload, id: `local-content-${Date.now()}`, created_at: now, updated_at: now, clients: linkedClient(payload.client_id) }, ...items]);
      }
      setOpenMenu(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível duplicar o conteúdo.");
    }
  }

  function dropOnStatus(status: ContentStatus) {
    const item = items.find((row) => row.id === draggingId);
    setDraggingId(null);
    if (item) void updateStatus(item, status);
  }

  const grid = useMemo(() => contentMonthGrid(currentMonth), [currentMonth]);
  const calendarItems = useMemo(() => filteredItems.filter((item) => item.publication_date), [filteredItems]);
  const sortedList = useMemo(() => [...filteredItems].sort((a, b) => {
    if (!a.publication_date && !b.publication_date) return b.created_at.localeCompare(a.created_at);
    if (!a.publication_date) return 1;
    if (!b.publication_date) return -1;
    return `${a.publication_date}${a.publication_time}`.localeCompare(`${b.publication_date}${b.publication_time}`);
  }), [filteredItems]);

  return (
    <>
      <PageHeader eyebrow="PRODUÇÃO" title="Planejamento de conteúdo" description="Organize estratégia, criação, aprovação e publicação em um único fluxo." actionNode={<button className="primary-button" onClick={() => openCreate()}><PlusIcon size={17}/>Novo conteúdo</button>} />

      <div className="data-mode-row">
        <span className={`connection-badge ${isSupabaseConfigured ? "connected" : "demo"}`}><i />{isSupabaseConfigured ? "Supabase conectado" : "Modo demonstração · salvo neste navegador"}</span>
        {message && <span className="inline-alert">{message}</span>}
      </div>

      <section className="content-stats-v14">
        <article><span>CONTEÚDOS NO MÊS</span><strong>{stats.month}</strong><small>Com data de publicação</small></article>
        <article><span>EM PRODUÇÃO</span><strong>{stats.production}</strong><small>Roteiro, gravação e edição</small></article>
        <article><span>AGUARDANDO APROVAÇÃO</span><strong>{stats.approval}</strong><small>Precisam de retorno</small></article>
        <article><span>AGENDADOS</span><strong>{stats.scheduled}</strong><small>Prontos para publicar</small></article>
        <article><span>PUBLICADOS NO MÊS</span><strong>{stats.published}</strong><small>Entregas concluídas</small></article>
      </section>

      <div className="toolbar content-toolbar-v14">
        <div className="filter-search"><SearchIcon size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar título, pilar ou cliente..."/></div>
        <select className="filter-select" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option value="Todos">Todos os clientes</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
        <select className="filter-select" value={formatFilter} onChange={(event) => setFormatFilter(event.target.value)}><option value="Todos">Todos os formatos</option>{CONTENT_FORMATS.map((format) => <option key={format}>{format}</option>)}</select>
        <div className="content-view-switch">{(["Kanban", "Calendário", "Lista"] as ViewMode[]).map((mode) => <button key={mode} className={view === mode ? "active" : ""} onClick={() => setView(mode)}>{mode}</button>)}</div>
      </div>

      {loading ? <div className="clients-loading">Carregando planejamento...</div> : filteredItems.length === 0 ? <div className="empty-state"><strong>Nenhum conteúdo encontrado</strong><p>Crie a primeira pauta ou altere os filtros.</p><button className="primary-button" onClick={() => openCreate()}><PlusIcon size={16}/>Criar conteúdo</button></div> : null}

      {!loading && filteredItems.length > 0 && view === "Kanban" && <section className="content-kanban-v14">
        {CONTENT_STATUSES.map((status) => {
          const statusItems = filteredItems.filter((item) => item.status === status);
          return <div className={`content-column-v14 ${draggingId ? "drag-active" : ""}`} key={status} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOnStatus(status)}>
            <header><span className={`content-status-dot ${contentStatusClass(status)}`}/><strong>{status}</strong><em>{statusItems.length}</em><button onClick={() => openCreate(status)} aria-label={`Adicionar em ${status}`}><PlusIcon size={15}/></button></header>
            <div className="content-column-cards-v14">
              {statusItems.map((item) => <ContentCard key={item.id} item={item} openMenu={openMenu} setOpenMenu={setOpenMenu} onEdit={openEdit} onDelete={deleteContent} onDuplicate={duplicateContent} onDragStart={() => setDraggingId(item.id)} onDragEnd={() => setDraggingId(null)} />)}
              <button className="add-content-card-v14" onClick={() => openCreate(status)}>+ Adicionar conteúdo</button>
            </div>
          </div>;
        })}
      </section>}

      {!loading && view === "Calendário" && <section className="content-calendar-v14">
        <div className="content-calendar-toolbar"><div><span>CALENDÁRIO EDITORIAL</span><h2>{monthFormatter.format(currentMonth)}</h2></div><div><button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>‹</button><button className="today-button" onClick={() => setCurrentMonth(new Date())}>Hoje</button><button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>›</button></div></div>
        <div className="content-calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="content-calendar-grid">{grid.map((date) => {
          const key = contentDateKey(date);
          const dayItems = calendarItems.filter((item) => item.publication_date === key);
          const outside = date.getMonth() !== currentMonth.getMonth();
          const today = key === contentDateKey(new Date());
          return <div key={key} className={`content-calendar-cell ${outside ? "outside" : ""} ${today ? "today" : ""}`} onDoubleClick={() => openCreate("Ideia", key)}>
            <button className="content-day-number" onClick={() => openCreate("Ideia", key)}>{date.getDate()}</button>
            <div>{dayItems.slice(0, 3).map((item) => <button key={item.id} className={`content-calendar-chip ${formatClass(item.content_format)}`} onClick={() => openEdit(item)} title={item.title}><i style={{ background: item.clients?.accent ?? "#7B214B" }}/><span>{item.title}</span></button>)}{dayItems.length > 3 && <em>+{dayItems.length - 3} conteúdo(s)</em>}</div>
          </div>;
        })}</div>
      </section>}

      {!loading && view === "Lista" && <section className="content-list-v14">
        <div className="content-list-head"><span>CONTEÚDO</span><span>CLIENTE</span><span>FORMATO</span><span>STATUS</span><span>PUBLICAÇÃO</span><span /></div>
        {sortedList.map((item) => <article key={item.id} onClick={() => openEdit(item)}>
          <div><strong>{item.title}</strong><small>{item.pillar || "Sem pilar"} · {item.journey_stage}</small></div>
          <span>{item.clients?.name ?? "Sem cliente"}</span>
          <span className={`format-badge ${formatClass(item.content_format)}`}>{item.content_format}</span>
          <span className={`content-status-badge ${contentStatusClass(item.status)}`}>{item.status}</span>
          <span>{shortContentDate(item.publication_date)}{item.publication_time ? ` · ${item.publication_time}` : ""}</span>
          <button onClick={(event) => { event.stopPropagation(); setOpenMenu(openMenu === item.id ? null : item.id); }}><MoreIcon size={17}/></button>
          {openMenu === item.id && <div className="content-card-menu list-menu" onClick={(event) => event.stopPropagation()}><button onClick={() => openEdit(item)}>Editar</button><button onClick={() => void duplicateContent(item)}>Duplicar</button><button className="danger" onClick={() => void deleteContent(item)}>Excluir</button></div>}
        </article>)}
      </section>}

      {modalOpen && <div className="modal-backdrop" onMouseDown={() => !saving && setModalOpen(false)}>
        <section className="content-modal-v14" role="dialog" aria-modal="true" aria-label={editing ? "Editar conteúdo" : "Novo conteúdo"} onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-header"><div><span className="eyebrow">PLANEJAMENTO EDITORIAL</span><h2>{editing ? "Editar conteúdo" : "Novo conteúdo"}</h2><p>Da estratégia à publicação, registre tudo o que a pauta precisa.</p></div><button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Fechar"><CloseIcon size={18}/></button></div>
          <form className="content-form-v14" onSubmit={saveContent}>
            <section><div className="content-form-section-title"><span>01</span><div><strong>Estratégia</strong><small>Cliente, objetivo e papel da pauta.</small></div></div>
              <div className="content-form-grid">
                <label className="full-field">Título do conteúdo<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required autoFocus placeholder="Ex.: 3 erros antes de prestar depoimento"/></label>
                <label>Cliente<select value={form.client_id ?? ""} onChange={(event) => setForm({ ...form, client_id: event.target.value || null })}><option value="">Sem cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
                <label>Formato<select value={form.content_format} onChange={(event) => setForm({ ...form, content_format: event.target.value as ContentPayload["content_format"] })}>{CONTENT_FORMATS.map((format) => <option key={format}>{format}</option>)}</select></label>
                <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ContentStatus })}>{CONTENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label>Prioridade<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as ContentPayload["priority"] })}>{CONTENT_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
                <label>Pilar editorial<input value={form.pillar} onChange={(event) => setForm({ ...form, pillar: event.target.value })} placeholder="Educação, autoridade, oferta..."/></label>
                <label>Etapa da jornada<select value={form.journey_stage} onChange={(event) => setForm({ ...form, journey_stage: event.target.value as ContentPayload["journey_stage"] })}>{JOURNEY_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
                <label className="full-field">Objetivo<textarea rows={2} value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} placeholder="O que este conteúdo deve fazer o público compreender, sentir ou realizar?"/></label>
              </div>
            </section>

            <section><div className="content-form-section-title"><span>02</span><div><strong>Criação</strong><small>Gancho, roteiro, legenda e chamada.</small></div></div>
              <div className="content-form-grid">
                <label className="full-field">Gancho<input value={form.hook} onChange={(event) => setForm({ ...form, hook: event.target.value })} placeholder="Primeira frase ou cena que prende a atenção"/></label>
                <label className="full-field">Roteiro<textarea rows={7} value={form.script} onChange={(event) => setForm({ ...form, script: event.target.value })} placeholder="Estruture cenas, falas, textos na tela e orientações de captação."/></label>
                <label className="full-field">Legenda<textarea rows={5} value={form.caption} onChange={(event) => setForm({ ...form, caption: event.target.value })} placeholder="Escreva ou cole a legenda final."/></label>
                <label className="full-field">CTA<input value={form.cta} onChange={(event) => setForm({ ...form, cta: event.target.value })} placeholder="Ex.: Salve para consultar depois"/></label>
              </div>
            </section>

            <section><div className="content-form-section-title"><span>03</span><div><strong>Publicação e arquivos</strong><small>Data, links e observações operacionais.</small></div></div>
              <div className="content-form-grid">
                <label>Data de publicação<input type="date" value={form.publication_date} onChange={(event) => setForm({ ...form, publication_date: event.target.value })}/></label>
                <label>Horário<input type="time" value={form.publication_time} onChange={(event) => setForm({ ...form, publication_time: event.target.value })}/></label>
                <label className="full-field">Link de referência<input type="url" value={form.reference_url} onChange={(event) => setForm({ ...form, reference_url: event.target.value })} placeholder="Canva, inspiração, notícia ou documento"/></label>
                <label className="full-field">Link do arquivo final<input type="url" value={form.asset_url} onChange={(event) => setForm({ ...form, asset_url: event.target.value })} placeholder="Drive, Canva, CapCut ou pasta de entrega"/></label>
                <label className="full-field">Observações<textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Ajustes do cliente, orientação de design, pendências..."/></label>
              </div>
            </section>

            {message && <p className="form-message">{message}</p>}
            <div className="content-modal-summary"><span className={`content-status-badge ${contentStatusClass(form.status)}`}>{form.status}</span><span>{form.publication_date ? longContentDate(form.publication_date) : "Publicação ainda sem data"}</span></div>
            <div className="content-modal-actions">{editing ? <button type="button" className="danger-button" onClick={() => void deleteContent(editing)} disabled={saving}>Excluir</button> : <span/>}<button type="button" className="secondary-button" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar conteúdo"}</button></div>
          </form>
        </section>
      </div>}
    </>
  );
}

function ContentCard({ item, openMenu, setOpenMenu, onEdit, onDelete, onDuplicate, onDragStart, onDragEnd }: {
  item: ContentItem;
  openMenu: string | null;
  setOpenMenu: (id: string | null) => void;
  onEdit: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => Promise<void>;
  onDuplicate: (item: ContentItem) => Promise<void>;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return <article className="content-card-v14" draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={() => onEdit(item)}>
    <div className="content-card-v14-top"><span className={`format-badge ${formatClass(item.content_format)}`}>{item.content_format}</span><button onClick={(event) => { event.stopPropagation(); setOpenMenu(openMenu === item.id ? null : item.id); }}><MoreIcon size={17}/></button>{openMenu === item.id && <div className="content-card-menu" onClick={(event) => event.stopPropagation()}><button onClick={() => onEdit(item)}>Editar</button><button onClick={() => void onDuplicate(item)}>Duplicar</button><button className="danger" onClick={() => void onDelete(item)}>Excluir</button></div>}</div>
    <h3>{item.title}</h3>
    <p><i style={{ background: item.clients?.accent ?? "#9a8790" }}/>{item.clients?.name ?? "Sem cliente"}</p>
    {item.hook && <blockquote>{item.hook}</blockquote>}
    <div className="content-card-v14-tags"><span>{item.pillar || "Sem pilar"}</span><span>{item.journey_stage}</span></div>
    <footer><small><CalendarIcon size={13}/>{shortContentDate(item.publication_date)}{item.publication_time ? ` · ${item.publication_time}` : ""}</small><em className={priorityClass(item.priority)}>{item.priority}</em></footer>
  </article>;
}
