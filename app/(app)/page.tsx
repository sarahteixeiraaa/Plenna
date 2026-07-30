import Link from "next/link";
import { agendaItems, clients } from "@/lib/data";
import { ArrowIcon, CalendarIcon, CheckIcon, ClockIcon, LayersIcon, PlusIcon, SparklesIcon, TrendIcon, UsersIcon } from "@/components/icons";

const week = [
  { day: "SEG", date: "27", done: true }, { day: "TER", date: "28", done: true }, { day: "QUA", date: "29", done: true },
  { day: "QUI", date: "30", active: true }, { day: "SEX", date: "31" }, { day: "SÁB", date: "01" }, { day: "DOM", date: "02" },
];

export default function Dashboard() {
  const date = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return (
    <>
      <section className="welcome-row">
        <div><span className="eyebrow">VISÃO GERAL</span><h1>Bom dia, Sarah <span className="wave">✦</span></h1><p>{date.charAt(0).toUpperCase() + date.slice(1)} · Aqui está o que precisa da sua atenção.</p></div>
        <div className="welcome-actions"><button className="secondary-button">Ver calendário</button><button className="primary-button"><PlusIcon size={17}/>Novo conteúdo</button></div>
      </section>

      <section className="stats-grid">
        <article className="stat-card"><div className="stat-icon wine"><CalendarIcon/></div><div><small>Compromissos hoje</small><strong>4</strong><span><b>2</b> reuniões · <b>1</b> gravação</span></div></article>
        <article className="stat-card"><div className="stat-icon blush"><LayersIcon/></div><div><small>Aguardando aprovação</small><strong>4</strong><span>2 vencem ainda hoje</span></div></article>
        <article className="stat-card"><div className="stat-icon sage"><UsersIcon/></div><div><small>Clientes ativos</small><strong>5</strong><span><b>1</b> novo onboarding</span></div></article>
        <article className="stat-card"><div className="stat-icon sand"><TrendIcon/></div><div><small>Publicações na semana</small><strong>12</strong><span className="positive">↑ 18% vs. semana anterior</span></div></article>
      </section>

      <section className="dashboard-grid">
        <article className="panel agenda-panel">
          <div className="panel-header"><div><span className="panel-kicker">HOJE</span><h2>Sua agenda</h2></div><Link href="/agenda">Ver agenda <ArrowIcon size={15}/></Link></div>
          <div className="week-strip">{week.map((d) => <div key={d.day} className={`week-day ${d.active ? "active" : ""} ${d.done ? "done" : ""}`}><span>{d.day}</span><strong>{d.date}</strong>{d.done && <i><CheckIcon size={10}/></i>}</div>)}</div>
          <div className="agenda-list">{agendaItems.map((item, index) => <div className="agenda-item" key={item.time}><div className="time"><strong>{item.time}</strong><span>{item.duration}</span></div><span className={`timeline-dot dot-${index}`}/><div className="agenda-copy"><strong>{item.title}</strong><span>{item.client}</span></div><em>{item.type}</em></div>)}</div>
        </article>

        <article className="panel focus-panel">
          <div className="panel-header"><div><span className="panel-kicker">PRIORIDADES</span><h2>Foco do dia</h2></div><button className="ghost-circle"><PlusIcon size={17}/></button></div>
          <div className="focus-progress"><div><strong>5 de 8</strong><span>tarefas concluídas</span></div><div className="progress-ring"><span>63%</span></div></div>
          <div className="task-list">
            <label className="task done"><input type="checkbox" defaultChecked/><span/><div><strong>Revisar briefing da Casa Aurora</strong><small>Concluído às 08:42</small></div></label>
            <label className="task"><input type="checkbox"/><span/><div><strong>Aprovar roteiro — Amanda Vieira</strong><small>Prioridade alta · hoje</small></div></label>
            <label className="task"><input type="checkbox"/><span/><div><strong>Separar equipamentos para gravação</strong><small>Clínica Essenza · 11:30</small></div></label>
            <label className="task"><input type="checkbox"/><span/><div><strong>Agendar conteúdos da próxima semana</strong><small>6 publicações pendentes</small></div></label>
          </div>
        </article>
      </section>

      <section className="dashboard-grid lower">
        <article className="panel clients-panel"><div className="panel-header"><div><span className="panel-kicker">CARTEIRA</span><h2>Clientes que precisam de atenção</h2></div><Link href="/clientes">Todos os clientes <ArrowIcon size={15}/></Link></div><div className="client-attention-list">{clients.slice(0,4).map(c => <div className="client-attention" key={c.name}><div className="client-avatar" style={{background:c.accent}}>{c.initials}</div><div className="client-main"><strong>{c.name}</strong><span>{c.nextAction}</span><div className="mini-progress"><i style={{width:`${c.progress}%`}}/></div></div><em className={`status ${c.status.toLowerCase()}`}>{c.status}</em></div>)}</div></article>
        <article className="panel quick-panel"><div className="panel-header"><div><span className="panel-kicker">ATALHOS</span><h2>Criar rapidamente</h2></div></div><div className="quick-grid"><Link href="/clientes"><span className="quick-icon"><UsersIcon/></span><strong>Novo cliente</strong><small>Cadastro completo</small></Link><Link href="/conteudos"><span className="quick-icon"><LayersIcon/></span><strong>Novo conteúdo</strong><small>Roteiro ou pauta</small></Link><Link href="/agenda"><span className="quick-icon"><CalendarIcon/></span><strong>Agendar</strong><small>Reunião ou gravação</small></Link><Link href="/storymaker"><span className="quick-icon"><SparklesIcon/></span><strong>Cobertura</strong><small>Planejar Stories</small></Link></div></article>
      </section>
    </>
  );
}
