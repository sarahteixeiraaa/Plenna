export type ScheduleEventType = "Reunião" | "Gravação" | "Evento" | "Prazo" | "Interno";
export type ScheduleStatus = "Agendado" | "Confirmado" | "Concluído" | "Cancelado";
export type MeetingPlatform = "Google Meet" | "Zoom" | "Presencial" | "WhatsApp" | "Outro";

export type MeetingAction = {
  id: string;
  text: string;
  owner: string;
  due_date: string;
  done: boolean;
};

export type ScheduleEvent = {
  id: string;
  owner_id?: string;
  client_id: string | null;
  title: string;
  event_type: ScheduleEventType;
  status: ScheduleStatus;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string;
  platform: MeetingPlatform;
  meeting_url: string;
  description: string;
  agenda_items: string[];
  notes: string;
  decisions: string[];
  next_steps: MeetingAction[];
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    segment?: string;
    accent?: string;
  } | null;
};

export type ClientOption = {
  id: string;
  name: string;
  segment: string;
  accent: string;
};

const pad = (value: number) => String(value).padStart(2, "0");

export function toLocalInputValue(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInputValue(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function dateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", options ?? { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatDuration(startAt: string, endAt: string) {
  const minutes = Math.max(0, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

export function startOfMonthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const weekday = first.getDay() === 0 ? 7 : first.getDay();
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - (weekday - 1));
  return gridStart;
}

export function monthGrid(date: Date) {
  const start = startOfMonthGrid(date);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function isSameDay(a: Date | string, b: Date | string) {
  return dateKey(a) === dateKey(b);
}

export function eventTypeClass(type: ScheduleEventType) {
  return type.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function googleDate(value: string, allDay: boolean) {
  const date = new Date(value);
  if (allDay) return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function googleCalendarUrl(event: ScheduleEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${googleDate(event.start_at, event.all_day)}/${googleDate(event.end_at, event.all_day)}`,
    details: [event.description, event.agenda_items.length ? `Pauta:\n${event.agenda_items.map((item) => `• ${item}`).join("\n")}` : "", event.meeting_url].filter(Boolean).join("\n\n"),
    location: event.location || event.meeting_url,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildIcs(event: ScheduleEvent) {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const start = googleDate(event.start_at, event.all_day);
  const end = googleDate(event.end_at, event.all_day);
  const type = event.all_day ? ";VALUE=DATE" : "";
  const description = [event.description, event.agenda_items.length ? `Pauta:\n${event.agenda_items.map((item) => `• ${item}`).join("\n")}` : "", event.meeting_url].filter(Boolean).join("\n\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Plenna//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@plenna`,
    `DTSTAMP:${now}`,
    `DTSTART${type}:${start}`,
    `DTEND${type}:${end}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(event.location || event.meeting_url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(event: ScheduleEvent) {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "compromisso"}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function normalizeScheduleEvent(value: Record<string, unknown>): ScheduleEvent {
  const client = value.clients as Record<string, unknown> | null | undefined;
  return {
    id: String(value.id),
    owner_id: value.owner_id ? String(value.owner_id) : undefined,
    client_id: value.client_id ? String(value.client_id) : null,
    title: String(value.title ?? "Compromisso"),
    event_type: (value.event_type as ScheduleEventType) ?? "Reunião",
    status: (value.status as ScheduleStatus) ?? "Agendado",
    start_at: String(value.start_at ?? new Date().toISOString()),
    end_at: String(value.end_at ?? new Date().toISOString()),
    all_day: Boolean(value.all_day),
    location: String(value.location ?? ""),
    platform: (value.platform as MeetingPlatform) ?? "Google Meet",
    meeting_url: String(value.meeting_url ?? ""),
    description: String(value.description ?? ""),
    agenda_items: Array.isArray(value.agenda_items) ? value.agenda_items.map(String) : [],
    notes: String(value.notes ?? ""),
    decisions: Array.isArray(value.decisions) ? value.decisions.map(String) : [],
    next_steps: Array.isArray(value.next_steps)
      ? (value.next_steps as Array<Record<string, unknown>>).map((item) => ({
          id: String(item.id ?? crypto.randomUUID()),
          text: String(item.text ?? ""),
          owner: String(item.owner ?? ""),
          due_date: String(item.due_date ?? ""),
          done: Boolean(item.done),
        }))
      : [],
    created_at: String(value.created_at ?? new Date().toISOString()),
    updated_at: String(value.updated_at ?? new Date().toISOString()),
    clients: client ? {
      name: String(client.name ?? "Cliente"),
      segment: String(client.segment ?? ""),
      accent: String(client.accent ?? "#7B214B"),
    } : null,
  };
}

function atTime(base: Date, dayOffset: number, hour: number, minute = 0) {
  const date = new Date(base);
  date.setDate(base.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function createDemoSchedule(clientOptions: ClientOption[]): ScheduleEvent[] {
  const now = new Date();
  const examples = [
    { offset: 0, hour: 9, duration: 45, title: "Planejamento mensal", type: "Reunião" as const, clientIndex: 0, platform: "Google Meet" as const },
    { offset: 0, hour: 11, duration: 120, title: "Captação de Reels", type: "Gravação" as const, clientIndex: 1, platform: "Presencial" as const },
    { offset: 1, hour: 10, duration: 60, title: "Reunião de onboarding", type: "Reunião" as const, clientIndex: 2, platform: "Zoom" as const },
    { offset: 3, hour: 18, duration: 180, title: "Cobertura de lançamento", type: "Evento" as const, clientIndex: 4, platform: "Presencial" as const },
  ];
  return examples.map((example, index) => {
    const start = atTime(now, example.offset, example.hour);
    const end = new Date(start.getTime() + example.duration * 60000);
    const client = clientOptions[example.clientIndex] ?? null;
    return {
      id: `demo-event-${index + 1}`,
      client_id: client?.id ?? null,
      title: example.title,
      event_type: example.type,
      status: index === 0 ? "Confirmado" : "Agendado",
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: false,
      location: example.platform === "Presencial" ? "Local a confirmar" : "",
      platform: example.platform,
      meeting_url: "",
      description: index === 0 ? "Alinhamento das prioridades e campanhas do próximo ciclo." : "",
      agenda_items: index === 0 ? ["Resultados do mês", "Prioridades", "Calendário editorial"] : [],
      notes: "",
      decisions: [],
      next_steps: [],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      clients: client ? { name: client.name, segment: client.segment, accent: client.accent } : null,
    };
  });
}
