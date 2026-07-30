import PageHeader from "@/components/PageHeader";
import { clients } from "@/lib/data";
import { ArrowIcon, MoreIcon, SearchIcon } from "@/components/icons";

export default function ClientsPage() {
  return <><PageHeader eyebrow="RELACIONAMENTO" title="Clientes" description="Acompanhe estratégia, operação e saúde de cada conta." action="Novo cliente"/>
  <div className="toolbar"><div className="filter-search"><SearchIcon size={17}/><input placeholder="Buscar cliente..."/></div><button className="filter active">Todos <b>6</b></button><button className="filter">Ativos <b>4</b></button><button className="filter">Onboarding <b>1</b></button><button className="filter">Pausados <b>1</b></button></div>
  <section className="clients-grid">{clients.map(c=><article className="client-card" key={c.name}><div className="client-card-top"><div className="client-avatar large" style={{background:c.accent}}>{c.initials}</div><button><MoreIcon/></button></div><div><h3>{c.name}</h3><p>{c.segment}</p></div><div className="client-status-row"><span className={`status ${c.status.toLowerCase()}`}>{c.status}</span><small>{c.progress}% organizado</small></div><div className="progress-bar"><i style={{width:`${c.progress}%`}}/></div><div className="client-next"><span>PRÓXIMA AÇÃO</span><strong>{c.nextAction}</strong></div><button className="card-link">Abrir espaço do cliente <ArrowIcon size={15}/></button></article>)}</section>
  </>;
}
