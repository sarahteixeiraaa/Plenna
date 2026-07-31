export type PortalTaskStatus = "Pendente" | "Em andamento" | "Concluída";
export type PortalTaskPriority = "Baixa" | "Média" | "Alta";

export type PortalClient = {
  id: string;
  name: string;
  segment: string;
  contact_name: string;
  email: string;
  phone: string;
  instagram: string;
  accent: string;
  portal_token: string;
  portal_enabled: boolean;
  portal_welcome_message: string;
  portal_last_access_at: string;
  has_portal_code: boolean;
};

export type PortalTask = {
  id: string;
  client_id: string;
  title: string;
  description: string;
  due_date: string;
  status: PortalTaskStatus;
  priority: PortalTaskPriority;
  client_response: string;
  created_at: string;
  updated_at: string;
};

export type PortalFile = {
  id: string;
  client_id: string;
  name: string;
  category: string;
  url: string;
  notes: string;
  created_at: string;
};

export type PortalContent = {
  id: string;
  title: string;
  content_format: string;
  status: string;
  publication_date: string;
  publication_time: string;
  caption: string;
  cta: string;
  asset_url: string;
  approval_token: string;
  approval_status: string;
  approval_due_date: string;
};

export type PortalEvent = {
  id: string;
  title: string;
  event_type: string;
  status: string;
  start_at: string;
  end_at: string;
  location: string;
  platform: string;
  meeting_url: string;
};

export type PortalBriefing = {
  id: string;
  title: string;
  status: string;
  progress: number;
  public_token: string;
  updated_at: string;
};

export type PublicPortalData = {
  client: {
    id: string;
    name: string;
    segment: string;
    accent: string;
    welcome_message: string;
    instagram: string;
  };
  contents: PortalContent[];
  events: PortalEvent[];
  briefings: PortalBriefing[];
  files: PortalFile[];
  tasks: PortalTask[];
};

export function portalUrl(token: string) {
  if (typeof window === "undefined" || !token) return "";
  return `${window.location.origin}/cliente/${token}`;
}

export function portalStatusClass(status: string) {
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export function formatPortalDate(value: string, withTime = false) {
  if (!value) return "Sem data";
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", withTime
    ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" })
    .format(date)
    .replace(".", "");
}

export function portalInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "CL";
}

export function normalizePortalClient(value: Record<string, unknown>): PortalClient {
  return {
    id: String(value.id),
    name: String(value.name ?? "Cliente"),
    segment: String(value.segment ?? ""),
    contact_name: String(value.contact_name ?? ""),
    email: String(value.email ?? ""),
    phone: String(value.phone ?? ""),
    instagram: String(value.instagram ?? ""),
    accent: String(value.accent ?? "#7B214B"),
    portal_token: String(value.portal_token ?? ""),
    portal_enabled: Boolean(value.portal_enabled),
    portal_welcome_message: String(value.portal_welcome_message ?? ""),
    portal_last_access_at: String(value.portal_last_access_at ?? ""),
    has_portal_code: Boolean(value.has_portal_code ?? value.portal_access_code_hash),
  };
}

export function normalizePortalTask(value: Record<string, unknown>): PortalTask {
  return {
    id: String(value.id),
    client_id: String(value.client_id),
    title: String(value.title ?? "Pendência"),
    description: String(value.description ?? ""),
    due_date: String(value.due_date ?? ""),
    status: (value.status as PortalTaskStatus) ?? "Pendente",
    priority: (value.priority as PortalTaskPriority) ?? "Média",
    client_response: String(value.client_response ?? ""),
    created_at: String(value.created_at ?? ""),
    updated_at: String(value.updated_at ?? ""),
  };
}

export function normalizePortalFile(value: Record<string, unknown>): PortalFile {
  return {
    id: String(value.id),
    client_id: String(value.client_id),
    name: String(value.name ?? "Arquivo"),
    category: String(value.category ?? "Geral"),
    url: String(value.url ?? ""),
    notes: String(value.notes ?? ""),
    created_at: String(value.created_at ?? ""),
  };
}
