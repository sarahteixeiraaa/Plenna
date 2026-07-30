export const CONTENT_STATUSES = ["Ideia", "Roteiro", "Gravação", "Edição", "Aprovação", "Agendado", "Publicado"] as const;
export const CONTENT_FORMATS = ["Reel", "Carrossel", "Stories", "Post", "Live", "Outro"] as const;
export const JOURNEY_STAGES = ["Atração", "Consideração", "Conversão", "Relacionamento"] as const;
export const CONTENT_PRIORITIES = ["Baixa", "Média", "Alta"] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];
export type ContentFormat = (typeof CONTENT_FORMATS)[number];
export type JourneyStage = (typeof JOURNEY_STAGES)[number];
export type ContentPriority = (typeof CONTENT_PRIORITIES)[number];

export type ContentClient = {
  id: string;
  name: string;
  segment: string;
  accent: string;
};

export type ContentItem = {
  id: string;
  owner_id?: string;
  client_id: string | null;
  title: string;
  content_format: ContentFormat;
  status: ContentStatus;
  pillar: string;
  objective: string;
  journey_stage: JourneyStage;
  hook: string;
  script: string;
  caption: string;
  cta: string;
  publication_date: string;
  publication_time: string;
  reference_url: string;
  asset_url: string;
  notes: string;
  priority: ContentPriority;
  created_at: string;
  updated_at: string;
  clients: Omit<ContentClient, "id"> | null;
};

export type ContentPayload = Omit<ContentItem, "id" | "owner_id" | "created_at" | "updated_at" | "clients">;

export const emptyContentPayload: ContentPayload = {
  client_id: null,
  title: "",
  content_format: "Reel",
  status: "Ideia",
  pillar: "",
  objective: "",
  journey_stage: "Atração",
  hook: "",
  script: "",
  caption: "",
  cta: "",
  publication_date: "",
  publication_time: "",
  reference_url: "",
  asset_url: "",
  notes: "",
  priority: "Média",
};

export function normalizeContent(value: Record<string, unknown>): ContentItem {
  const client = value.clients as Record<string, unknown> | null | undefined;
  return {
    id: String(value.id),
    owner_id: value.owner_id ? String(value.owner_id) : undefined,
    client_id: value.client_id ? String(value.client_id) : null,
    title: String(value.title ?? "Conteúdo sem título"),
    content_format: (value.content_format as ContentFormat) ?? "Reel",
    status: (value.status as ContentStatus) ?? "Ideia",
    pillar: String(value.pillar ?? ""),
    objective: String(value.objective ?? ""),
    journey_stage: (value.journey_stage as JourneyStage) ?? "Atração",
    hook: String(value.hook ?? ""),
    script: String(value.script ?? ""),
    caption: String(value.caption ?? ""),
    cta: String(value.cta ?? ""),
    publication_date: String(value.publication_date ?? ""),
    publication_time: String(value.publication_time ?? "").slice(0, 5),
    reference_url: String(value.reference_url ?? ""),
    asset_url: String(value.asset_url ?? ""),
    notes: String(value.notes ?? ""),
    priority: (value.priority as ContentPriority) ?? "Média",
    created_at: String(value.created_at ?? new Date().toISOString()),
    updated_at: String(value.updated_at ?? new Date().toISOString()),
    clients: client ? {
      name: String(client.name ?? "Cliente"),
      segment: String(client.segment ?? ""),
      accent: String(client.accent ?? "#7B214B"),
    } : null,
  };
}

export function stripContentRelations(item: ContentItem) {
  const { clients: _clients, owner_id: _ownerId, ...record } = item;
  return record;
}

export function contentStatusClass(status: ContentStatus) {
  return status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-");
}

export function formatClass(format: ContentFormat) {
  return format.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function priorityClass(priority: ContentPriority) {
  return priority.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function parseContentDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function shortContentDate(value: string) {
  const date = parseContentDate(value);
  if (!date) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date).replace(".", "");
}

export function longContentDate(value: string) {
  const date = parseContentDate(value);
  if (!date) return "Sem data definida";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "long" }).format(date);
}

export function contentDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function contentMonthGrid(reference: Date) {
  const first = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return contentDateKey(copy);
}

export function createDemoContents(clients: ContentClient[]): ContentItem[] {
  const now = new Date();
  const examples: Array<Partial<ContentItem> & Pick<ContentItem, "title" | "content_format" | "status">> = [
    { title: "3 erros antes de prestar depoimento", content_format: "Reel", status: "Roteiro", pillar: "Educação jurídica", journey_stage: "Consideração", hook: "Recebeu uma intimação? Evite estes três erros.", publication_date: addDays(now, 1), priority: "Alta" },
    { title: "Bastidores da preparação do consultório", content_format: "Stories", status: "Gravação", pillar: "Humanização", journey_stage: "Relacionamento", publication_date: addDays(now, 2), priority: "Média" },
    { title: "Como escolher iluminação para ambientes", content_format: "Carrossel", status: "Edição", pillar: "Educação", journey_stage: "Consideração", publication_date: addDays(now, 4), priority: "Média" },
    { title: "Menu executivo da semana", content_format: "Stories", status: "Aprovação", pillar: "Oferta", journey_stage: "Conversão", publication_date: addDays(now, 0), priority: "Alta" },
    { title: "Investigação não é condenação", content_format: "Carrossel", status: "Agendado", pillar: "Educação jurídica", journey_stage: "Atração", publication_date: addDays(now, 5), priority: "Média" },
    { title: "Experiência da paciente", content_format: "Reel", status: "Publicado", pillar: "Prova social", journey_stage: "Conversão", publication_date: addDays(now, -2), priority: "Baixa" },
  ];

  return examples.map((example, index) => {
    const client = clients[index % Math.max(clients.length, 1)] ?? null;
    const nowIso = new Date().toISOString();
    return {
      ...emptyContentPayload,
      id: `demo-content-${index + 1}`,
      client_id: client?.id ?? null,
      title: example.title,
      content_format: example.content_format,
      status: example.status,
      pillar: example.pillar ?? "",
      journey_stage: example.journey_stage ?? "Atração",
      hook: example.hook ?? "",
      publication_date: example.publication_date ?? "",
      priority: example.priority ?? "Média",
      created_at: nowIso,
      updated_at: nowIso,
      clients: client ? { name: client.name, segment: client.segment, accent: client.accent } : null,
    };
  });
}
