"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { ArrowIcon, CheckIcon, ClipboardIcon, FileIcon, PlusIcon, UsersIcon } from "@/components/icons";
import {
  PortalClient,
  PortalFile,
  PortalTask,
  PortalTaskPriority,
  PortalTaskStatus,
  formatPortalDate,
  normalizePortalClient,
  normalizePortalFile,
  normalizePortalTask,
  portalInitials,
  portalStatusClass,
  portalUrl,
} from "@/lib/portal";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const DEFAULT_WELCOME = "Bem-vindo ao seu espaço na Plenna. Acompanhe conteúdos, reuniões, arquivos e pendências em um só lugar.";

const emptyTask = {
  title: "",
  description: "",
  due_date: "",
  priority: "Média" as PortalTaskPriority,
};

const emptyFile = {
  name: "",
  category: "Geral",
  url: "",
  notes: "",
};

function demoClients(): PortalClient[] {
  const stored = window.localStorage.getItem("plenna-demo-clients");
  const values = stored ? JSON.parse(stored) as Array<Record<string, unknown>> : [];
  return values.map((value, index) => normalizePortalClient({
    ...value,
    portal_token: value.portal_token || `demo-portal-${String(value.id ?? index + 1)}`,
    portal_enabled: value.portal_enabled ?? false,
    portal_welcome_message: value.portal_welcome_message || DEFAULT_WELCOME,
    portal_last_access_at: value.portal_last_access_at || "",
    has_portal_code: value.has_portal_code ?? false,
  }));
}

export default function PortalManager() {
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [tasks, setTasks] = useState<PortalTask[]>([]);
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [welcome, setWelcome] = useState(DEFAULT_WELCOME);
  const [accessCode, setAccessCode] = useState("");
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [fileForm, setFileForm] = useState(emptyFile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selected = useMemo(() => clients.find((client) => client.id === selectedId) ?? null, [clients, selectedId]);
  const selectedTasks = useMemo(() => tasks.filter((task) => task.client_id === selectedId), [tasks, selectedId]);
  const selectedFiles = useMemo(() => files.filter((file) => file.client_id === selectedId), [files, selectedId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (!isSupabaseConfigured) {
          const nextClients = demoClients();
          const taskRaw = window.localStorage.getItem("plenna-demo-portal-tasks");
          const fileRaw = window.localStorage.getItem("plenna-demo-portal-files");
          setClients(nextClients);
          setTasks(taskRaw ? (JSON.parse(taskRaw) as Array<Record<string, unknown>>).map(normalizePortalTask) : []);
          setFiles(fileRaw ? (JSON.parse(fileRaw) as Array<Record<string, unknown>>).map(normalizePortalFile) : []);
          setSelectedId(nextClients[0]?.id ?? "");
          return;
        }

        const supabase = createClient();
        const [{ data: clientData, error: clientError }, { data: taskData, error: taskError }, { data: fileData, error: fileError }] = await Promise.all([
          supabase.from("clients").select("id,name,segment,contact_name,email,phone,instagram,accent,portal_token,portal_enabled,portal_welcome_message,portal_last_access_at").order("name"),
          supabase.from("client_portal_tasks").select("*").order("created_at", { ascending: false }),
          supabase.from("client_portal_files").select("*").order("created_at", { ascending: false }),
        ]);
        if (clientError) throw clientError;
        if (taskError) throw taskError;
        if (fileError) throw fileError;
        const nextClients = (clientData ?? []).map((row) => normalizePortalClient(row as Record<string, unknown>));
        setClients(nextClients);
        setTasks((taskData ?? []).map((row) => normalizePortalTask(row as Record<string, unknown>)));
        setFiles((fileData ?? []).map((row) => normalizePortalFile(row as Record<string, unknown>)));
        setSelectedId(nextClients[0]?.id ?? "");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível carregar os portais.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setEnabled(selected.portal_enabled);
    setWelcome(selected.portal_welcome_message || DEFAULT_WELCOME);
    setAccessCode("");
    setMessage("");
  }, [selected]);

  function persistDemoClients(next: PortalClient[]) {
    setClients(next);
    const existingRaw = window.localStorage.getItem("plenna-demo-clients");
    const existing = existingRaw ? JSON.parse(existingRaw) as Array<Record<string, unknown>> : [];
    const merged = existing.map((row) => {
      const portal = next.find((client) => client.id === String(row.id));
      return portal ? { ...row, ...portal } : row;
    });
    window.localStorage.setItem("plenna-demo-clients", JSON.stringify(merged));
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMessage("");
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("configure_client_portal", {
          p_client_id: selected.id,
          p_enabled: enabled,
          p_access_code: accessCode.trim(),
          p_welcome_message: welcome.trim(),
        });
        if (error) throw error;
        const updated = normalizePortalClient(data as Record<string, unknown>);
        setClients((current) => current.map((client) => client.id === updated.id ? updated : client));
      } else {
        const updated = { ...selected, portal_enabled: enabled, portal_welcome_message: welcome.trim(), has_portal_code: selected.has_portal_code || Boolean(accessCode.trim()) };
        persistDemoClients(clients.map((client) => client.id === selected.id ? updated : client));
        if (accessCode.trim()) window.localStorage.setItem(`plenna-demo-portal-code-${selected.portal_token}`, accessCode.trim());
      }
      setAccessCode("");
      setMessage("Configurações do portal salvas.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o portal.");
    } finally {
      setSaving(false);
    }
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !taskForm.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...taskForm, title: taskForm.title.trim(), description: taskForm.description.trim(), due_date: taskForm.due_date || null, client_id: selected.id, status: "Pendente" as PortalTaskStatus };
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { data, error } = await supabase.from("client_portal_tasks").insert(payload).select().single();
        if (error) throw error;
        setTasks((current) => [normalizePortalTask(data as Record<string, unknown>), ...current]);
      } else {
        const record = normalizePortalTask({ ...payload, due_date: taskForm.due_date, id: `local-task-${Date.now()}`, client_response: "", created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        const next = [record, ...tasks];
        setTasks(next);
        window.localStorage.setItem("plenna-demo-portal-tasks", JSON.stringify(next));
      }
      setTaskForm(emptyTask);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar a pendência.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(task: PortalTask) {
    if (!window.confirm(`Excluir a pendência “${task.title}”?`)) return;
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase.from("client_portal_tasks").delete().eq("id", task.id);
        if (error) throw error;
      }
      const next = tasks.filter((item) => item.id !== task.id);
      setTasks(next);
      if (!isSupabaseConfigured) window.localStorage.setItem("plenna-demo-portal-tasks", JSON.stringify(next));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir a pendência.");
    }
  }

  async function addFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !fileForm.name.trim() || !fileForm.url.trim()) return;
    setSaving(true);
    try {
      const payload = { ...fileForm, name: fileForm.name.trim(), category: fileForm.category.trim() || "Geral", url: fileForm.url.trim(), notes: fileForm.notes.trim(), client_id: selected.id };
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { data, error } = await supabase.from("client_portal_files").insert(payload).select().single();
        if (error) throw error;
        setFiles((current) => [normalizePortalFile(data as Record<string, unknown>), ...current]);
      } else {
        const record = normalizePortalFile({ ...payload, id: `local-file-${Date.now()}`, created_at: new Date().toISOString() });
        const next = [record, ...files];
        setFiles(next);
        window.localStorage.setItem("plenna-demo-portal-files", JSON.stringify(next));
      }
      setFileForm(emptyFile);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível adicionar o arquivo.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteFile(file: PortalFile) {
    if (!window.confirm(`Remover “${file.name}” do portal?`)) return;
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase.from("client_portal_files").delete().eq("id", file.id);
        if (error) throw error;
      }
      const next = files.filter((item) => item.id !== file.id);
      setFiles(next);
      if (!isSupabaseConfigured) window.localStorage.setItem("plenna-demo-portal-files", JSON.stringify(next));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível remover o arquivo.");
    }
  }

  async function copyLink() {
    if (!selected) return;
    await navigator.clipboard.writeText(portalUrl(selected.portal_token));
    setMessage("Link do portal copiado.");
  }

  const activeCount = clients.filter((client) => client.portal_enabled).length;
  const pendingCount = tasks.filter((task) => task.status !== "Concluída").length;

  return <>
    <PageHeader
      eyebrow="RELACIONAMENTO"
      title="Portal do cliente"
      description="Um espaço privado para conteúdos, reuniões, arquivos, briefings e pendências."
      actionNode={selected?.portal_enabled ? <a className="primary-button" href={portalUrl(selected.portal_token)} target="_blank" rel="noreferrer"><ArrowIcon size={17}/>Abrir portal</a> : <button className="primary-button" disabled><ArrowIcon size={17}/>Portal desativado</button>}
    />

    <section className="portal-stats-v17">
      <article><div className="stat-icon wine"><UsersIcon size={20}/></div><div><span>Portais ativos</span><strong>{activeCount}</strong><small>de {clients.length} clientes</small></div></article>
      <article><div className="stat-icon sand"><ClipboardIcon size={20}/></div><div><span>Pendências abertas</span><strong>{pendingCount}</strong><small>aguardando retorno</small></div></article>
      <article><div className="stat-icon sage"><FileIcon size={20}/></div><div><span>Arquivos disponíveis</span><strong>{files.length}</strong><small>compartilhados</small></div></article>
      <article><div className="stat-icon blush"><CheckIcon size={20}/></div><div><span>Concluídas</span><strong>{tasks.filter((task) => task.status === "Concluída").length}</strong><small>pelo cliente</small></div></article>
    </section>

    <section className="portal-client-picker-v17 panel">
      <div><span className="panel-kicker">CLIENTE</span><h2>Qual portal deseja administrar?</h2></div>
      <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={loading}>
        {clients.length === 0 && <option value="">Nenhum cliente cadastrado</option>}
        {clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.portal_enabled ? "Ativo" : "Desativado"}</option>)}
      </select>
    </section>

    {loading ? <section className="portal-empty-v17">Carregando portais...</section> : !selected ? <section className="portal-empty-v17"><strong>Cadastre um cliente primeiro.</strong><p>O portal é criado a partir do cadastro do cliente.</p></section> : <>
      <section className="portal-settings-grid-v17">
        <form className="panel portal-settings-card-v17" onSubmit={saveSettings}>
          <header><div className="client-avatar large" style={{ background: selected.accent }}>{portalInitials(selected.name)}</div><div><span className="panel-kicker">ACESSO PRIVADO</span><h2>{selected.name}</h2><p>{selected.segment}</p></div><label className="portal-switch-v17"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)}/><span/><em>{enabled ? "Ativo" : "Desativado"}</em></label></header>
          <label>Mensagem de boas-vindas<textarea rows={4} value={welcome} onChange={(event) => setWelcome(event.target.value)}/></label>
          <label>Código de acesso<input type="text" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder="Deixe vazio para manter, ou digite um novo código"/><small>Use uma palavra ou sequência fácil de enviar ao responsável.</small></label>
          <div className="portal-link-v17"><input readOnly value={portalUrl(selected.portal_token)}/><button type="button" className="secondary-button" onClick={copyLink}>Copiar link</button></div>
          {selected.portal_last_access_at && <p className="portal-last-access-v17">Último acesso: {formatPortalDate(selected.portal_last_access_at, true)}</p>}
          {message && <p className="portal-message-v17">{message}</p>}
          <button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar configurações"}</button>
        </form>

        <aside className="panel portal-preview-card-v17">
          <span className="panel-kicker">O CLIENTE VERÁ</span><h2>Visão organizada e sem informações internas</h2>
          <ul><li><CheckIcon size={15}/>Conteúdos em aprovação, agendados ou publicados</li><li><CheckIcon size={15}/>Próximas reuniões, gravações e eventos</li><li><CheckIcon size={15}/>Status e link do briefing</li><li><CheckIcon size={15}/>Arquivos e links compartilhados</li><li><CheckIcon size={15}/>Pendências com espaço para resposta</li></ul>
          <p>Roteiros internos, notas privadas, valores e dados de outros clientes nunca aparecem no portal.</p>
        </aside>
      </section>

      <section className="portal-management-grid-v17">
        <article className="panel portal-resource-card-v17">
          <header><div><span className="panel-kicker">PENDÊNCIAS</span><h2>Solicitações ao cliente</h2></div><span>{selectedTasks.length}</span></header>
          <form className="portal-inline-form-v17" onSubmit={addTask}>
            <input required placeholder="Ex.: Enviar fotos da equipe" value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}/>
            <textarea rows={2} placeholder="Orientação opcional" value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}/>
            <div><input type="date" value={taskForm.due_date} onChange={(event) => setTaskForm({ ...taskForm, due_date: event.target.value })}/><select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value as PortalTaskPriority })}><option>Baixa</option><option>Média</option><option>Alta</option></select><button className="primary-button" disabled={saving}><PlusIcon size={15}/>Adicionar</button></div>
          </form>
          <div className="portal-resource-list-v17">
            {selectedTasks.length === 0 && <p className="portal-list-empty-v17">Nenhuma pendência criada.</p>}
            {selectedTasks.map((task) => <article key={task.id}><i className={portalStatusClass(task.status)}/><div><strong>{task.title}</strong><span>{task.status} · {task.due_date ? `até ${formatPortalDate(task.due_date)}` : "sem prazo"}</span>{task.client_response && <blockquote>{task.client_response}</blockquote>}</div><button onClick={() => void deleteTask(task)}>Excluir</button></article>)}
          </div>
        </article>

        <article className="panel portal-resource-card-v17">
          <header><div><span className="panel-kicker">ARQUIVOS</span><h2>Materiais compartilhados</h2></div><span>{selectedFiles.length}</span></header>
          <form className="portal-inline-form-v17" onSubmit={addFile}>
            <input required placeholder="Nome do arquivo ou pasta" value={fileForm.name} onChange={(event) => setFileForm({ ...fileForm, name: event.target.value })}/>
            <input required type="url" placeholder="Link do Drive, Canva, Dropbox..." value={fileForm.url} onChange={(event) => setFileForm({ ...fileForm, url: event.target.value })}/>
            <div><input placeholder="Categoria" value={fileForm.category} onChange={(event) => setFileForm({ ...fileForm, category: event.target.value })}/><input placeholder="Observação" value={fileForm.notes} onChange={(event) => setFileForm({ ...fileForm, notes: event.target.value })}/><button className="primary-button" disabled={saving}><PlusIcon size={15}/>Adicionar</button></div>
          </form>
          <div className="portal-resource-list-v17">
            {selectedFiles.length === 0 && <p className="portal-list-empty-v17">Nenhum arquivo compartilhado.</p>}
            {selectedFiles.map((file) => <article key={file.id}><span className="portal-file-icon-v17"><FileIcon size={16}/></span><div><a href={file.url} target="_blank" rel="noreferrer"><strong>{file.name}</strong></a><span>{file.category}{file.notes ? ` · ${file.notes}` : ""}</span></div><button onClick={() => void deleteFile(file)}>Excluir</button></article>)}
          </div>
        </article>
      </section>
    </>}
  </>;
}
