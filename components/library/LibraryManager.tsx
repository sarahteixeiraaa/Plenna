"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import {
  ArrowIcon,
  BookmarkIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileIcon,
  FolderIcon,
  HeartIcon,
  LayersIcon,
  LinkIcon,
  MoreIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  TagIcon,
  UsersIcon,
} from "@/components/icons";
import { clients as demoClientData } from "@/lib/data";
import { CONTENT_FORMATS, CONTENT_STATUSES, ContentStatus, createApprovalToken, normalizeContent } from "@/lib/content";
import {
  CLIENT_FILE_TYPES,
  CREATIVE_CATEGORIES,
  CREATIVE_ITEM_TYPES,
  ClientLibraryItem,
  ClientLibraryPayload,
  CreativeLibraryItem,
  CreativeLibraryPayload,
  LibraryClient,
  UseCreativePayload,
  createDemoClientLibrary,
  createDemoCreativeLibrary,
  emptyClientLibraryPayload,
  emptyCreativePayload,
  formatLibraryDate,
  libraryClass,
  normalizeClientLibraryItem,
  normalizeCreativeLibraryItem,
  stripClientRelations,
  stripCreativeOwner,
  tagsToText,
  textToTags,
} from "@/lib/library";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type MainTab = "Clientes" | "Biblioteca criativa";
type ClientVisibilityFilter = "Todos" | "Portal" | "Internos";

function localClients(): LibraryClient[] {
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

function attachClient(items: ClientLibraryItem[], clients: LibraryClient[]) {
  return items.map((item) => ({
    ...item,
    clients: clients.find((client) => client.id === item.client_id) ?? item.clients,
  }));
}

function normalizeUrl(value: string) {
  const url = value.trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function clientPayload(item: ClientLibraryItem): ClientLibraryPayload {
  return {
    client_id: item.client_id,
    name: item.name,
    category: item.category,
    url: item.url,
    notes: item.notes,
    item_type: item.item_type,
    tags: item.tags,
    portal_visible: item.portal_visible,
    favorite: item.favorite,
  };
}

function creativePayload(item: CreativeLibraryItem): CreativeLibraryPayload {
  return {
    title: item.title,
    item_type: item.item_type,
    content_format: item.content_format,
    category: item.category,
    hook: item.hook,
    body: item.body,
    cta: item.cta,
    tags: item.tags,
    favorite: item.favorite,
  };
}

export default function LibraryManager() {
  const [tab, setTab] = useState<MainTab>("Clientes");
  const [clients, setClients] = useState<LibraryClient[]>([]);
  const [clientItems, setClientItems] = useState<ClientLibraryItem[]>([]);
  const [creativeItems, setCreativeItems] = useState<CreativeLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("Todos");
  const [visibilityFilter, setVisibilityFilter] = useState<ClientVisibilityFilter>("Todos");
  const [creativeTypeFilter, setCreativeTypeFilter] = useState("Todos");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClientItem, setEditingClientItem] = useState<ClientLibraryItem | null>(null);
  const [clientForm, setClientForm] = useState<ClientLibraryPayload>(emptyClientLibraryPayload);
  const [clientTagsText, setClientTagsText] = useState("");

  const [creativeModalOpen, setCreativeModalOpen] = useState(false);
  const [editingCreativeItem, setEditingCreativeItem] = useState<CreativeLibraryItem | null>(null);
  const [creativeForm, setCreativeForm] = useState<CreativeLibraryPayload>(emptyCreativePayload);
  const [creativeTagsText, setCreativeTagsText] = useState("");

  const [useModalItem, setUseModalItem] = useState<CreativeLibraryItem | null>(null);
  const [useForm, setUseForm] = useState<UseCreativePayload>({ client_id: "", title: "", status: "Ideia", publication_date: "" });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setMessage("");
      if (!isSupabaseConfigured) {
        const localClientRows = localClients();
        setClients(localClientRows);
        try {
          const filesRaw = window.localStorage.getItem("plenna-demo-library-client-items");
          const creativeRaw = window.localStorage.getItem("plenna-demo-creative-library-items");
          const files = filesRaw ? (JSON.parse(filesRaw) as Array<Record<string, unknown>>).map(normalizeClientLibraryItem) : createDemoClientLibrary(localClientRows);
          const creative = creativeRaw ? (JSON.parse(creativeRaw) as Array<Record<string, unknown>>).map(normalizeCreativeLibraryItem) : createDemoCreativeLibrary();
          window.localStorage.setItem("plenna-demo-library-client-items", JSON.stringify(files.map(stripClientRelations)));
          window.localStorage.setItem("plenna-demo-creative-library-items", JSON.stringify(creative.map(stripCreativeOwner)));
          setClientItems(attachClient(files, localClientRows));
          setCreativeItems(creative);
        } catch {
          setClientItems(createDemoClientLibrary(localClientRows));
          setCreativeItems(createDemoCreativeLibrary());
        }
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const [clientsResult, filesResult, creativeResult] = await Promise.all([
          supabase.from("clients").select("id,name,segment,accent").order("name"),
          supabase.from("client_portal_files").select("*, clients(name,segment,accent)").order("updated_at", { ascending: false }),
          supabase.from("creative_library_items").select("*").order("updated_at", { ascending: false }),
        ]);
        if (clientsResult.error) throw clientsResult.error;
        if (filesResult.error) throw filesResult.error;
        if (creativeResult.error) throw creativeResult.error;
        setClients((clientsResult.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name), segment: String(row.segment ?? ""), accent: String(row.accent ?? "#7B214B") })));
        setClientItems((filesResult.data ?? []).map((row) => normalizeClientLibraryItem(row as Record<string, unknown>)));
        setCreativeItems((creativeResult.data ?? []).map((row) => normalizeCreativeLibraryItem(row as Record<string, unknown>)));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível carregar a biblioteca.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function persistClientLocal(next: ClientLibraryItem[]) {
    setClientItems(next);
    window.localStorage.setItem("plenna-demo-library-client-items", JSON.stringify(next.map(stripClientRelations)));
  }

  function persistCreativeLocal(next: CreativeLibraryItem[]) {
    setCreativeItems(next);
    window.localStorage.setItem("plenna-demo-creative-library-items", JSON.stringify(next.map(stripCreativeOwner)));
  }

  const filteredClientItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    return clientItems.filter((item) => {
      const matchClient = clientFilter === "Todos" || item.client_id === clientFilter;
      const matchVisibility = visibilityFilter === "Todos" || (visibilityFilter === "Portal" ? item.portal_visible : !item.portal_visible);
      const matchSearch = !search || [item.name, item.category, item.item_type, item.notes, item.clients?.name ?? "", ...item.tags].some((value) => value.toLowerCase().includes(search));
      return matchClient && matchVisibility && matchSearch;
    });
  }, [clientItems, clientFilter, visibilityFilter, query]);

  const filteredCreativeItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    return creativeItems.filter((item) => {
      const matchType = creativeTypeFilter === "Todos" || item.item_type === creativeTypeFilter;
      const matchFavorite = !favoritesOnly || item.favorite;
      const matchSearch = !search || [item.title, item.item_type, item.category, item.content_format, item.hook, item.body, item.cta, ...item.tags].some((value) => value.toLowerCase().includes(search));
      return matchType && matchFavorite && matchSearch;
    });
  }, [creativeItems, creativeTypeFilter, favoritesOnly, query]);

  const stats = useMemo(() => ({
    clientAssets: clientItems.length,
    portalAssets: clientItems.filter((item) => item.portal_visible).length,
    creative: creativeItems.length,
    favorites: creativeItems.filter((item) => item.favorite).length + clientItems.filter((item) => item.favorite).length,
    used: creativeItems.reduce((sum, item) => sum + item.usage_count, 0),
  }), [clientItems, creativeItems]);

  function openClientCreate() {
    setEditingClientItem(null);
    setClientForm({ ...emptyClientLibraryPayload, client_id: clients[0]?.id ?? "" });
    setClientTagsText("");
    setMessage("");
    setClientModalOpen(true);
  }

  function openClientEdit(item: ClientLibraryItem) {
    setEditingClientItem(item);
    setClientForm(clientPayload(item));
    setClientTagsText(tagsToText(item.tags));
    setOpenMenu(null);
    setMessage("");
    setClientModalOpen(true);
  }

  function openCreativeCreate() {
    setEditingCreativeItem(null);
    setCreativeForm({ ...emptyCreativePayload });
    setCreativeTagsText("");
    setMessage("");
    setCreativeModalOpen(true);
  }

  function openCreativeEdit(item: CreativeLibraryItem) {
    setEditingCreativeItem(item);
    setCreativeForm(creativePayload(item));
    setCreativeTagsText(tagsToText(item.tags));
    setOpenMenu(null);
    setMessage("");
    setCreativeModalOpen(true);
  }

  async function saveClientItem(event: FormEvent) {
    event.preventDefault();
    if (!clientForm.client_id || !clientForm.name.trim() || !clientForm.url.trim()) {
      setMessage("Escolha o cliente e preencha nome e link do material.");
      return;
    }
    setSaving(true);
    setMessage("");
    const payload = { ...clientForm, name: clientForm.name.trim(), url: normalizeUrl(clientForm.url), category: clientForm.category.trim() || "Geral", notes: clientForm.notes.trim(), tags: textToTags(clientTagsText) };
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        if (editingClientItem) {
          const { data, error } = await supabase.from("client_portal_files").update(payload).eq("id", editingClientItem.id).select("*, clients(name,segment,accent)").single();
          if (error) throw error;
          setClientItems((current) => current.map((item) => item.id === editingClientItem.id ? normalizeClientLibraryItem(data as Record<string, unknown>) : item));
        } else {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) throw userError ?? new Error("Sessão não encontrada.");
          const { data, error } = await supabase.from("client_portal_files").insert({ ...payload, owner_id: userData.user.id }).select("*, clients(name,segment,accent)").single();
          if (error) throw error;
          setClientItems((current) => [normalizeClientLibraryItem(data as Record<string, unknown>), ...current]);
        }
      } else {
        const now = new Date().toISOString();
        const linked = clients.find((client) => client.id === payload.client_id) ?? null;
        if (editingClientItem) {
          persistClientLocal(clientItems.map((item) => item.id === editingClientItem.id ? { ...item, ...payload, updated_at: now, clients: linked } : item));
        } else {
          persistClientLocal([{ id: `local-file-${Date.now()}`, ...payload, created_at: now, updated_at: now, clients: linked }, ...clientItems]);
        }
      }
      setClientModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o material.");
    } finally {
      setSaving(false);
    }
  }

  async function saveCreativeItem(event: FormEvent) {
    event.preventDefault();
    if (!creativeForm.title.trim() || (!creativeForm.body.trim() && !creativeForm.hook.trim() && !creativeForm.cta.trim())) {
      setMessage("Dê um título e preencha pelo menos o conteúdo, gancho ou CTA.");
      return;
    }
    setSaving(true);
    setMessage("");
    const payload = { ...creativeForm, title: creativeForm.title.trim(), hook: creativeForm.hook.trim(), body: creativeForm.body.trim(), cta: creativeForm.cta.trim(), tags: textToTags(creativeTagsText) };
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        if (editingCreativeItem) {
          const { data, error } = await supabase.from("creative_library_items").update(payload).eq("id", editingCreativeItem.id).select().single();
          if (error) throw error;
          setCreativeItems((current) => current.map((item) => item.id === editingCreativeItem.id ? normalizeCreativeLibraryItem(data as Record<string, unknown>) : item));
        } else {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) throw userError ?? new Error("Sessão não encontrada.");
          const { data, error } = await supabase.from("creative_library_items").insert({ ...payload, owner_id: userData.user.id }).select().single();
          if (error) throw error;
          setCreativeItems((current) => [normalizeCreativeLibraryItem(data as Record<string, unknown>), ...current]);
        }
      } else {
        const now = new Date().toISOString();
        if (editingCreativeItem) {
          persistCreativeLocal(creativeItems.map((item) => item.id === editingCreativeItem.id ? { ...item, ...payload, updated_at: now } : item));
        } else {
          persistCreativeLocal([{ id: `local-creative-${Date.now()}`, ...payload, usage_count: 0, created_at: now, updated_at: now }, ...creativeItems]);
        }
      }
      setCreativeModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o item criativo.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteClientItem(item: ClientLibraryItem) {
    if (!window.confirm(`Excluir “${item.name}”?`)) return;
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase.from("client_portal_files").delete().eq("id", item.id);
        if (error) throw error;
        setClientItems((current) => current.filter((row) => row.id !== item.id));
      } else persistClientLocal(clientItems.filter((row) => row.id !== item.id));
      setOpenMenu(null);
      if (editingClientItem?.id === item.id) setClientModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir o material.");
    }
  }

  async function deleteCreativeItem(item: CreativeLibraryItem) {
    if (!window.confirm(`Excluir “${item.title}”?`)) return;
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase.from("creative_library_items").delete().eq("id", item.id);
        if (error) throw error;
        setCreativeItems((current) => current.filter((row) => row.id !== item.id));
      } else persistCreativeLocal(creativeItems.filter((row) => row.id !== item.id));
      setOpenMenu(null);
      if (editingCreativeItem?.id === item.id) setCreativeModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir o item.");
    }
  }

  async function toggleClientFavorite(item: ClientLibraryItem) {
    const favorite = !item.favorite;
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase.from("client_portal_files").update({ favorite }).eq("id", item.id);
        if (error) throw error;
        setClientItems((current) => current.map((row) => row.id === item.id ? { ...row, favorite } : row));
      } else persistClientLocal(clientItems.map((row) => row.id === item.id ? { ...row, favorite, updated_at: new Date().toISOString() } : row));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o favorito.");
    }
  }

  async function toggleCreativeFavorite(item: CreativeLibraryItem) {
    const favorite = !item.favorite;
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase.from("creative_library_items").update({ favorite }).eq("id", item.id);
        if (error) throw error;
        setCreativeItems((current) => current.map((row) => row.id === item.id ? { ...row, favorite } : row));
      } else persistCreativeLocal(creativeItems.map((row) => row.id === item.id ? { ...row, favorite, updated_at: new Date().toISOString() } : row));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o favorito.");
    }
  }

  async function copyCreative(item: CreativeLibraryItem) {
    const text = [item.hook, item.body, item.cta].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setMessage("Não foi possível copiar automaticamente.");
    }
  }

  function openUseModal(item: CreativeLibraryItem) {
    setUseModalItem(item);
    setUseForm({ client_id: clients[0]?.id ?? "", title: item.title, status: "Ideia", publication_date: "" });
    setMessage("");
  }

  async function useWithClient(event: FormEvent) {
    event.preventDefault();
    if (!useModalItem || !useForm.client_id || !useForm.title.trim()) {
      setMessage("Escolha o cliente e confirme o título do conteúdo.");
      return;
    }
    setSaving(true);
    setMessage("");
    const libraryItem = useModalItem;
    const caption = libraryItem.item_type === "Legenda" ? libraryItem.body : "";
    const script = libraryItem.item_type === "CTA" || libraryItem.item_type === "Legenda" ? "" : libraryItem.body;
    const cta = libraryItem.cta || (libraryItem.item_type === "CTA" ? libraryItem.body : "");
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw userError ?? new Error("Sessão não encontrada.");
        const { error } = await supabase.from("content_items").insert({
          owner_id: userData.user.id,
          client_id: useForm.client_id,
          title: useForm.title.trim(),
          content_format: libraryItem.content_format,
          status: useForm.status,
          pillar: libraryItem.category,
          journey_stage: "Atração",
          hook: libraryItem.hook,
          script,
          caption,
          cta,
          publication_date: useForm.publication_date || null,
          notes: `Criado a partir da Biblioteca Plenna: ${libraryItem.title}`,
          priority: "Média",
        });
        if (error) throw error;
        const { error: usageError } = await supabase.from("creative_library_items").update({ usage_count: libraryItem.usage_count + 1 }).eq("id", libraryItem.id);
        if (usageError) throw usageError;
        setCreativeItems((current) => current.map((item) => item.id === libraryItem.id ? { ...item, usage_count: item.usage_count + 1 } : item));
      } else {
        const raw = window.localStorage.getItem("plenna-demo-content-items");
        const values = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
        const now = new Date().toISOString();
        const client = clients.find((item) => item.id === useForm.client_id) ?? null;
        const created = normalizeContent({
          id: `local-content-${Date.now()}`,
          client_id: useForm.client_id,
          title: useForm.title.trim(),
          content_format: libraryItem.content_format,
          status: useForm.status,
          pillar: libraryItem.category,
          objective: "",
          journey_stage: "Atração",
          hook: libraryItem.hook,
          script,
          caption,
          cta,
          publication_date: useForm.publication_date,
          publication_time: "",
          reference_url: "",
          asset_url: "",
          notes: `Criado a partir da Biblioteca Plenna: ${libraryItem.title}`,
          priority: "Média",
          approval_token: createApprovalToken(),
          approval_status: "Não enviado",
          approval_due_date: "",
          approval_requested_at: "",
          approval_decided_at: "",
          approval_reviewer_name: "",
          approval_feedback: "",
          created_at: now,
          updated_at: now,
          clients: client,
        });
        window.localStorage.setItem("plenna-demo-content-items", JSON.stringify([created, ...values]));
        persistCreativeLocal(creativeItems.map((item) => item.id === libraryItem.id ? { ...item, usage_count: item.usage_count + 1, updated_at: now } : item));
      }
      setUseModalItem(null);
      setMessage("Conteúdo criado no planejamento. Abra Conteúdos para continuar a produção.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar o conteúdo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="CENTRAL DE RECURSOS"
        title="Biblioteca"
        description="Ativos dos clientes, referências, roteiros e modelos reutilizáveis em um só lugar."
        actionNode={<button className="primary-button" onClick={tab === "Clientes" ? openClientCreate : openCreativeCreate}><PlusIcon size={17}/>{tab === "Clientes" ? "Novo material" : "Novo modelo"}</button>}
      />

      <div className="data-mode-row">
        <span className={`connection-badge ${isSupabaseConfigured ? "connected" : "demo"}`}><i />{isSupabaseConfigured ? "Supabase conectado" : "Modo demonstração · salvo neste navegador"}</span>
        {message && <span className="inline-alert">{message}</span>}
      </div>

      <section className="library-stats-v18">
        <article><FolderIcon/><div><span>MATERIAIS DE CLIENTES</span><strong>{stats.clientAssets}</strong><small>Links e ativos organizados</small></div></article>
        <article><UsersIcon/><div><span>VISÍVEIS NO PORTAL</span><strong>{stats.portalAssets}</strong><small>Compartilhados com clientes</small></div></article>
        <article><SparklesIcon/><div><span>MODELOS CRIATIVOS</span><strong>{stats.creative}</strong><small>Ideias prontas para reutilizar</small></div></article>
        <article><HeartIcon/><div><span>FAVORITOS</span><strong>{stats.favorites}</strong><small>Acessos prioritários</small></div></article>
        <article><LayersIcon/><div><span>REUTILIZAÇÕES</span><strong>{stats.used}</strong><small>Conteúdos criados da biblioteca</small></div></article>
      </section>

      <section className="library-tab-shell-v18">
        <div className="library-main-tabs-v18">
          <button className={tab === "Clientes" ? "active" : ""} onClick={() => { setTab("Clientes"); setQuery(""); }}><FolderIcon size={17}/>Materiais dos clientes</button>
          <button className={tab === "Biblioteca criativa" ? "active" : ""} onClick={() => { setTab("Biblioteca criativa"); setQuery(""); }}><SparklesIcon size={17}/>Biblioteca criativa</button>
        </div>
        <div className="library-tab-explanation-v18">
          {tab === "Clientes" ? <><strong>Arquivos e links por cliente</strong><span>Organize Drive, Canva, CapCut, fotos, identidade visual e documentos. Escolha o que aparece no Portal do Cliente.</span></> : <><strong>Banco reutilizável da Sarah</strong><span>Salve ganchos, roteiros, CTAs, sequências e mensagens. Transforme qualquer modelo em conteúdo com um clique.</span></>}
        </div>
      </section>

      <div className="toolbar library-toolbar-v18">
        <div className="filter-search"><SearchIcon size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "Clientes" ? "Buscar material, cliente ou tag..." : "Buscar ideia, roteiro, gancho ou tag..."}/></div>
        {tab === "Clientes" ? <>
          <select className="filter-select" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option value="Todos">Todos os clientes</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select>
          <select className="filter-select" value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as ClientVisibilityFilter)}><option>Todos</option><option>Portal</option><option>Internos</option></select>
        </> : <>
          <select className="filter-select" value={creativeTypeFilter} onChange={(event) => setCreativeTypeFilter(event.target.value)}><option value="Todos">Todos os tipos</option>{CREATIVE_ITEM_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
          <button className={favoritesOnly ? "filter active" : "filter"} onClick={() => setFavoritesOnly((value) => !value)}><HeartIcon size={15}/>Favoritos</button>
        </>}
      </div>

      {loading ? <div className="clients-loading">Carregando biblioteca...</div> : tab === "Clientes" ? (
        filteredClientItems.length === 0 ? <div className="empty-state"><strong>Nenhum material encontrado</strong><p>Cadastre um link, pasta ou documento para um cliente.</p><button className="primary-button" onClick={openClientCreate}><PlusIcon size={16}/>Novo material</button></div> :
        <section className="client-library-grid-v18">{filteredClientItems.map((item) => <article className="client-library-card-v18" key={item.id}>
          <header><div className={`library-file-icon-v18 ${libraryClass(item.item_type)}`}>{item.item_type === "Pasta" ? <FolderIcon size={22}/> : item.item_type === "Link" ? <LinkIcon size={22}/> : <FileIcon size={22}/>}</div><div className="library-card-actions-v18"><button className={item.favorite ? "favorite active" : "favorite"} onClick={() => void toggleClientFavorite(item)} aria-label="Favoritar"><HeartIcon size={16}/></button><button onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}><MoreIcon size={17}/></button>{openMenu === item.id && <div className="library-card-menu-v18"><button onClick={() => openClientEdit(item)}>Editar</button><a href={item.url} target="_blank" rel="noreferrer">Abrir link</a><button className="danger" onClick={() => void deleteClientItem(item)}>Excluir</button></div>}</div></header>
          <span className="library-type-v18">{item.item_type} · {item.category}</span>
          <h3>{item.name}</h3>
          <p>{item.notes || "Material organizado na central do cliente."}</p>
          <div className="library-client-v18"><i style={{ background: item.clients?.accent ?? "#7B214B" }}/><div><strong>{item.clients?.name ?? "Cliente"}</strong><span>{item.clients?.segment || "Sem segmento"}</span></div></div>
          {item.tags.length > 0 && <div className="library-tags-v18">{item.tags.slice(0, 4).map((tag) => <span key={tag}>#{tag}</span>)}</div>}
          <footer><span className={item.portal_visible ? "portal-visible" : "internal-only"}>{item.portal_visible ? "Visível no portal" : "Somente Sarah"}</span><a href={item.url} target="_blank" rel="noreferrer">Abrir<ExternalLinkIcon size={14}/></a></footer>
        </article>)}</section>
      ) : (
        filteredCreativeItems.length === 0 ? <div className="empty-state"><strong>Nenhum modelo encontrado</strong><p>Salve a primeira ideia reutilizável da Sarah.</p><button className="primary-button" onClick={openCreativeCreate}><PlusIcon size={16}/>Novo modelo</button></div> :
        <section className="creative-library-grid-v18">{filteredCreativeItems.map((item) => <article className="creative-library-card-v18" key={item.id}>
          <header><div><span className={`creative-type-badge-v18 ${libraryClass(item.item_type)}`}>{item.item_type}</span><em>{item.content_format}</em></div><div className="library-card-actions-v18"><button className={item.favorite ? "favorite active" : "favorite"} onClick={() => void toggleCreativeFavorite(item)} aria-label="Favoritar"><HeartIcon size={16}/></button><button onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}><MoreIcon size={17}/></button>{openMenu === item.id && <div className="library-card-menu-v18"><button onClick={() => openCreativeEdit(item)}>Editar</button><button onClick={() => void copyCreative(item)}>Copiar texto</button><button className="danger" onClick={() => void deleteCreativeItem(item)}>Excluir</button></div>}</div></header>
          <span className="creative-category-v18">{item.category}</span>
          <h3>{item.title}</h3>
          {item.hook && <blockquote>{item.hook}</blockquote>}
          <p>{item.body || item.cta || "Modelo pronto para adaptar aos clientes."}</p>
          {item.tags.length > 0 && <div className="library-tags-v18">{item.tags.slice(0, 5).map((tag) => <span key={tag}>#{tag}</span>)}</div>}
          <div className="creative-card-meta-v18"><span><LayersIcon size={13}/>{item.usage_count} usos</span><span>Atualizado {formatLibraryDate(item.updated_at)}</span></div>
          <footer><button className="secondary-button" onClick={() => void copyCreative(item)}>{copiedId === item.id ? <CheckIcon size={15}/> : <CopyIcon size={15}/>} {copiedId === item.id ? "Copiado" : "Copiar"}</button><button className="primary-button" onClick={() => openUseModal(item)}>Usar com cliente<ArrowIcon size={15}/></button></footer>
        </article>)}</section>
      )}

      {clientModalOpen && <div className="modal-backdrop" onMouseDown={() => !saving && setClientModalOpen(false)}><section className="library-modal-v18" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span>MATERIAL DO CLIENTE</span><h2>{editingClientItem ? "Editar material" : "Novo material"}</h2><p>Centralize o link e decida se o cliente poderá vê-lo no portal.</p></div><button onClick={() => setClientModalOpen(false)}><CloseIcon/></button></header>
        <form onSubmit={saveClientItem}>
          <div className="library-form-grid-v18">
            <label>Cliente<select value={clientForm.client_id} onChange={(event) => setClientForm({ ...clientForm, client_id: event.target.value })} required><option value="">Selecione</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
            <label>Tipo<select value={clientForm.item_type} onChange={(event) => setClientForm({ ...clientForm, item_type: event.target.value as ClientLibraryPayload["item_type"] })}>{CLIENT_FILE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label className="full-field">Nome do material<input value={clientForm.name} onChange={(event) => setClientForm({ ...clientForm, name: event.target.value })} placeholder="Ex.: Manual da marca" required/></label>
            <label>Categoria<input value={clientForm.category} onChange={(event) => setClientForm({ ...clientForm, category: event.target.value })} placeholder="Fotos, Design, Contrato..."/></label>
            <label>Tags<input value={clientTagsText} onChange={(event) => setClientTagsText(event.target.value)} placeholder="canva, branding, agosto"/></label>
            <label className="full-field">Link<input type="text" value={clientForm.url} onChange={(event) => setClientForm({ ...clientForm, url: event.target.value })} placeholder="Drive, Canva, CapCut, site ou documento" required/></label>
            <label className="full-field">Observações<textarea rows={4} value={clientForm.notes} onChange={(event) => setClientForm({ ...clientForm, notes: event.target.value })} placeholder="Explique o que há no material ou como ele deve ser usado."/></label>
          </div>
          <div className="library-switches-v18"><label><input type="checkbox" checked={clientForm.portal_visible} onChange={(event) => setClientForm({ ...clientForm, portal_visible: event.target.checked })}/><span/><div><strong>Mostrar no Portal do Cliente</strong><small>Desative para manter o material somente na área interna da Sarah.</small></div></label><label><input type="checkbox" checked={clientForm.favorite} onChange={(event) => setClientForm({ ...clientForm, favorite: event.target.checked })}/><span/><div><strong>Marcar como favorito</strong><small>Deixa o material mais fácil de localizar.</small></div></label></div>
          {message && <p className="form-message">{message}</p>}
          <footer>{editingClientItem ? <button type="button" className="danger-button" onClick={() => void deleteClientItem(editingClientItem)} disabled={saving}>Excluir</button> : <span/>}<button type="button" className="secondary-button" onClick={() => setClientModalOpen(false)} disabled={saving}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar material"}</button></footer>
        </form>
      </section></div>}

      {creativeModalOpen && <div className="modal-backdrop" onMouseDown={() => !saving && setCreativeModalOpen(false)}><section className="library-modal-v18 creative-modal-v18" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span>BIBLIOTECA CRIATIVA</span><h2>{editingCreativeItem ? "Editar modelo" : "Novo modelo"}</h2><p>Guarde uma estrutura reutilizável, sem vincular a um cliente específico.</p></div><button onClick={() => setCreativeModalOpen(false)}><CloseIcon/></button></header>
        <form onSubmit={saveCreativeItem}>
          <div className="library-form-grid-v18">
            <label className="full-field">Título<input value={creativeForm.title} onChange={(event) => setCreativeForm({ ...creativeForm, title: event.target.value })} placeholder="Nome fácil de encontrar" required/></label>
            <label>Tipo<select value={creativeForm.item_type} onChange={(event) => setCreativeForm({ ...creativeForm, item_type: event.target.value as CreativeLibraryPayload["item_type"] })}>{CREATIVE_ITEM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label>Formato<select value={creativeForm.content_format} onChange={(event) => setCreativeForm({ ...creativeForm, content_format: event.target.value as CreativeLibraryPayload["content_format"] })}>{CONTENT_FORMATS.map((format) => <option key={format}>{format}</option>)}</select></label>
            <label>Categoria<select value={creativeForm.category} onChange={(event) => setCreativeForm({ ...creativeForm, category: event.target.value as CreativeLibraryPayload["category"] })}>{CREATIVE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Tags<input value={creativeTagsText} onChange={(event) => setCreativeTagsText(event.target.value)} placeholder="educativo, venda, objeção"/></label>
            <label className="full-field">Gancho<input value={creativeForm.hook} onChange={(event) => setCreativeForm({ ...creativeForm, hook: event.target.value })} placeholder="Primeira frase ou cena"/></label>
            <label className="full-field">Estrutura ou texto<textarea rows={8} value={creativeForm.body} onChange={(event) => setCreativeForm({ ...creativeForm, body: event.target.value })} placeholder="Roteiro, sequência, legenda, mensagem ou instruções de uso."/></label>
            <label className="full-field">CTA<input value={creativeForm.cta} onChange={(event) => setCreativeForm({ ...creativeForm, cta: event.target.value })} placeholder="Chamada para ação sugerida"/></label>
          </div>
          <div className="library-switches-v18"><label><input type="checkbox" checked={creativeForm.favorite} onChange={(event) => setCreativeForm({ ...creativeForm, favorite: event.target.checked })}/><span/><div><strong>Marcar como favorito</strong><small>Útil para estruturas usadas com frequência.</small></div></label></div>
          {message && <p className="form-message">{message}</p>}
          <footer>{editingCreativeItem ? <button type="button" className="danger-button" onClick={() => void deleteCreativeItem(editingCreativeItem)} disabled={saving}>Excluir</button> : <span/>}<button type="button" className="secondary-button" onClick={() => setCreativeModalOpen(false)} disabled={saving}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar modelo"}</button></footer>
        </form>
      </section></div>}

      {useModalItem && <div className="modal-backdrop" onMouseDown={() => !saving && setUseModalItem(null)}><section className="use-library-modal-v18" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header><div className="use-library-icon-v18"><SparklesIcon size={24}/></div><div><span>USAR MODELO</span><h2>Criar conteúdo para um cliente</h2><p>O roteiro será enviado diretamente para o Planejamento de Conteúdo.</p></div><button onClick={() => setUseModalItem(null)}><CloseIcon/></button></header>
        <div className="use-library-preview-v18"><span>{useModalItem.item_type} · {useModalItem.content_format}</span><strong>{useModalItem.title}</strong>{useModalItem.hook && <p>“{useModalItem.hook}”</p>}</div>
        <form onSubmit={useWithClient}>
          <div className="library-form-grid-v18">
            <label>Cliente<select value={useForm.client_id} onChange={(event) => setUseForm({ ...useForm, client_id: event.target.value })} required><option value="">Selecione</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label>Etapa inicial<select value={useForm.status} onChange={(event) => setUseForm({ ...useForm, status: event.target.value as ContentStatus })}>{CONTENT_STATUSES.slice(0, 4).map((status) => <option key={status}>{status}</option>)}</select></label>
            <label className="full-field">Título do conteúdo<input value={useForm.title} onChange={(event) => setUseForm({ ...useForm, title: event.target.value })} required/></label>
            <label className="full-field">Data de publicação opcional<input type="date" value={useForm.publication_date} onChange={(event) => setUseForm({ ...useForm, publication_date: event.target.value })}/></label>
          </div>
          {message && <p className="form-message">{message}</p>}
          <footer><button type="button" className="secondary-button" onClick={() => setUseModalItem(null)} disabled={saving}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Criando..." : "Criar no planejamento"}<ArrowIcon size={15}/></button></footer>
        </form>
      </section></div>}

      <section className="library-help-v18"><div><BookmarkIcon size={22}/><div><strong>Organização recomendada</strong><p>Use tags curtas e consistentes, como “branding”, “reels”, “jurídico” ou “objeção”. A biblioteca ficará mais valiosa conforme os melhores formatos forem registrados.</p></div></div><Link href="/conteudos">Abrir planejamento<ArrowIcon size={15}/></Link></section>
    </>
  );
}
