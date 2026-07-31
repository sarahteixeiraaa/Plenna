"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { CalendarIcon, CheckIcon, ClockIcon, CloseIcon, MoreIcon, PlusIcon, SearchIcon, SparklesIcon, VideoIcon } from "@/components/icons";
import { clients as demoClientData } from "@/lib/data";
import type { ContentClient } from "@/lib/content";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  COVERAGE_STATUSES,
  CoverageMoment,
  EquipmentItem,
  StoryCoverage,
  StoryCoveragePayload,
  coverageProgress,
  coverageStatusClass,
  createDemoCoverages,
  createLocalId,
  emptyCoveragePayload,
  formatCoverageDate,
  normalizeCoverage,
  stripCoverageRelations,
} from "@/lib/storymaker";

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

function attachClients(items: StoryCoverage[], clients: ContentClient[]) {
  return items.map((item) => ({
    ...item,
    clients: item.client_id ? clients.find((client) => client.id === item.client_id) ?? null : null,
  }));
}

function cloneEmptyPayload(): StoryCoveragePayload {
  return structuredClone(emptyCoveragePayload);
}

function payloadFromCoverage(item: StoryCoverage): StoryCoveragePayload {
  const { id: _id, owner_id: _owner, created_at: _created, updated_at: _updated, clients: _clients, ...payload } = item;
  return structuredClone(payload);
}

export default function StorymakerManager() {
  const [coverages, setCoverages] = useState<StoryCoverage[]>([]);
  const [clients, setClients] = useState<ContentClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StoryCoverage | null>(null);
  const [form, setForm] = useState<StoryCoveragePayload>(() => cloneEmptyPayload());
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setMessage("");
      if (!isSupabaseConfigured) {
        const clientRows = localClients();
        setClients(clientRows);
        try {
          const raw = window.localStorage.getItem("plenna-demo-story-coverages");
          const saved = raw ? (JSON.parse(raw) as StoryCoverage[]).map((row) => normalizeCoverage(row as unknown as Record<string, unknown>)) : createDemoCoverages(clientRows);
          if (!raw) window.localStorage.setItem("plenna-demo-story-coverages", JSON.stringify(saved.map(stripCoverageRelations)));
          setCoverages(attachClients(saved, clientRows));
        } catch {
          setCoverages(createDemoCoverages(clientRows));
        }
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const [{ data: clientData, error: clientError }, { data: coverageData, error: coverageError }] = await Promise.all([
          supabase.from("clients").select("id,name,segment,accent").order("name"),
          supabase.from("story_coverages").select("*, clients(name,segment,accent)").order("event_date", { ascending: true }),
        ]);
        if (clientError) throw clientError;
        if (coverageError) throw coverageError;
        setClients((clientData ?? []).map((item) => ({ id: String(item.id), name: String(item.name), segment: String(item.segment ?? ""), accent: String(item.accent ?? "#7B214B") })));
        setCoverages((coverageData ?? []).map((item) => normalizeCoverage(item as Record<string, unknown>)));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível carregar as coberturas.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function persistLocal(next: StoryCoverage[]) {
    setCoverages(next);
    window.localStorage.setItem("plenna-demo-story-coverages", JSON.stringify(next.map(stripCoverageRelations)));
  }

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return [...coverages]
      .filter((item) => statusFilter === "Todos" || item.status === statusFilter)
      .filter((item) => !search || [item.title, item.clients?.name ?? "", item.location, item.objective].some((value) => value.toLowerCase().includes(search)))
      .sort((a, b) => `${a.event_date}${a.start_time}`.localeCompare(`${b.event_date}${b.start_time}`));
  }, [coverages, query, statusFilter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);
    return {
      upcoming: coverages.filter((item) => item.event_date >= today && !["Finalizada", "Cancelada"].includes(item.status)).length,
      active: coverages.filter((item) => item.status === "Em cobertura").length,
      finalised: coverages.filter((item) => item.status === "Finalizada" && item.event_date.startsWith(currentMonth)).length,
      moments: coverages.reduce((total, item) => total + item.moments.length, 0),
    };
  }, [coverages]);

  function openCreate() {
    setEditing(null);
    setForm(cloneEmptyPayload());
    setMessage("");
    setModalOpen(true);
  }

  function openEdit(item: StoryCoverage) {
    setEditing(item);
    setForm(payloadFromCoverage(item));
    setMessage("");
    setOpenMenu(null);
    setModalOpen(true);
  }

  function clientRelation(clientId: string | null) {
    if (!clientId) return null;
    const client = clients.find((row) => row.id === clientId);
    return client ? { name: client.name, segment: client.segment, accent: client.accent } : null;
  }

  async function saveCoverage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const payload: StoryCoveragePayload = {
      ...form,
      title: form.title.trim(),
      location: form.location.trim(),
      objective: form.objective.trim(),
      style: form.style.trim(),
      platform: form.platform.trim(),
      contact_name: form.contact_name.trim(),
      contact_phone: form.contact_phone.trim(),
      schedule_notes: form.schedule_notes.trim(),
      important_people: form.important_people.map((item) => item.trim()).filter(Boolean),
      moments: form.moments.filter((item) => item.title.trim()).map((item) => ({ ...item, title: item.title.trim(), notes: item.notes.trim() })),
      equipment: form.equipment.filter((item) => item.label.trim()).map((item) => ({ ...item, label: item.label.trim() })),
      mentions: form.mentions.trim(),
      hashtags: form.hashtags.trim(),
      links: form.links.trim(),
      cta: form.cta.trim(),
      delivered_url: form.delivered_url.trim(),
      final_notes: form.final_notes.trim(),
    };

    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const databasePayload = { ...payload, event_date: payload.event_date || null, start_time: payload.start_time || null, end_time: payload.end_time || null };
        if (editing) {
          const { data, error } = await supabase.from("story_coverages").update(databasePayload).eq("id", editing.id).select("*, clients(name,segment,accent)").single();
          if (error) throw error;
          const updated = normalizeCoverage(data as Record<string, unknown>);
          setCoverages((current) => current.map((item) => item.id === updated.id ? updated : item));
        } else {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) throw userError ?? new Error("Sessão não encontrada.");
          const { data, error } = await supabase.from("story_coverages").insert({ ...databasePayload, owner_id: userData.user.id }).select("*, clients(name,segment,accent)").single();
          if (error) throw error;
          setCoverages((current) => [normalizeCoverage(data as Record<string, unknown>), ...current]);
        }
      } else {
        const now = new Date().toISOString();
        const record: StoryCoverage = editing
          ? { ...editing, ...payload, updated_at: now, clients: clientRelation(payload.client_id) }
          : { ...payload, id: `local-coverage-${Date.now()}`, created_at: now, updated_at: now, clients: clientRelation(payload.client_id) };
        persistLocal(editing ? coverages.map((item) => item.id === editing.id ? record : item) : [record, ...coverages]);
      }
      setModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar a cobertura.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCoverage(item: StoryCoverage) {
    if (!window.confirm(`Excluir a cobertura “${item.title}”?`)) return;
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase.from("story_coverages").delete().eq("id", item.id);
        if (error) throw error;
        setCoverages((current) => current.filter((row) => row.id !== item.id));
      } else {
        persistLocal(coverages.filter((row) => row.id !== item.id));
      }
      setOpenMenu(null);
      if (editing?.id === item.id) setModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir a cobertura.");
    }
  }

  function addMoment() {
    setForm((current) => ({ ...current, moments: [...current.moments, { id: createLocalId("moment"), title: "", notes: "", status: "Pendente" }] }));
  }

  function updateMoment(id: string, patch: Partial<CoverageMoment>) {
    setForm((current) => ({ ...current, moments: current.moments.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  function addEquipment() {
    setForm((current) => ({ ...current, equipment: [...current.equipment, { id: createLocalId("equipment"), label: "", checked: false }] }));
  }

  function updateEquipment(id: string, patch: Partial<EquipmentItem>) {
    setForm((current) => ({ ...current, equipment: current.equipment.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  return <>
    <PageHeader eyebrow="CAPTAÇÃO AO VIVO" title="Storymaker" description="Planeje, execute e finalize coberturas com segurança, inclusive pelo celular." actionNode={<button className="primary-button" onClick={openCreate}><PlusIcon size={17}/>Nova cobertura</button>}/>

    <div className="data-mode-row"><span className={`connection-badge ${isSupabaseConfigured ? "connected" : "demo"}`}><i/>{isSupabaseConfigured ? "Supabase conectado" : "Modo demonstração · salvo neste navegador"}</span>{message && <span className="inline-alert">{message}</span>}</div>

    <section className="storymaker-stats-v16">
      <article><span>PRÓXIMAS</span><strong>{stats.upcoming}</strong><small>Coberturas agendadas</small></article>
      <article><span>EM ANDAMENTO</span><strong>{stats.active}</strong><small>Modo cobertura ativo</small></article>
      <article><span>FINALIZADAS NO MÊS</span><strong>{stats.finalised}</strong><small>Entregas concluídas</small></article>
      <article><span>MOMENTOS PLANEJADOS</span><strong>{stats.moments}</strong><small>Shot list total</small></article>
    </section>

    <div className="toolbar storymaker-toolbar-v16">
      <div className="filter-search"><SearchIcon size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar evento, cliente ou local..."/></div>
      <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todos</option>{COVERAGE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
    </div>

    {loading ? <div className="clients-loading">Carregando coberturas...</div> : filtered.length === 0 ? <div className="empty-state"><strong>Nenhuma cobertura encontrada</strong><p>Cadastre o próximo evento que a Sarah irá acompanhar.</p><button className="primary-button" onClick={openCreate}><PlusIcon size={16}/>Nova cobertura</button></div> : <section className="coverage-grid-v16">
      {filtered.map((item) => {
        const progress = coverageProgress(item);
        return <article className="coverage-card-v16" key={item.id}>
          <div className="coverage-card-accent" style={{ background: item.clients?.accent ?? "#7B214B" }}/>
          <header><span className={`coverage-status ${coverageStatusClass(item.status)}`}>{item.status}</span><div className="coverage-card-menu-wrap"><button onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}><MoreIcon size={18}/></button>{openMenu === item.id && <div className="content-card-menu"><button onClick={() => openEdit(item)}>Editar</button><button className="danger" onClick={() => void deleteCoverage(item)}>Excluir</button></div>}</div></header>
          <div className="coverage-card-client"><i style={{ background: item.clients?.accent ?? "#7B214B" }}/>{item.clients?.name ?? "Sem cliente"}</div>
          <h2>{item.title}</h2>
          <div className="coverage-meta-v16"><span><CalendarIcon size={15}/>{formatCoverageDate(item.event_date)}</span><span><ClockIcon size={15}/>{item.start_time || "Horário a definir"}{item.end_time ? `–${item.end_time}` : ""}</span>{item.location && <span><VideoIcon size={15}/>{item.location}</span>}</div>
          <div className="coverage-progress-v16"><div><span>Captação</span><strong>{progress.captured}/{progress.total}</strong></div><div className="coverage-progress-track"><i style={{ width: `${progress.percent}%` }}/></div><small>{progress.published} publicado(s)</small></div>
          <footer><button className="secondary-button" onClick={() => openEdit(item)}>Editar planejamento</button><Link className="primary-button" href={`/storymaker/${item.id}`}>{item.status === "Em cobertura" ? "Continuar cobertura" : "Abrir modo cobertura"}</Link></footer>
        </article>;
      })}
    </section>}

    {modalOpen && <div className="modal-backdrop" onMouseDown={() => !saving && setModalOpen(false)}><section className="storymaker-modal-v16" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-header"><div><span className="eyebrow">PLANEJAMENTO DE COBERTURA</span><h2>{editing ? "Editar cobertura" : "Nova cobertura"}</h2><p>Organize evento, roteiro, equipamentos e textos antes de sair para captar.</p></div><button className="modal-close" onClick={() => setModalOpen(false)}><CloseIcon size={18}/></button></div>
      <form className="storymaker-form-v16" onSubmit={saveCoverage}>
        <section><div className="content-form-section-title"><span>01</span><div><strong>Evento</strong><small>Informações operacionais da cobertura.</small></div></div><div className="content-form-grid">
          <label className="full-field">Nome da cobertura<input required autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Lançamento da coleção de inverno"/></label>
          <label>Cliente<select value={form.client_id ?? ""} onChange={(event) => setForm({ ...form, client_id: event.target.value || null })}><option value="">Sem cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
          <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as StoryCoveragePayload["status"] })}>{COVERAGE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label>Data<input type="date" value={form.event_date} onChange={(event) => setForm({ ...form, event_date: event.target.value })}/></label>
          <label>Início<input type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })}/></label>
          <label>Término<input type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })}/></label>
          <label>Plataforma<input value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })}/></label>
          <label className="full-field">Local<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Endereço ou nome do espaço"/></label>
          <label>Contato no evento<input value={form.contact_name} onChange={(event) => setForm({ ...form, contact_name: event.target.value })}/></label>
          <label>Telefone<input value={form.contact_phone} onChange={(event) => setForm({ ...form, contact_phone: event.target.value })}/></label>
        </div></section>

        <section><div className="content-form-section-title"><span>02</span><div><strong>Direção da cobertura</strong><small>Objetivo, linguagem e pessoas importantes.</small></div></div><div className="content-form-grid">
          <label className="full-field">Objetivo<textarea rows={3} value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} placeholder="O que a cobertura precisa transmitir e gerar?"/></label>
          <label>Estilo<input value={form.style} onChange={(event) => setForm({ ...form, style: event.target.value })}/></label>
          <label>Pessoas importantes<textarea rows={3} value={form.important_people.join("\n")} onChange={(event) => setForm({ ...form, important_people: event.target.value.split("\n") })} placeholder="Uma pessoa por linha"/></label>
          <label className="full-field">Programação e horários importantes<textarea rows={4} value={form.schedule_notes} onChange={(event) => setForm({ ...form, schedule_notes: event.target.value })} placeholder="18h30 recepção; 19h abertura; 20h fala principal..."/></label>
        </div></section>

        <section><div className="content-form-section-title"><span>03</span><div><strong>Shot list</strong><small>Momentos que não podem faltar.</small></div></div><div className="coverage-edit-list-v16">
          {form.moments.map((moment, index) => <div key={moment.id}><span>{String(index + 1).padStart(2, "0")}</span><input value={moment.title} onChange={(event) => updateMoment(moment.id, { title: event.target.value })} placeholder="Momento obrigatório"/><input value={moment.notes} onChange={(event) => updateMoment(moment.id, { notes: event.target.value })} placeholder="Observação opcional"/><button type="button" onClick={() => setForm((current) => ({ ...current, moments: current.moments.filter((item) => item.id !== moment.id) }))}>×</button></div>)}
          <button type="button" className="dashed-add-button" onClick={addMoment}><PlusIcon size={15}/>Adicionar momento</button>
        </div></section>

        <section><div className="content-form-section-title"><span>04</span><div><strong>Equipamentos</strong><small>Checklist para evitar imprevistos.</small></div></div><div className="equipment-edit-grid-v16">
          {form.equipment.map((item) => <label key={item.id}><input type="checkbox" checked={item.checked} onChange={(event) => updateEquipment(item.id, { checked: event.target.checked })}/><input value={item.label} onChange={(event) => updateEquipment(item.id, { label: event.target.value })}/><button type="button" onClick={() => setForm((current) => ({ ...current, equipment: current.equipment.filter((row) => row.id !== item.id) }))}>×</button></label>)}
          <button type="button" className="dashed-add-button" onClick={addEquipment}><PlusIcon size={15}/>Adicionar equipamento</button>
        </div></section>

        <section><div className="content-form-section-title"><span>05</span><div><strong>Textos preparados e entrega</strong><small>Copie rapidamente durante a cobertura.</small></div></div><div className="content-form-grid">
          <label>Marcações<textarea rows={3} value={form.mentions} onChange={(event) => setForm({ ...form, mentions: event.target.value })} placeholder="@cliente @parceiro"/></label>
          <label>Hashtags<textarea rows={3} value={form.hashtags} onChange={(event) => setForm({ ...form, hashtags: event.target.value })} placeholder="#evento #marca"/></label>
          <label className="full-field">Links<textarea rows={3} value={form.links} onChange={(event) => setForm({ ...form, links: event.target.value })} placeholder="Link de compra, WhatsApp, inscrição..."/></label>
          <label className="full-field">CTA final<input value={form.cta} onChange={(event) => setForm({ ...form, cta: event.target.value })} placeholder="Ex.: Chame no direct para saber mais"/></label>
          <label className="full-field">Pasta de entrega<input type="url" value={form.delivered_url} onChange={(event) => setForm({ ...form, delivered_url: event.target.value })} placeholder="Drive ou pasta final"/></label>
          <label className="full-field">Observações finais<textarea rows={3} value={form.final_notes} onChange={(event) => setForm({ ...form, final_notes: event.target.value })}/></label>
        </div></section>

        {message && <p className="form-message">{message}</p>}
        <div className="content-modal-actions">{editing ? <button type="button" className="danger-button" onClick={() => void deleteCoverage(editing)} disabled={saving}>Excluir</button> : <span/>}<button type="button" className="secondary-button" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar cobertura"}</button></div>
      </form>
    </section></div>}
  </>;
}
