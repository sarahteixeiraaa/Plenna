import type { ContentClient } from "@/lib/content";

export const COVERAGE_STATUSES = ["Planejamento", "Confirmada", "Em cobertura", "Finalizada", "Cancelada"] as const;
export const MOMENT_STATUSES = ["Pendente", "Capturado", "Publicado"] as const;

export type CoverageStatus = (typeof COVERAGE_STATUSES)[number];
export type MomentStatus = (typeof MOMENT_STATUSES)[number];

export type CoverageMoment = {
  id: string;
  title: string;
  notes: string;
  status: MomentStatus;
};

export type EquipmentItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type StoryCoverage = {
  id: string;
  owner_id?: string;
  client_id: string | null;
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  objective: string;
  style: string;
  platform: string;
  contact_name: string;
  contact_phone: string;
  schedule_notes: string;
  important_people: string[];
  moments: CoverageMoment[];
  equipment: EquipmentItem[];
  mentions: string;
  hashtags: string;
  links: string;
  cta: string;
  delivered_url: string;
  final_notes: string;
  status: CoverageStatus;
  created_at: string;
  updated_at: string;
  clients: Omit<ContentClient, "id"> | null;
};

export type StoryCoveragePayload = Omit<StoryCoverage, "id" | "owner_id" | "created_at" | "updated_at" | "clients">;

export function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const defaultMoments: CoverageMoment[] = [
  "Fachada e chegada",
  "Preparação do ambiente",
  "Detalhes e identidade visual",
  "Recepção do público",
  "Falas principais",
  "Reações e interação",
  "Bastidores da equipe",
  "Encerramento e CTA",
].map((title) => ({ id: createLocalId("moment"), title, notes: "", status: "Pendente" }));

export const defaultEquipment: EquipmentItem[] = [
  "Celular carregado",
  "Power bank",
  "Microfone sem fio",
  "Iluminação portátil",
  "Espaço de armazenamento",
  "Acesso ao Instagram",
  "Programação do evento",
].map((label) => ({ id: createLocalId("equipment"), label, checked: false }));

export const emptyCoveragePayload: StoryCoveragePayload = {
  client_id: null,
  title: "",
  event_date: "",
  start_time: "",
  end_time: "",
  location: "",
  objective: "",
  style: "Elegante e espontâneo",
  platform: "Instagram Stories",
  contact_name: "",
  contact_phone: "",
  schedule_notes: "",
  important_people: [],
  moments: defaultMoments,
  equipment: defaultEquipment,
  mentions: "",
  hashtags: "",
  links: "",
  cta: "",
  delivered_url: "",
  final_notes: "",
  status: "Planejamento",
};

function normalizeMoments(value: unknown): CoverageMoment[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id ?? `moment-${index}`),
      title: String(row.title ?? "Momento"),
      notes: String(row.notes ?? ""),
      status: (row.status as MomentStatus) ?? "Pendente",
    };
  });
}

function normalizeEquipment(value: unknown): EquipmentItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id ?? `equipment-${index}`),
      label: String(row.label ?? "Item"),
      checked: Boolean(row.checked),
    };
  });
}

export function normalizeCoverage(value: Record<string, unknown>): StoryCoverage {
  const client = value.clients as Record<string, unknown> | null | undefined;
  return {
    id: String(value.id),
    owner_id: value.owner_id ? String(value.owner_id) : undefined,
    client_id: value.client_id ? String(value.client_id) : null,
    title: String(value.title ?? "Cobertura sem título"),
    event_date: String(value.event_date ?? ""),
    start_time: String(value.start_time ?? "").slice(0, 5),
    end_time: String(value.end_time ?? "").slice(0, 5),
    location: String(value.location ?? ""),
    objective: String(value.objective ?? ""),
    style: String(value.style ?? ""),
    platform: String(value.platform ?? "Instagram Stories"),
    contact_name: String(value.contact_name ?? ""),
    contact_phone: String(value.contact_phone ?? ""),
    schedule_notes: String(value.schedule_notes ?? ""),
    important_people: Array.isArray(value.important_people) ? value.important_people.map(String) : [],
    moments: normalizeMoments(value.moments),
    equipment: normalizeEquipment(value.equipment),
    mentions: String(value.mentions ?? ""),
    hashtags: String(value.hashtags ?? ""),
    links: String(value.links ?? ""),
    cta: String(value.cta ?? ""),
    delivered_url: String(value.delivered_url ?? ""),
    final_notes: String(value.final_notes ?? ""),
    status: (value.status as CoverageStatus) ?? "Planejamento",
    created_at: String(value.created_at ?? new Date().toISOString()),
    updated_at: String(value.updated_at ?? new Date().toISOString()),
    clients: client ? {
      name: String(client.name ?? "Cliente"),
      segment: String(client.segment ?? ""),
      accent: String(client.accent ?? "#7B214B"),
    } : null,
  };
}

export function stripCoverageRelations(item: StoryCoverage) {
  const { clients: _clients, owner_id: _ownerId, ...record } = item;
  return record;
}

export function coverageStatusClass(status: CoverageStatus) {
  return status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-");
}

export function momentStatusClass(status: MomentStatus) {
  return status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function formatCoverageDate(value: string) {
  if (!value) return "Data a definir";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Data a definir";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "long" }).format(date);
}

export function coverageProgress(item: StoryCoverage) {
  const total = item.moments.length;
  const captured = item.moments.filter((moment) => moment.status !== "Pendente").length;
  const published = item.moments.filter((moment) => moment.status === "Publicado").length;
  return { total, captured, published, percent: total ? Math.round((captured / total) * 100) : 0 };
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDemoCoverages(clients: ContentClient[]): StoryCoverage[] {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  const examples = [
    { title: "Lançamento da nova coleção", event_date: dateKey(tomorrow), start_time: "18:30", end_time: "21:30", location: "Espaço do cliente", status: "Confirmada" as CoverageStatus },
    { title: "Bastidores de atendimento", event_date: dateKey(nextWeek), start_time: "09:00", end_time: "11:00", location: "Unidade principal", status: "Planejamento" as CoverageStatus },
  ];
  return examples.map((example, index) => {
    const client = clients[index % Math.max(clients.length, 1)] ?? null;
    const payload = structuredClone(emptyCoveragePayload);
    const nowIso = new Date().toISOString();
    return {
      ...payload,
      id: `demo-coverage-${index + 1}`,
      client_id: client?.id ?? null,
      title: example.title,
      event_date: example.event_date,
      start_time: example.start_time,
      end_time: example.end_time,
      location: example.location,
      objective: "Mostrar a experiência em tempo real, gerar desejo e direcionar o público para o atendimento.",
      status: example.status,
      created_at: nowIso,
      updated_at: nowIso,
      clients: client ? { name: client.name, segment: client.segment, accent: client.accent } : null,
    };
  });
}
