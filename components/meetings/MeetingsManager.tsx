"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { CalendarIcon, CheckIcon, ClockIcon, PlusIcon, SearchIcon, VideoIcon } from "@/components/icons";
import ScheduleEventModal, { ScheduleEventPayload } from "@/components/calendar/ScheduleEventModal";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { clients as demoClientData } from "@/lib/data";
import {
  ClientOption,
  MeetingAction,
  ScheduleEvent,
  createDemoSchedule,
  dateKey,
  downloadIcs,
  formatDate,
  formatDuration,
  formatTime,
  googleCalendarUrl,
  normalizeScheduleEvent,
} from "@/lib/schedule";

function localClients(): ClientOption[] {
  try {
    const raw = window.localStorage.getItem("plenna-demo-clients");
    if (!raw) return demoClientData.map((client, index) => ({ id: `demo-${index + 1}`, name: client.name, segment: client.segment, accent: client.accent }));
    const values = JSON.parse(raw) as Array<Record<string, unknown>>;
    return values.map((value) => ({
      id: String(value.id), name: String(value.name ?? "Cliente"), segment: String(value.segment ?? ""), accent: String(value.accent ?? "#7B214B"),
    }));
  } catch {
    return [];
  }
}

function attachClients(events: ScheduleEvent[], clients: ClientOption[]) {
  return events.map((event) => ({ ...event, clients: event.client_id ? clients.find((client) => client.id === event.client_id) ?? null : null }));
}

function stripClients(event: ScheduleEvent) {
  const { clients: _clients, owner_id: _ownerId, ...rest } = event;
  return rest;
}

function meetingDateLabel(value: string) {
  const date = new Date(value);
  return { day: String(date.getDate()).padStart(2, "0"), month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "").toUpperCase() };
}

function actionLabel(action: MeetingAction) {
  return [action.owner, action.due_date ? formatDate(`${action.due_date}T12:00:00`) : ""].filter(Boolean).join(" · ");
}

export default function MeetingsManager() {
  const [meetings, setMeetings] = useState<ScheduleEvent[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Próximas" | "Concluídas" | "Todas">("Próximas");
  const [selectedId, setSelectedId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);

  useEffect(() => {
    async function load() {
      setMessage("");
      if (!isSupabaseConfigured) {
        const clientRows = localClients();
        setClients(clientRows);
        try {
          const raw = window.localStorage.getItem("plenna-demo-calendar-events");
          const all = raw ? (JSON.parse(raw) as ScheduleEvent[]) : createDemoSchedule(clientRows);
          if (!raw) window.localStorage.setItem("plenna-demo-calendar-events", JSON.stringify(all.map(stripClients)));
          const rows = attachClients(all, clientRows).filter((event) => event.event_type === "Reunião").sort((a, b) => a.start_at.localeCompare(b.start_at));
          setMeetings(rows);
          setSelectedId(rows[0]?.id ?? "");
        } catch {
          setMeetings([]);
        }
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const [{ data: clientData, error: clientError }, { data: meetingData, error: meetingError }] = await Promise.all([
          supabase.from("clients").select("id,name,segment,accent").order("name"),
          supabase.from("calendar_events").select("*, clients(name,segment,accent)").eq("event_type", "Reunião").order("start_at"),
        ]);
        if (clientError) throw clientError;
        if (meetingError) throw meetingError;
        setClients((clientData ?? []).map((item) => ({ id: String(item.id), name: String(item.name), segment: String(item.segment ?? ""), accent: String(item.accent ?? "#7B214B") })));
        const rows = (meetingData ?? []).map((item) => normalizeScheduleEvent(item as Record<string, unknown>));
        setMeetings(rows);
        setSelectedId(rows[0]?.id ?? "");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível carregar as reuniões.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const now = Date.now();
    return meetings.filter((meeting) => {
      const concluded = meeting.status === "Concluído" || new Date(meeting.end_at).getTime() < now;
      const matchesStatus = statusFilter === "Todas" || (statusFilter === "Concluídas" ? concluded : !concluded && meeting.status !== "Cancelado");
      const matchesSearch = !search || meeting.title.toLowerCase().includes(search) || meeting.clients?.name.toLowerCase().includes(search) || meeting.description.toLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    }).sort((a, b) => statusFilter === "Concluídas" ? b.start_at.localeCompare(a.start_at) : a.start_at.localeCompare(b.start_at));
  }, [meetings, query, statusFilter]);

  const selected = meetings.find((meeting) => meeting.id === selectedId) ?? filtered[0] ?? null;
  const todayKey = dateKey(new Date());
  const counts = useMemo(() => ({
    today: meetings.filter((meeting) => dateKey(meeting.start_at) === todayKey && meeting.status !== "Cancelado").length,
    upcoming: meetings.filter((meeting) => new Date(meeting.end_at).getTime() >= Date.now() && meeting.status !== "Concluído" && meeting.status !== "Cancelado").length,
    concluded: meetings.filter((meeting) => meeting.status === "Concluído").length,
    actions: meetings.reduce((sum, meeting) => sum + meeting.next_steps.filter((action) => !action.done).length, 0),
  }), [meetings, todayKey]);

  function persistLocal(nextMeetings: ScheduleEvent[]) {
    const raw = window.localStorage.getItem("plenna-demo-calendar-events");
    const all = raw ? (JSON.parse(raw) as ScheduleEvent[]) : [];
    const nonMeetings = all.filter((event) => event.event_type !== "Reunião");
    window.localStorage.setItem("plenna-demo-calendar-events", JSON.stringify([...nonMeetings, ...nextMeetings.map(stripClients)]));
    setMeetings(nextMeetings);
  }

  function openCreate() {
    setEditing(null);
    setMessage("");
    setModalOpen(true);
  }

  function openEdit(meeting: ScheduleEvent) {
    setEditing(meeting);
    setMessage("");
    setModalOpen(true);
  }

  async function saveMeeting(payload: ScheduleEventPayload) {
    setSaving(true);
    setMessage("");
    const meetingPayload = { ...payload, event_type: "Reunião" as const };
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        if (editing) {
          const { data, error } = await supabase.from("calendar_events").update(meetingPayload).eq("id", editing.id).select("*, clients(name,segment,accent)").single();
          if (error) throw error;
          const updated = normalizeScheduleEvent(data as Record<string, unknown>);
          setMeetings((current) => current.map((item) => item.id === updated.id ? updated : item));
          setSelectedId(updated.id);
        } else {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) throw userError ?? new Error("Sessão não encontrada.");
          const { data, error } = await supabase.from("calendar_events").insert({ ...meetingPayload, owner_id: userData.user.id }).select("*, clients(name,segment,accent)").single();
          if (error) throw error;
          const created = normalizeScheduleEvent(data as Record<string, unknown>);
          setMeetings((current) => [...current, created].sort((a, b) => a.start_at.localeCompare(b.start_at)));
          setSelectedId(created.id);
        }
      } else {
        const now = new Date().toISOString();
        const client = meetingPayload.client_id ? clients.find((item) => item.id === meetingPayload.client_id) ?? null : null;
        const nextMeeting: ScheduleEvent = editing ? { ...editing, ...meetingPayload, updated_at: now, clients: client } : { ...meetingPayload, id: crypto.randomUUID(), created_at: now, updated_at: now, clients: client };
        const next = editing ? meetings.map((item) => item.id === editing.id ? nextMeeting : item) : [...meetings, nextMeeting];
        persistLocal(next);
        setSelectedId(nextMeeting.id);
      }
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar a reunião.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMeeting(meeting: ScheduleEvent) {
    if (!window.confirm(`Excluir a reunião “${meeting.title}”?`)) return;
    setSaving(true);
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase.from("calendar_events").delete().eq("id", meeting.id);
        if (error) throw error;
        setMeetings((current) => current.filter((item) => item.id !== meeting.id));
      } else {
        persistLocal(meetings.filter((item) => item.id !== meeting.id));
      }
      setSelectedId("");
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir a reunião.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAction(meeting: ScheduleEvent, actionId: string) {
    const nextSteps = meeting.next_steps.map((action) => action.id === actionId ? { ...action, done: !action.done } : action);
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { data, error } = await supabase.from("calendar_events").update({ next_steps: nextSteps }).eq("id", meeting.id).select("*, clients(name,segment,accent)").single();
        if (error) throw error;
        const updated = normalizeScheduleEvent(data as Record<string, unknown>);
        setMeetings((current) => current.map((item) => item.id === meeting.id ? updated : item));
      } else {
        persistLocal(meetings.map((item) => item.id === meeting.id ? { ...item, next_steps: nextSteps, updated_at: new Date().toISOString() } : item));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a tarefa.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ALINHAMENTO"
        title="Reuniões"
        description="Pauta, anotações, decisões e próximos passos conectados ao cliente e à agenda."
        actionNode={<button className="primary-button" onClick={openCreate}><PlusIcon size={17}/>Nova reunião</button>}
      />

      <section className="meeting-stats-v13">
        <article><span>Hoje</span><strong>{counts.today}</strong><small>reuniões agendadas</small></article>
        <article><span>Próximas</span><strong>{counts.upcoming}</strong><small>aguardando realização</small></article>
        <article><span>Concluídas</span><strong>{counts.concluded}</strong><small>com histórico salvo</small></article>
        <article><span>Pendências</span><strong>{counts.actions}</strong><small>próximos passos abertos</small></article>
      </section>

      <section className="meetings-toolbar-v13 panel">
        <div className="filter-search"><SearchIcon size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar reunião ou cliente" /></div>
        <div className="briefing-status-filters">{(["Próximas", "Concluídas", "Todas"] as const).map((option) => <button key={option} className={statusFilter === option ? "filter active" : "filter"} onClick={() => setStatusFilter(option)}>{option}</button>)}</div>
      </section>

      {message && <div className="briefing-page-alert">{message}</div>}

      {loading ? <div className="clients-loading">Carregando reuniões...</div> : (
        <section className="meetings-v13-layout">
          <div className="meeting-list-v13">
            {filtered.length === 0 ? <div className="empty-state"><strong>Nenhuma reunião encontrada</strong><p>Cadastre uma reunião para organizar pauta e decisões.</p><button className="primary-button" onClick={openCreate}><PlusIcon size={16}/>Nova reunião</button></div> : filtered.map((meeting) => {
              const label = meetingDateLabel(meeting.start_at);
              const active = selected?.id === meeting.id;
              return <button key={meeting.id} className={`meeting-card-v13 ${active ? "active" : ""}`} onClick={() => setSelectedId(meeting.id)}>
                <div className="meeting-date-v13"><span>{label.month}</span><strong>{label.day}</strong></div>
                <div className="meeting-copy-v13"><span>{meeting.status}</span><h3>{meeting.title}</h3><p>{meeting.clients?.name ?? "Sem cliente vinculado"}</p><small><ClockIcon size={13}/>{formatTime(meeting.start_at)} · {formatDuration(meeting.start_at, meeting.end_at)} · <VideoIcon size={13}/>{meeting.platform}</small></div>
                <em>{meeting.next_steps.filter((action) => !action.done).length} pendências</em>
              </button>;
            })}
          </div>

          <aside className="panel meeting-workspace-v13">
            {!selected ? <div className="meeting-empty-workspace"><VideoIcon size={32}/><strong>Selecione uma reunião</strong><span>A pauta e o histórico aparecerão aqui.</span></div> : <>
              <div className="meeting-workspace-header"><div><span>{selected.status} · {selected.platform}</span><h2>{selected.title}</h2><p>{selected.clients?.name ?? "Sem cliente vinculado"}</p></div><button className="secondary-button" onClick={() => openEdit(selected)}>Editar reunião</button></div>
              <div className="meeting-meta-v13"><span><CalendarIcon size={14}/>{formatDate(selected.start_at, { weekday: "long", day: "2-digit", month: "long" })}</span><span><ClockIcon size={14}/>{formatTime(selected.start_at)}–{formatTime(selected.end_at)}</span>{selected.location && <span>{selected.location}</span>}</div>
              <div className="meeting-external-actions"><a className="primary-button" href={selected.meeting_url || googleCalendarUrl(selected)} target="_blank" rel="noreferrer"><VideoIcon size={15}/>{selected.meeting_url ? "Entrar na reunião" : "Adicionar ao Google Agenda"}</a>{selected.meeting_url && <a className="outline-button" href={googleCalendarUrl(selected)} target="_blank" rel="noreferrer">Google Agenda</a>}<button className="outline-button" onClick={() => downloadIcs(selected)}>Baixar .ics</button></div>

              <div className="meeting-workspace-grid">
                <section><span className="workspace-label">PAUTA</span>{selected.agenda_items.length ? <ol className="meeting-agenda-list">{selected.agenda_items.map((item, index) => <li key={`${item}-${index}`}><em>{index + 1}</em><span>{item}</span></li>)}</ol> : <p className="workspace-empty">Nenhuma pauta registrada.</p>}</section>
                <section><span className="workspace-label">ANOTAÇÕES</span><p className={selected.notes ? "meeting-notes-copy" : "workspace-empty"}>{selected.notes || "Registre as anotações durante a reunião."}</p></section>
                <section><span className="workspace-label">DECISÕES</span>{selected.decisions.length ? <ul className="meeting-decision-list">{selected.decisions.map((item, index) => <li key={`${item}-${index}`}><CheckIcon size={14}/><span>{item}</span></li>)}</ul> : <p className="workspace-empty">Nenhuma decisão registrada.</p>}</section>
                <section><span className="workspace-label">PRÓXIMOS PASSOS</span>{selected.next_steps.length ? <div className="meeting-actions-list">{selected.next_steps.map((action) => <label key={action.id} className={action.done ? "done" : ""}><input type="checkbox" checked={action.done} onChange={() => toggleAction(selected, action.id)} /><span><strong>{action.text}</strong><small>{actionLabel(action) || "Sem responsável ou prazo"}</small></span></label>)}</div> : <p className="workspace-empty">Nenhuma pendência registrada.</p>}</section>
              </div>
            </>}
          </aside>
        </section>
      )}

      <ScheduleEventModal
        open={modalOpen}
        event={editing}
        clients={clients}
        defaultType="Reunião"
        saving={saving}
        message={message}
        onClose={() => { if (!saving) { setModalOpen(false); setEditing(null); setMessage(""); } }}
        onSave={saveMeeting}
        onDelete={deleteMeeting}
      />
    </>
  );
}
