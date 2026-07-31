"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { CalendarIcon, CheckIcon, ClockIcon, PlusIcon, SearchIcon, VideoIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { clients as demoClientData } from "@/lib/data";
import {
  ClientOption,
  ScheduleEvent,
  ScheduleEventType,
  createDemoSchedule,
  dateKey,
  downloadIcs,
  eventTypeClass,
  formatDate,
  formatDuration,
  formatTime,
  googleCalendarUrl,
  isSameDay,
  monthGrid,
  normalizeScheduleEvent,
} from "@/lib/schedule";
import ScheduleEventModal, { ScheduleEventPayload } from "./ScheduleEventModal";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
const types: Array<"Todos" | ScheduleEventType> = ["Todos", "Reunião", "Gravação", "Evento", "Prazo", "Interno"];

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

function attachLocalClients(events: ScheduleEvent[], clients: ClientOption[]) {
  return events.map((event) => ({
    ...event,
    clients: event.client_id ? clients.find((client) => client.id === event.client_id) ?? null : null,
  }));
}

function stripClients(event: ScheduleEvent) {
  const { clients: _clients, owner_id: _ownerId, ...rest } = event;
  return rest;
}

export default function AgendaManager() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState<"Mês" | "Lista">("Mês");
  const [typeFilter, setTypeFilter] = useState<"Todos" | ScheduleEventType>("Todos");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const [defaultType, setDefaultType] = useState<ScheduleEventType>("Reunião");

  useEffect(() => {
    async function load() {
      setMessage("");
      if (!isSupabaseConfigured) {
        const clientRows = localClients();
        setClients(clientRows);
        try {
          const raw = window.localStorage.getItem("plenna-demo-calendar-events");
          const saved = raw ? (JSON.parse(raw) as ScheduleEvent[]) : createDemoSchedule(clientRows);
          if (!raw) window.localStorage.setItem("plenna-demo-calendar-events", JSON.stringify(saved.map(stripClients)));
          setEvents(attachLocalClients(saved, clientRows));
        } catch {
          const demo = createDemoSchedule(clientRows);
          setEvents(demo);
        }
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const [{ data: clientData, error: clientError }, { data: eventData, error: eventError }] = await Promise.all([
          supabase.from("clients").select("id,name,segment,accent").order("name"),
          supabase.from("calendar_events").select("*, clients(name,segment,accent)").order("start_at"),
        ]);
        if (clientError) throw clientError;
        if (eventError) throw eventError;
        setClients((clientData ?? []).map((item) => ({
          id: String(item.id), name: String(item.name), segment: String(item.segment ?? ""), accent: String(item.accent ?? "#7B214B"),
        })));
        setEvents((eventData ?? []).map((item) => normalizeScheduleEvent(item as Record<string, unknown>)));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível carregar a agenda.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filteredEvents = useMemo(() => {
    const search = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesType = typeFilter === "Todos" || event.event_type === typeFilter;
      const matchesSearch = !search || event.title.toLowerCase().includes(search) || event.clients?.name.toLowerCase().includes(search) || event.location.toLowerCase().includes(search);
      return matchesType && matchesSearch;
    });
  }, [events, typeFilter, query]);

  const grid = useMemo(() => monthGrid(currentMonth), [currentMonth]);
  const dayEvents = useMemo(() => filteredEvents.filter((event) => isSameDay(event.start_at, selectedDate)).sort((a, b) => a.start_at.localeCompare(b.start_at)), [filteredEvents, selectedDate]);
  const upcomingEvents = useMemo(() => filteredEvents.filter((event) => new Date(event.end_at).getTime() >= Date.now() && event.status !== "Cancelado").sort((a, b) => a.start_at.localeCompare(b.start_at)), [filteredEvents]);

  function persistLocal(next: ScheduleEvent[]) {
    setEvents(next);
    window.localStorage.setItem("plenna-demo-calendar-events", JSON.stringify(next.map(stripClients)));
  }

  function openCreate(date = selectedDate, eventType: ScheduleEventType = "Reunião") {
    setEditing(null);
    setDefaultType(eventType);
    setSelectedDate(date);
    setMessage("");
    setModalOpen(true);
  }

  function openEdit(event: ScheduleEvent) {
    setEditing(event);
    setDefaultType(event.event_type);
    setMessage("");
    setModalOpen(true);
  }

  async function saveEvent(payload: ScheduleEventPayload) {
    setSaving(true);
    setMessage("");
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        if (editing) {
          const { data, error } = await supabase.from("calendar_events").update(payload).eq("id", editing.id).select("*, clients(name,segment,accent)").single();
          if (error) throw error;
          const updated = normalizeScheduleEvent(data as Record<string, unknown>);
          setEvents((current) => current.map((item) => item.id === updated.id ? updated : item));
        } else {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) throw userError ?? new Error("Sessão não encontrada.");
          const { data, error } = await supabase.from("calendar_events").insert({ ...payload, owner_id: userData.user.id }).select("*, clients(name,segment,accent)").single();
          if (error) throw error;
          setEvents((current) => [...current, normalizeScheduleEvent(data as Record<string, unknown>)]);
        }
      } else {
        const now = new Date().toISOString();
        const client = payload.client_id ? clients.find((item) => item.id === payload.client_id) ?? null : null;
        const nextEvent: ScheduleEvent = editing ? {
          ...editing,
          ...payload,
          updated_at: now,
          clients: client,
        } : {
          ...payload,
          id: crypto.randomUUID(),
          created_at: now,
          updated_at: now,
          clients: client,
        };
        const next = editing ? events.map((item) => item.id === editing.id ? nextEvent : item) : [...events, nextEvent];
        persistLocal(next);
      }
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o compromisso.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(event: ScheduleEvent) {
    if (!window.confirm(`Excluir “${event.title}”?`)) return;
    setSaving(true);
    setMessage("");
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase.from("calendar_events").delete().eq("id", event.id);
        if (error) throw error;
        setEvents((current) => current.filter((item) => item.id !== event.id));
      } else {
        persistLocal(events.filter((item) => item.id !== event.id));
      }
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir o compromisso.");
    } finally {
      setSaving(false);
    }
  }

  async function markDone(event: ScheduleEvent) {
    await saveQuickUpdate(event, { status: "Concluído" });
  }

  async function saveQuickUpdate(event: ScheduleEvent, changes: Partial<ScheduleEventPayload>) {
    setMessage("");
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { data, error } = await supabase.from("calendar_events").update(changes).eq("id", event.id).select("*, clients(name,segment,accent)").single();
        if (error) throw error;
        const updated = normalizeScheduleEvent(data as Record<string, unknown>);
        setEvents((current) => current.map((item) => item.id === event.id ? updated : item));
      } else {
        const next = events.map((item) => item.id === event.id ? { ...item, ...changes, updated_at: new Date().toISOString() } : item);
        persistLocal(next);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o compromisso.");
    }
  }

  function moveMonth(direction: number) {
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  return (
    <>
      <PageHeader
        eyebrow="ORGANIZAÇÃO"
        title="Agenda"
        description="Agenda operacional para reuniões, gravações, eventos e prazos."
        actionNode={<div className="content-header-actions-v16"><Link className="secondary-button" href="/conteudos?view=calendar"><CalendarIcon size={16}/>Calendário editorial</Link><button className="primary-button" onClick={() => openCreate()}><PlusIcon size={17}/>Novo compromisso</button></div>}
      />

      <section className="agenda-v13-toolbar panel">
        <div className="filter-search"><SearchIcon size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar compromisso, cliente ou local" /></div>
        <div className="schedule-type-filters">{types.map((type) => <button key={type} className={typeFilter === type ? "filter active" : "filter"} onClick={() => setTypeFilter(type)}>{type}</button>)}</div>
        <div className="view-switch schedule-view-switch"><button className={view === "Mês" ? "active" : ""} onClick={() => setView("Mês")}>Mês</button><button className={view === "Lista" ? "active" : ""} onClick={() => setView("Lista")}>Lista</button></div>
      </section>

      {message && <div className="briefing-page-alert">{message}</div>}

      {loading ? <div className="clients-loading">Carregando agenda...</div> : view === "Mês" ? (
        <div className="agenda-v13-layout">
          <section className="panel calendar-v13-panel">
            <div className="calendar-v13-toolbar"><div><span>AGENDA OPERACIONAL · COMPROMISSOS</span><h2>{monthFormatter.format(currentMonth)}</h2><Link className="calendar-cross-link-v16" href="/conteudos?view=calendar">Abrir calendário de publicações →</Link></div><div><button onClick={() => moveMonth(-1)} aria-label="Mês anterior">‹</button><button className="today-button" onClick={() => { const today = new Date(); setCurrentMonth(today); setSelectedDate(today); }}>Hoje</button><button onClick={() => moveMonth(1)} aria-label="Próximo mês">›</button></div></div>
            <div className="calendar-weekdays">{["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="calendar-v13-grid">{grid.map((day) => {
              const eventsForDay = filteredEvents.filter((event) => isSameDay(event.start_at, day)).sort((a, b) => a.start_at.localeCompare(b.start_at));
              const muted = day.getMonth() !== currentMonth.getMonth();
              const selected = isSameDay(day, selectedDate);
              const today = isSameDay(day, new Date());
              return <button key={dateKey(day)} type="button" className={`calendar-v13-cell ${muted ? "muted" : ""} ${selected ? "selected" : ""} ${today ? "today" : ""}`} onClick={() => setSelectedDate(day)} onDoubleClick={() => openCreate(day)}>
                <span className="calendar-day-number">{day.getDate()}</span>
                <div className="calendar-v13-events">{eventsForDay.slice(0, 3).map((event) => <span key={event.id} className={`calendar-event-chip ${eventTypeClass(event.event_type)}`} onClick={(clickEvent) => { clickEvent.stopPropagation(); openEdit(event); }}><i />{!event.all_day && <b>{formatTime(event.start_at)}</b>} {event.title}</span>)}{eventsForDay.length > 3 && <em>+{eventsForDay.length - 3} compromissos</em>}</div>
              </button>;
            })}</div>
          </section>

          <aside className="panel agenda-v13-day-panel">
            <div className="agenda-v13-date"><span>{weekdayFormatter.format(selectedDate)}</span><strong>{selectedDate.getDate()}</strong><small>{formatDate(selectedDate.toISOString(), { month: "long", year: "numeric" })}</small></div>
            <button className="outline-button full" onClick={() => openCreate(selectedDate)}><PlusIcon size={16}/>Adicionar neste dia</button>
            <div className="agenda-v13-day-list">{dayEvents.length === 0 ? <div className="agenda-empty-day"><CalendarIcon size={24}/><strong>Dia livre</strong><span>Nenhum compromisso encontrado.</span></div> : dayEvents.map((event) => <article key={event.id} className={`agenda-v13-day-card ${eventTypeClass(event.event_type)}`}>
              <div className="agenda-v13-time"><strong>{event.all_day ? "Dia todo" : formatTime(event.start_at)}</strong><span>{event.all_day ? event.event_type : formatDuration(event.start_at, event.end_at)}</span></div>
              <div className="agenda-v13-event-copy"><span>{event.event_type} · {event.status}</span><h3>{event.title}</h3><p>{event.clients?.name ?? "Sem cliente vinculado"}</p>{event.meeting_url && <a href={event.meeting_url} target="_blank" rel="noreferrer"><VideoIcon size={13}/>Abrir reunião</a>}</div>
              <button className="agenda-edit-button" onClick={() => openEdit(event)}>Editar</button>
            </article>)}</div>
          </aside>
        </div>
      ) : (
        <section className="agenda-list-v13">{upcomingEvents.length === 0 ? <div className="empty-state"><strong>Nenhum compromisso futuro</strong><p>Crie o primeiro compromisso para organizar sua rotina.</p></div> : upcomingEvents.map((event) => <article key={event.id} className="agenda-list-card panel">
          <div className={`agenda-list-date ${eventTypeClass(event.event_type)}`}><span>{formatDate(event.start_at, { month: "short" }).replace(".", "").toUpperCase()}</span><strong>{new Date(event.start_at).getDate()}</strong></div>
          <div className="agenda-list-copy"><span>{event.event_type} · {event.status}</span><h3>{event.title}</h3><p>{event.clients?.name ?? "Sem cliente"}{event.location ? ` · ${event.location}` : ""}</p><small><ClockIcon size={13}/>{event.all_day ? "Dia inteiro" : `${formatTime(event.start_at)}–${formatTime(event.end_at)} · ${formatDuration(event.start_at, event.end_at)}`}</small></div>
          <div className="agenda-list-actions"><button className="secondary-button" onClick={() => openEdit(event)}>Ver detalhes</button><a className="outline-button" href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">Google Agenda</a><button className="icon-text-button" onClick={() => downloadIcs(event)}>Baixar .ics</button>{event.status !== "Concluído" && event.status !== "Cancelado" && <button className="icon-text-button done" onClick={() => markDone(event)}><CheckIcon size={14}/>Concluir</button>}</div>
        </article>)}</section>
      )}

      <ScheduleEventModal
        open={modalOpen}
        event={editing}
        clients={clients}
        defaultDate={selectedDate}
        defaultType={defaultType}
        saving={saving}
        message={message}
        onClose={() => { if (!saving) { setModalOpen(false); setEditing(null); setMessage(""); } }}
        onSave={saveEvent}
        onDelete={deleteEvent}
      />
    </>
  );
}
