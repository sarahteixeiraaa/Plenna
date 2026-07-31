"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckIcon, ClockIcon, SparklesIcon, VideoIcon } from "@/components/icons";
import { clients as demoClientData } from "@/lib/data";
import type { ContentClient } from "@/lib/content";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  CoverageMoment,
  EquipmentItem,
  MomentStatus,
  StoryCoverage,
  coverageProgress,
  coverageStatusClass,
  formatCoverageDate,
  momentStatusClass,
  normalizeCoverage,
  stripCoverageRelations,
} from "@/lib/storymaker";

function localClients(): ContentClient[] {
  try {
    const raw = window.localStorage.getItem("plenna-demo-clients");
    if (!raw) return demoClientData.map((client, index) => ({ id: `demo-${index + 1}`, name: client.name, segment: client.segment, accent: client.accent }));
    return (JSON.parse(raw) as Array<Record<string, unknown>>).map((value) => ({
      id: String(value.id),
      name: String(value.name ?? "Cliente"),
      segment: String(value.segment ?? ""),
      accent: String(value.accent ?? "#7B214B"),
    }));
  } catch {
    return [];
  }
}

function loadLocalCoverage(id: string): StoryCoverage | null {
  try {
    const raw = window.localStorage.getItem("plenna-demo-story-coverages");
    if (!raw) return null;
    const clients = localClients();
    const item = (JSON.parse(raw) as Array<Record<string, unknown>>).map(normalizeCoverage).find((row) => row.id === id);
    if (!item) return null;
    return {
      ...item,
      clients: item.client_id ? clients.find((client) => client.id === item.client_id) ?? null : null,
    };
  } catch {
    return null;
  }
}

function persistLocalCoverage(coverage: StoryCoverage) {
  const raw = window.localStorage.getItem("plenna-demo-story-coverages");
  const values = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
  const next = values.map((value) => String(value.id) === coverage.id ? stripCoverageRelations(coverage) : value);
  window.localStorage.setItem("plenna-demo-story-coverages", JSON.stringify(next));
}

const nextMomentStatus: Record<MomentStatus, MomentStatus> = {
  Pendente: "Capturado",
  Capturado: "Publicado",
  Publicado: "Pendente",
};

export default function CoverageMode({ coverageId }: { coverageId: string }) {
  const [coverage, setCoverage] = useState<StoryCoverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMessage("");
      try {
        if (!isSupabaseConfigured) {
          const local = loadLocalCoverage(coverageId);
          if (!local) throw new Error("Cobertura não encontrada neste navegador.");
          setCoverage(local);
          return;
        }
        const supabase = createClient();
        const { data, error } = await supabase.from("story_coverages").select("*, clients(name,segment,accent)").eq("id", coverageId).single();
        if (error) throw error;
        setCoverage(normalizeCoverage(data as Record<string, unknown>));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível abrir a cobertura.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [coverageId]);

  async function persist(patch: Partial<StoryCoverage>) {
    if (!coverage) return;
    setSaving(true);
    setMessage("");
    const updated: StoryCoverage = { ...coverage, ...patch, updated_at: new Date().toISOString() };
    setCoverage(updated);
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const databasePatch = { ...patch } as Record<string, unknown>;
        delete databasePatch.clients;
        delete databasePatch.owner_id;
        delete databasePatch.created_at;
        delete databasePatch.updated_at;
        const { error } = await supabase.from("story_coverages").update(databasePatch).eq("id", coverage.id);
        if (error) throw error;
      } else {
        persistLocalCoverage(updated);
      }
    } catch (error) {
      setCoverage(coverage);
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar a atualização.");
    } finally {
      setSaving(false);
    }
  }

  function updateMoment(moment: CoverageMoment) {
    if (!coverage) return;
    const moments = coverage.moments.map((item) => item.id === moment.id ? { ...item, status: nextMomentStatus[item.status] } : item);
    void persist({ moments });
  }

  function toggleEquipment(item: EquipmentItem) {
    if (!coverage) return;
    const equipment = coverage.equipment.map((row) => row.id === item.id ? { ...row, checked: !row.checked } : row);
    void persist({ equipment });
  }

  async function copyText(label: string, value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setMessage("Não foi possível copiar automaticamente.");
    }
  }

  const progress = useMemo(() => coverage ? coverageProgress(coverage) : { total: 0, captured: 0, published: 0, percent: 0 }, [coverage]);
  const equipmentDone = useMemo(() => coverage?.equipment.filter((item) => item.checked).length ?? 0, [coverage]);

  if (loading) return <div className="coverage-mode-loading">Carregando modo cobertura...</div>;
  if (!coverage) return <div className="coverage-mode-error"><strong>Cobertura não encontrada</strong><p>{message}</p><Link className="secondary-button" href="/storymaker">Voltar ao Storymaker</Link></div>;

  return <div className="coverage-mode-v16">
    <header className="coverage-mode-header-v16">
      <div><Link href="/storymaker">← Voltar</Link><span>MODO COBERTURA</span><h1>{coverage.title}</h1><p>{coverage.clients?.name ?? "Sem cliente"} · {formatCoverageDate(coverage.event_date)}{coverage.start_time ? ` · ${coverage.start_time}` : ""}</p></div>
      <div><span className={`coverage-status ${coverageStatusClass(coverage.status)}`}>{coverage.status}</span>{coverage.status !== "Em cobertura" && coverage.status !== "Finalizada" && <button className="primary-button" onClick={() => void persist({ status: "Em cobertura" })} disabled={saving}><VideoIcon size={17}/>Iniciar cobertura</button>}{coverage.status === "Em cobertura" && <button className="primary-button" onClick={() => void persist({ status: "Finalizada" })} disabled={saving}><CheckIcon size={17}/>Finalizar</button>}</div>
    </header>

    {message && <div className="coverage-mode-message">{message}</div>}

    <section className="coverage-live-summary-v16">
      <article><span>PROGRESSO</span><strong>{progress.percent}%</strong><div className="coverage-progress-track"><i style={{ width: `${progress.percent}%` }}/></div></article>
      <article><span>CAPTURADOS</span><strong>{progress.captured}/{progress.total}</strong><small>{progress.published} já publicados</small></article>
      <article><span>EQUIPAMENTOS</span><strong>{equipmentDone}/{coverage.equipment.length}</strong><small>itens conferidos</small></article>
    </section>

    <div className="coverage-live-grid-v16">
      <section className="coverage-live-main-v16">
        <div className="coverage-live-section-title"><div><span>SHOT LIST</span><h2>Momentos obrigatórios</h2></div><small>Toque para avançar: pendente → capturado → publicado</small></div>
        <div className="coverage-live-moments-v16">
          {coverage.moments.map((moment, index) => <button key={moment.id} className={momentStatusClass(moment.status)} onClick={() => updateMoment(moment)} disabled={saving}>
            <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{moment.title}</strong>{moment.notes && <small>{moment.notes}</small>}</div><em>{moment.status}</em>
          </button>)}
        </div>
      </section>

      <aside className="coverage-live-side-v16">
        <section><div className="coverage-live-section-title"><div><span>PRÉ-EVENTO</span><h2>Equipamentos</h2></div></div><div className="coverage-live-equipment-v16">{coverage.equipment.map((item) => <button key={item.id} className={item.checked ? "checked" : ""} onClick={() => toggleEquipment(item)} disabled={saving}><i>{item.checked && <CheckIcon size={14}/>}</i><span>{item.label}</span></button>)}</div></section>

        {(coverage.schedule_notes || coverage.important_people.length > 0) && <section><div className="coverage-live-section-title"><div><span>PROGRAMAÇÃO</span><h2>Pontos de atenção</h2></div></div>{coverage.schedule_notes && <p className="coverage-pre-line">{coverage.schedule_notes}</p>}{coverage.important_people.length > 0 && <div className="coverage-important-people-v16"><strong>Pessoas importantes</strong>{coverage.important_people.map((person) => <span key={person}>{person}</span>)}</div>}</section>}

        <section><div className="coverage-live-section-title"><div><span>TEXTOS RÁPIDOS</span><h2>Copiar e publicar</h2></div></div><div className="coverage-copy-list-v16">
          {[{ label: "Marcações", value: coverage.mentions }, { label: "Hashtags", value: coverage.hashtags }, { label: "Links", value: coverage.links }, { label: "CTA final", value: coverage.cta }].filter((item) => item.value).map((item) => <button key={item.label} onClick={() => void copyText(item.label, item.value)}><div><strong>{item.label}</strong><span>{item.value}</span></div><em>{copied === item.label ? "Copiado!" : "Copiar"}</em></button>)}
          {!coverage.mentions && !coverage.hashtags && !coverage.links && !coverage.cta && <p className="coverage-empty-copy">Nenhum texto preparado.</p>}
        </div></section>

        {(coverage.contact_name || coverage.contact_phone || coverage.location) && <section className="coverage-contact-card-v16"><SparklesIcon size={20}/><div><strong>Apoio no evento</strong>{coverage.contact_name && <span>{coverage.contact_name}</span>}{coverage.contact_phone && <a href={`tel:${coverage.contact_phone}`}>{coverage.contact_phone}</a>}{coverage.location && <small>{coverage.location}</small>}</div></section>}
      </aside>
    </div>
  </div>;
}
