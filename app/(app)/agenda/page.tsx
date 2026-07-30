import PageHeader from "@/components/PageHeader";
import { agendaItems } from "@/lib/data";
import { CalendarIcon, ClockIcon, VideoIcon } from "@/components/icons";

const days = Array.from({ length: 35 }, (_, i) => i - 2);
const events: Record<number, string[]> = { 2: ["Reunião Amanda"], 4: ["Gravação Essenza"], 7: ["Planejamento Lume"], 9: ["Evento Oliva"], 12: ["Onboarding Aurora"], 15: ["Gravação Amanda"], 18: ["Relatórios"], 22: ["Reunião mensal"] };

export default function AgendaPage() {
  return <><PageHeader eyebrow="ORGANIZAÇÃO" title="Agenda" description="Reuniões, gravações, eventos e prazos em um só calendário." action="Novo compromisso"/>
  <div className="agenda-layout">
    <section className="panel calendar-panel"><div className="calendar-toolbar"><button>‹</button><h2>Agosto de 2026</h2><button>›</button><div className="view-switch"><button className="active">Mês</button><button>Semana</button><button>Lista</button></div></div><div className="calendar-weekdays">{["SEG","TER","QUA","QUI","SEX","SÁB","DOM"].map(d=><span key={d}>{d}</span>)}</div><div className="calendar-grid">{days.map((n,i)=>{const day=n<=0?31+n:n; const muted=n<=0 || n>31; return <div key={i} className={`calendar-cell ${muted?"muted":""} ${day===3&&!muted?"today":""}`}><span>{day}</span>{!muted&&events[day]?.map((e,j)=><em key={j} className={`cal-event e${j}`}>{e}</em>)}</div>})}</div></section>
    <aside className="panel day-panel"><div className="day-date"><span>QUINTA-FEIRA</span><strong>30</strong><small>julho de 2026</small></div><div className="day-events">{agendaItems.map((item,i)=><div key={item.time} className="day-event"><span className={`event-line line-${i}`}/><div><small><ClockIcon size={13}/>{item.time} · {item.duration}</small><strong>{item.title}</strong><span>{item.client}</span></div></div>)}</div><button className="outline-button"><CalendarIcon size={17}/>Sincronizar Google Agenda</button></aside>
  </div></>;
}
