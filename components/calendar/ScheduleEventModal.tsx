"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarIcon, CheckIcon, ClockIcon, VideoIcon } from "@/components/icons";
import {
  ClientOption,
  MeetingAction,
  MeetingPlatform,
  ScheduleEvent,
  ScheduleEventType,
  ScheduleStatus,
  fromLocalInputValue,
  toLocalInputValue,
} from "@/lib/schedule";

export type ScheduleEventPayload = Omit<ScheduleEvent, "id" | "owner_id" | "created_at" | "updated_at" | "clients">;

type Props = {
  open: boolean;
  event: ScheduleEvent | null;
  clients: ClientOption[];
  defaultDate?: Date;
  defaultType?: ScheduleEventType;
  saving?: boolean;
  message?: string;
  onClose: () => void;
  onSave: (payload: ScheduleEventPayload) => Promise<void> | void;
  onDelete?: (event: ScheduleEvent) => Promise<void> | void;
};

const eventTypes: ScheduleEventType[] = ["Reunião", "Gravação", "Evento", "Prazo", "Interno"];
const statuses: ScheduleStatus[] = ["Agendado", "Confirmado", "Concluído", "Cancelado"];
const platforms: MeetingPlatform[] = ["Google Meet", "Zoom", "Presencial", "WhatsApp", "Outro"];

function roundedStart(base?: Date) {
  const date = base ? new Date(base) : new Date();
  date.setSeconds(0, 0);
  const minutes = date.getMinutes();
  date.setMinutes(minutes < 30 ? 30 : 0);
  if (minutes >= 30) date.setHours(date.getHours() + 1);
  return date;
}

function parseActions(value: string): MeetingAction[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [text = "", owner = "", dueDate = ""] = line.split("|").map((part) => part.trim());
    return { id: crypto.randomUUID(), text, owner, due_date: dueDate, done: false };
  });
}

function actionLines(actions: MeetingAction[]) {
  return actions.map((action) => [action.text, action.owner, action.due_date].filter(Boolean).join(" | ")).join("\n");
}

export default function ScheduleEventModal({
  open,
  event,
  clients,
  defaultDate,
  defaultType = "Reunião",
  saving = false,
  message = "",
  onClose,
  onSave,
  onDelete,
}: Props) {
  const initialStart = useMemo(() => roundedStart(defaultDate), [defaultDate]);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [eventType, setEventType] = useState<ScheduleEventType>(defaultType);
  const [status, setStatus] = useState<ScheduleStatus>("Agendado");
  const [startAt, setStartAt] = useState(toLocalInputValue(initialStart));
  const [endAt, setEndAt] = useState(toLocalInputValue(new Date(initialStart.getTime() + 60 * 60000)));
  const [allDay, setAllDay] = useState(false);
  const [platform, setPlatform] = useState<MeetingPlatform>("Google Meet");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [description, setDescription] = useState("");
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [decisions, setDecisions] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [localMessage, setLocalMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setClientId(event.client_id ?? "");
      setEventType(event.event_type);
      setStatus(event.status);
      setStartAt(toLocalInputValue(event.start_at));
      setEndAt(toLocalInputValue(event.end_at));
      setAllDay(event.all_day);
      setPlatform(event.platform);
      setLocation(event.location);
      setMeetingUrl(event.meeting_url);
      setDescription(event.description);
      setAgenda(event.agenda_items.join("\n"));
      setNotes(event.notes);
      setDecisions(event.decisions.join("\n"));
      setNextSteps(actionLines(event.next_steps));
    } else {
      const start = roundedStart(defaultDate);
      setTitle("");
      setClientId(clients[0]?.id ?? "");
      setEventType(defaultType);
      setStatus("Agendado");
      setStartAt(toLocalInputValue(start));
      setEndAt(toLocalInputValue(new Date(start.getTime() + 60 * 60000)));
      setAllDay(false);
      setPlatform(defaultType === "Gravação" || defaultType === "Evento" ? "Presencial" : "Google Meet");
      setLocation("");
      setMeetingUrl("");
      setDescription("");
      setAgenda("");
      setNotes("");
      setDecisions("");
      setNextSteps("");
    }
    setLocalMessage("");
  }, [open, event, clients, defaultDate, defaultType]);

  if (!open) return null;

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setLocalMessage("");
    const startIso = fromLocalInputValue(startAt);
    const endIso = fromLocalInputValue(endAt);
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setLocalMessage("O horário final precisa ser posterior ao horário inicial.");
      return;
    }
    await onSave({
      client_id: clientId || null,
      title: title.trim(),
      event_type: eventType,
      status,
      start_at: startIso,
      end_at: endIso,
      all_day: allDay,
      location: location.trim(),
      platform,
      meeting_url: meetingUrl.trim(),
      description: description.trim(),
      agenda_items: agenda.split("\n").map((item) => item.trim()).filter(Boolean),
      notes: notes.trim(),
      decisions: decisions.split("\n").map((item) => item.trim()).filter(Boolean),
      next_steps: parseActions(nextSteps),
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={() => !saving && onClose()}>
      <section className="schedule-modal" role="dialog" aria-modal="true" aria-label={event ? "Editar compromisso" : "Novo compromisso"} onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}>
        <div className="modal-header schedule-modal-header">
          <div><span className="eyebrow">AGENDA PLENNA</span><h2>{event ? "Editar compromisso" : "Novo compromisso"}</h2><p>Organize data, cliente, pauta e próximos passos.</p></div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <form className="schedule-form" onSubmit={submit}>
          <div className="schedule-form-main">
            <label className="full-field">Título<input value={title} onChange={(inputEvent) => setTitle(inputEvent.target.value)} placeholder="Ex.: Planejamento mensal" required autoFocus /></label>
            <label>Cliente<select value={clientId} onChange={(inputEvent) => setClientId(inputEvent.target.value)}><option value="">Sem cliente vinculado</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label>Tipo<select value={eventType} onChange={(inputEvent) => setEventType(inputEvent.target.value as ScheduleEventType)}>{eventTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label>Status<select value={status} onChange={(inputEvent) => setStatus(inputEvent.target.value as ScheduleStatus)}>{statuses.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label>Plataforma<select value={platform} onChange={(inputEvent) => setPlatform(inputEvent.target.value as MeetingPlatform)}>{platforms.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label><span className="label-with-icon"><CalendarIcon size={13}/>Início</span><input type="datetime-local" value={startAt} onChange={(inputEvent) => setStartAt(inputEvent.target.value)} required /></label>
            <label><span className="label-with-icon"><ClockIcon size={13}/>Término</span><input type="datetime-local" value={endAt} onChange={(inputEvent) => setEndAt(inputEvent.target.value)} required /></label>
            <label className="schedule-check"><input type="checkbox" checked={allDay} onChange={(inputEvent) => setAllDay(inputEvent.target.checked)} /><span>Compromisso de dia inteiro</span></label>
            <label>Local<input value={location} onChange={(inputEvent) => setLocation(inputEvent.target.value)} placeholder="Endereço ou local a confirmar" /></label>
            <label className="full-field"><span className="label-with-icon"><VideoIcon size={13}/>Link da reunião</span><input type="url" value={meetingUrl} onChange={(inputEvent) => setMeetingUrl(inputEvent.target.value)} placeholder="https://meet.google.com/..." /></label>
            <label className="full-field">Descrição<textarea value={description} onChange={(inputEvent) => setDescription(inputEvent.target.value)} rows={3} placeholder="Contexto e objetivo do compromisso" /></label>
          </div>

          {eventType === "Reunião" && <div className="meeting-notes-panel">
            <div className="meeting-notes-title"><CheckIcon size={18}/><div><strong>Registro da reunião</strong><span>Um item por linha.</span></div></div>
            <label>Pauta<textarea value={agenda} onChange={(inputEvent) => setAgenda(inputEvent.target.value)} rows={4} placeholder={"Resultados do mês\nPrioridades do próximo ciclo\nCalendário editorial"} /></label>
            <label>Anotações<textarea value={notes} onChange={(inputEvent) => setNotes(inputEvent.target.value)} rows={5} placeholder="Registre os principais pontos durante a reunião." /></label>
            <label>Decisões<textarea value={decisions} onChange={(inputEvent) => setDecisions(inputEvent.target.value)} rows={3} placeholder={"Campanha aprovada\nGravação definida para sexta-feira"} /></label>
            <label>Próximos passos<textarea value={nextSteps} onChange={(inputEvent) => setNextSteps(inputEvent.target.value)} rows={4} placeholder={"Enviar fotos | Cliente | 2026-08-05\nCriar roteiros | Sarah | 2026-08-07"} /><small>Formato: ação | responsável | data</small></label>
          </div>}

          {(localMessage || message) && <p className="form-message full-field schedule-form-message">{localMessage || message}</p>}
          <div className="schedule-modal-actions full-field">
            {event && onDelete && <button className="danger-button" type="button" onClick={() => onDelete(event)} disabled={saving}>Excluir</button>}
            <span />
            <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Salvando..." : event ? "Salvar alterações" : "Criar compromisso"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
