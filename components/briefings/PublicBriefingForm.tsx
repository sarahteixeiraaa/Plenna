"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowIcon, CheckIcon, ClockIcon } from "@/components/icons";
import { BriefingAnswers, BriefingRecord, briefingSteps, calculateBriefingProgress } from "@/lib/briefing";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { clients as demoClientData } from "@/lib/data";

type PublicBriefingData = {
  briefing_id: string;
  title: string;
  client_name: string;
  client_segment: string;
  status: string;
  current_step: number;
  progress: number;
  answers: BriefingAnswers;
  updated_at: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function normalizePublicData(value: Record<string, unknown>): PublicBriefingData {
  return {
    briefing_id: String(value.briefing_id ?? value.id ?? ""),
    title: String(value.title ?? "Briefing Estratégico"),
    client_name: String(value.client_name ?? "Cliente"),
    client_segment: String(value.client_segment ?? ""),
    status: String(value.status ?? "Não iniciado"),
    current_step: Math.max(0, Math.min(briefingSteps.length - 1, Number(value.current_step ?? 0))),
    progress: Number(value.progress ?? 0),
    answers: (value.answers as BriefingAnswers) ?? {},
    updated_at: String(value.updated_at ?? new Date().toISOString()),
  };
}

function readLocalBriefing(token: string): PublicBriefingData | null {
  try {
    const rawBriefings = window.localStorage.getItem("plenna-demo-briefings");
    const rawClients = window.localStorage.getItem("plenna-demo-clients");
    if (!rawBriefings) return null;
    const briefings = JSON.parse(rawBriefings) as BriefingRecord[];
    const clients = rawClients ? JSON.parse(rawClients) as Array<Record<string, unknown>> : demoClientData.map((client, index) => ({ id: `demo-${index + 1}`, name: client.name, segment: client.segment }));
    const briefing = briefings.find((item) => item.public_token === token);
    if (!briefing) return null;
    const client = clients.find((item) => String(item.id) === briefing.client_id);
    return normalizePublicData({
      briefing_id: briefing.id,
      title: briefing.title,
      client_name: client?.name ?? "Cliente",
      client_segment: client?.segment ?? "",
      status: briefing.status,
      current_step: briefing.current_step,
      progress: briefing.progress,
      answers: briefing.answers,
      updated_at: briefing.updated_at,
    });
  } catch {
    return null;
  }
}

function saveLocalBriefing(token: string, answers: BriefingAnswers, currentStep: number, progress: number, submit: boolean) {
  const raw = window.localStorage.getItem("plenna-demo-briefings");
  if (!raw) throw new Error("Briefing não encontrado.");
  const briefings = JSON.parse(raw) as BriefingRecord[];
  const index = briefings.findIndex((item) => item.public_token === token);
  if (index < 0) throw new Error("Briefing não encontrado.");
  const now = new Date().toISOString();
  const existing = briefings[index];
  briefings[index] = {
    ...existing,
    answers,
    current_step: currentStep,
    progress,
    status: submit || existing.status === "Concluído" ? "Concluído" : progress > 0 ? "Em andamento" : "Não iniciado",
    completed_at: submit ? now : existing.completed_at,
    updated_at: now,
  };
  window.localStorage.setItem("plenna-demo-briefings", JSON.stringify(briefings));
}

export default function PublicBriefingForm({ token }: { token: string }) {
  const [data, setData] = useState<PublicBriefingData | null>(null);
  const [answers, setAnswers] = useState<BriefingAnswers>({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [submitted, setSubmitted] = useState(false);
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = useMemo(() => calculateBriefingProgress(answers), [answers]);
  const current = briefingSteps[step];

  const persist = useCallback(async (nextAnswers: BriefingAnswers, nextStep: number, submit = false) => {
    setSaveState("saving");
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { data: result, error: rpcError } = await supabase.rpc("save_public_briefing", {
          p_token: token,
          p_answers: nextAnswers,
          p_current_step: nextStep,
          p_progress: calculateBriefingProgress(nextAnswers),
          p_submit: submit,
        });
        if (rpcError) throw rpcError;
        if (!result) throw new Error("Não foi possível salvar as respostas.");
      } else {
        saveLocalBriefing(token, nextAnswers, nextStep, calculateBriefingProgress(nextAnswers), submit);
      }
      setSaveState("saved");
      if (submit) setSubmitted(true);
    } catch (saveError) {
      setSaveState("error");
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar as respostas.");
    }
  }, [token]);

  useEffect(() => {
    async function load() {
      try {
        let result: PublicBriefingData | null = null;
        if (isSupabaseConfigured) {
          const supabase = createClient();
          const { data: rpcData, error: rpcError } = await supabase.rpc("get_public_briefing", { p_token: token });
          if (rpcError) throw rpcError;
          if (rpcData && typeof rpcData === "object") result = normalizePublicData(rpcData as Record<string, unknown>);
        } else {
          result = readLocalBriefing(token);
        }
        if (!result?.briefing_id) throw new Error("Este link de briefing não foi encontrado ou não está mais disponível.");
        setData(result);
        setAnswers(result.answers ?? {});
        setStep(result.current_step ?? 0);
        setSubmitted(result.status === "Concluído" || result.status === "Revisado");
        hydrated.current = true;
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Não foi possível abrir o briefing.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token]);

  useEffect(() => {
    if (!hydrated.current || loading || submitted) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(answers, step), 900);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [answers, step, loading, persist, submitted]);

  function updateAnswer(fieldId: string, value: string) {
    setError("");
    setAnswers((currentAnswers) => ({ ...currentAnswers, [fieldId]: value }));
    setSaveState("idle");
  }

  async function goTo(nextStep: number) {
    const safeStep = Math.max(0, Math.min(briefingSteps.length - 1, nextStep));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStep(safeStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
    await persist(answers, safeStep);
  }

  async function submitBriefing() {
    const missing = briefingSteps.flatMap((briefingStep) => briefingStep.fields).filter((field) => field.required && !String(answers[field.id] ?? "").trim());
    if (missing.length > 0) {
      const missingField = missing[0];
      const missingStep = briefingSteps.findIndex((briefingStep) => briefingStep.fields.some((field) => field.id === missingField.id));
      setStep(Math.max(0, missingStep));
      setError(`Antes de enviar, responda: “${missingField.label}”`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError("");
    await persist(answers, briefingSteps.length - 1, true);
  }

  if (loading) return <main className="public-briefing-page"><div className="public-briefing-loading">Preparando seu briefing...</div></main>;

  if (!data) return <main className="public-briefing-page"><section className="public-briefing-error"><div className="public-brand-mark">P<span>•</span></div><h1>Não foi possível abrir o briefing</h1><p>{error}</p></section></main>;

  if (submitted) return <main className="public-briefing-page public-briefing-success-page">
    <section className="public-briefing-success">
      <div className="success-check"><CheckIcon size={34}/></div>
      <span>BRIEFING CONCLUÍDO</span>
      <h1>Obrigada pelas informações, {data.client_name}.</h1>
      <p>As respostas foram enviadas para Sarah Teixeira e serão utilizadas na preparação do diagnóstico e da reunião de onboarding.</p>
      <div className="success-summary"><strong>{progress}% preenchido</strong><span>As informações ficam salvas com segurança na Plenna.</span></div>
      <button className="secondary-button" onClick={() => setSubmitted(false)}>Revisar respostas</button>
    </section>
  </main>;

  return (
    <main className="public-briefing-page">
      <header className="public-briefing-topbar">
        <div className="public-brand"><div className="public-brand-mark">P<span>•</span></div><div><strong>Plenna</strong><small>por Sarah Teixeira</small></div></div>
        <div className={`autosave-state ${saveState}`}>
          {saveState === "saving" ? <><ClockIcon size={14}/>Salvando...</> : saveState === "error" ? "Erro ao salvar" : <><CheckIcon size={14}/>Respostas salvas</>}
        </div>
      </header>

      <div className="public-briefing-layout">
        <aside className="public-briefing-sidebar">
          <span className="public-eyebrow">PRÉ-BRIEFING ESTRATÉGICO</span>
          <h1>{data.client_name}</h1>
          <p>{data.client_segment || data.title}</p>
          <div className="public-overall-progress"><div><span>Progresso geral</span><strong>{progress}%</strong></div><div className="progress-bar"><i style={{ width: `${progress}%` }}/></div></div>
          <nav>{briefingSteps.map((briefingStep, index) => <button key={briefingStep.id} className={index === step ? "active" : index < step ? "complete" : ""} onClick={() => void goTo(index)}><em>{index < step ? <CheckIcon size={13}/> : index + 1}</em><span><strong>{briefingStep.shortTitle}</strong><small>{briefingStep.title}</small></span></button>)}</nav>
          <div className="public-help-box"><strong>Por que tantas perguntas?</strong><p>Elas evitam uma estratégia genérica e ajudam a conectar conteúdo, posicionamento e jornada de compra.</p></div>
        </aside>

        <section className="public-briefing-card">
          <div className="public-step-heading"><span>ETAPA {step + 1} DE {briefingSteps.length}</span><h2>{current.title}</h2><p>{current.description}</p></div>
          {error && <div className="public-form-error">{error}</div>}
          <div className="public-fields">{current.fields.map((field) => <label key={field.id} className={field.type === "textarea" ? "public-field textarea-field" : "public-field"}>
            <span>{field.label}{field.required && <b>*</b>}</span>
            <small>{field.help}</small>
            {field.type === "textarea" ? <textarea value={answers[field.id] ?? ""} onChange={(event) => updateAnswer(field.id, event.target.value)} placeholder={field.placeholder} rows={5}/> : field.type === "select" ? <select value={answers[field.id] ?? ""} onChange={(event) => updateAnswer(field.id, event.target.value)}><option value="">Selecione uma opção</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input value={answers[field.id] ?? ""} onChange={(event) => updateAnswer(field.id, event.target.value)} placeholder={field.placeholder}/>} 
          </label>)}</div>
          <footer className="public-form-actions">
            <button className="secondary-button" disabled={step === 0} onClick={() => void goTo(step - 1)}>Voltar</button>
            {step < briefingSteps.length - 1 ? <button className="primary-button" onClick={() => void goTo(step + 1)}>Salvar e continuar <ArrowIcon size={16}/></button> : <button className="primary-button" onClick={() => void submitBriefing()}>Concluir e enviar <CheckIcon size={16}/></button>}
          </footer>
        </section>
      </div>
    </main>
  );
}
