import type { ContentFormat, ContentStatus } from "@/lib/content";

export const CLIENT_FILE_TYPES = ["Link", "Pasta", "Documento", "Identidade visual", "Foto", "Vídeo", "Outro"] as const;
export const CREATIVE_ITEM_TYPES = ["Ideia", "Roteiro", "Gancho", "Legenda", "CTA", "Sequência de Stories", "Template", "Mensagem"] as const;
export const CREATIVE_CATEGORIES = ["Educação", "Autoridade", "Relacionamento", "Oferta", "Prova social", "Bastidores", "Institucional", "Outro"] as const;

export type ClientFileType = (typeof CLIENT_FILE_TYPES)[number];
export type CreativeItemType = (typeof CREATIVE_ITEM_TYPES)[number];
export type CreativeCategory = (typeof CREATIVE_CATEGORIES)[number];

export type LibraryClient = {
  id: string;
  name: string;
  segment: string;
  accent: string;
};

export type ClientLibraryItem = {
  id: string;
  owner_id?: string;
  client_id: string;
  name: string;
  category: string;
  url: string;
  notes: string;
  item_type: ClientFileType;
  tags: string[];
  portal_visible: boolean;
  favorite: boolean;
  created_at: string;
  updated_at: string;
  clients: Omit<LibraryClient, "id"> | null;
};

export type ClientLibraryPayload = Pick<ClientLibraryItem, "client_id" | "name" | "category" | "url" | "notes" | "item_type" | "tags" | "portal_visible" | "favorite">;

export type CreativeLibraryItem = {
  id: string;
  owner_id?: string;
  title: string;
  item_type: CreativeItemType;
  content_format: ContentFormat;
  category: CreativeCategory;
  hook: string;
  body: string;
  cta: string;
  tags: string[];
  favorite: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
};

export type CreativeLibraryPayload = Pick<CreativeLibraryItem, "title" | "item_type" | "content_format" | "category" | "hook" | "body" | "cta" | "tags" | "favorite">;

export type UseCreativePayload = {
  client_id: string;
  title: string;
  status: ContentStatus;
  publication_date: string;
};

export const emptyClientLibraryPayload: ClientLibraryPayload = {
  client_id: "",
  name: "",
  category: "Geral",
  url: "",
  notes: "",
  item_type: "Link",
  tags: [],
  portal_visible: true,
  favorite: false,
};

export const emptyCreativePayload: CreativeLibraryPayload = {
  title: "",
  item_type: "Ideia",
  content_format: "Reel",
  category: "Educação",
  hook: "",
  body: "",
  cta: "",
  tags: [],
  favorite: false,
};

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

export function tagsToText(tags: string[]) {
  return tags.join(", ");
}

export function textToTags(value: string) {
  return Array.from(new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))).slice(0, 12);
}

export function normalizeClientLibraryItem(value: Record<string, unknown>): ClientLibraryItem {
  const client = value.clients as Record<string, unknown> | null | undefined;
  return {
    id: String(value.id),
    owner_id: value.owner_id ? String(value.owner_id) : undefined,
    client_id: String(value.client_id ?? ""),
    name: String(value.name ?? "Material sem nome"),
    category: String(value.category ?? "Geral"),
    url: String(value.url ?? ""),
    notes: String(value.notes ?? ""),
    item_type: (value.item_type as ClientFileType) ?? "Link",
    tags: normalizeTags(value.tags),
    portal_visible: value.portal_visible === undefined ? true : Boolean(value.portal_visible),
    favorite: Boolean(value.favorite),
    created_at: String(value.created_at ?? new Date().toISOString()),
    updated_at: String(value.updated_at ?? value.created_at ?? new Date().toISOString()),
    clients: client ? {
      name: String(client.name ?? "Cliente"),
      segment: String(client.segment ?? ""),
      accent: String(client.accent ?? "#7B214B"),
    } : null,
  };
}

export function normalizeCreativeLibraryItem(value: Record<string, unknown>): CreativeLibraryItem {
  return {
    id: String(value.id),
    owner_id: value.owner_id ? String(value.owner_id) : undefined,
    title: String(value.title ?? "Item sem título"),
    item_type: (value.item_type as CreativeItemType) ?? "Ideia",
    content_format: (value.content_format as ContentFormat) ?? "Reel",
    category: (value.category as CreativeCategory) ?? "Educação",
    hook: String(value.hook ?? ""),
    body: String(value.body ?? ""),
    cta: String(value.cta ?? ""),
    tags: normalizeTags(value.tags),
    favorite: Boolean(value.favorite),
    usage_count: Number(value.usage_count ?? 0),
    created_at: String(value.created_at ?? new Date().toISOString()),
    updated_at: String(value.updated_at ?? value.created_at ?? new Date().toISOString()),
  };
}

export function stripClientRelations(item: ClientLibraryItem) {
  const { clients: _clients, owner_id: _owner, ...record } = item;
  return record;
}

export function stripCreativeOwner(item: CreativeLibraryItem) {
  const { owner_id: _owner, ...record } = item;
  return record;
}

export function libraryClass(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function formatLibraryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Agora";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date).replace(".", "");
}

export function createDemoClientLibrary(clients: LibraryClient[]): ClientLibraryItem[] {
  const now = new Date().toISOString();
  const examples = [
    { name: "Manual da marca", category: "Identidade visual", item_type: "Documento" as ClientFileType, url: "https://drive.google.com", notes: "Cores, tipografia e aplicações oficiais.", tags: ["branding", "marca"] },
    { name: "Pasta de fotos profissionais", category: "Fotos", item_type: "Pasta" as ClientFileType, url: "https://drive.google.com", notes: "Ensaio atualizado para conteúdos e apresentações.", tags: ["fotos", "ensaio"] },
    { name: "Templates aprovados no Canva", category: "Design", item_type: "Link" as ClientFileType, url: "https://www.canva.com", notes: "Modelos editáveis do cliente.", tags: ["canva", "templates"] },
  ];
  return examples.map((example, index) => {
    const client = clients[index % Math.max(clients.length, 1)] ?? { id: `demo-client-${index + 1}`, name: "Cliente", segment: "", accent: "#7B214B" };
    return {
      id: `demo-file-${index + 1}`,
      client_id: client.id,
      ...example,
      portal_visible: index !== 2,
      favorite: index === 0,
      created_at: now,
      updated_at: now,
      clients: { name: client.name, segment: client.segment, accent: client.accent },
    };
  });
}

export function createDemoCreativeLibrary(): CreativeLibraryItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: "demo-creative-1",
      title: "Três erros que o público comete antes de contratar",
      item_type: "Roteiro",
      content_format: "Reel",
      category: "Educação",
      hook: "Você pode estar tomando uma decisão importante com base no critério errado.",
      body: "1. Apresente o erro mais comum.\n2. Explique por que ele acontece.\n3. Mostre a consequência.\n4. Apresente um critério melhor.\n5. Feche com uma orientação prática.",
      cta: "Salve para consultar antes de tomar sua decisão.",
      tags: ["educativo", "objeção", "reel"],
      favorite: true,
      usage_count: 4,
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-creative-2",
      title: "Sequência de Stories para bastidor estratégico",
      item_type: "Sequência de Stories",
      content_format: "Stories",
      category: "Bastidores",
      hook: "Hoje quero mostrar uma parte do trabalho que normalmente ninguém vê.",
      body: "Story 1: contexto.\nStory 2: processo.\nStory 3: detalhe importante.\nStory 4: por que isso muda o resultado.\nStory 5: pergunta ou CTA.",
      cta: "Quer ver mais bastidores como este? Responda aqui.",
      tags: ["stories", "bastidores", "humanização"],
      favorite: false,
      usage_count: 2,
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-creative-3",
      title: "CTA consultivo para serviços de alto ticket",
      item_type: "CTA",
      content_format: "Carrossel",
      category: "Oferta",
      hook: "",
      body: "Antes de tomar essa decisão, vale analisar se a solução realmente se encaixa no seu cenário.",
      cta: "Converse com nossa equipe para compreender qual caminho faz sentido para você.",
      tags: ["cta", "alto ticket", "consultivo"],
      favorite: true,
      usage_count: 7,
      created_at: now,
      updated_at: now,
    },
  ];
}
