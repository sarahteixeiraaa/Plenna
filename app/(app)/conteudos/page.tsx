import PageHeader from "@/components/PageHeader";
import { contentCards } from "@/lib/data";
import { CalendarIcon, MoreIcon, SearchIcon } from "@/components/icons";

const columns = ["Roteiro", "Produção", "Aprovação", "Agendado"];
export default function ContentPage() {
  return <><PageHeader eyebrow="PRODUÇÃO" title="Conteúdos" description="Do insight à publicação, acompanhe cada etapa da produção." action="Novo conteúdo"/>
  <div className="toolbar"><div className="filter-search"><SearchIcon size={17}/><input placeholder="Buscar conteúdo..."/></div><button className="filter active">Todos os clientes</button><button className="filter">Agosto 2026</button><button className="filter"><CalendarIcon size={16}/> Calendário</button></div>
  <section className="kanban">{columns.map((col,ci)=>{const cards=contentCards.filter(c=>c.status===col);return <div className="kanban-column" key={col}><div className="kanban-head"><span className={`kanban-dot k${ci}`}/><strong>{col}</strong><em>{cards.length}</em><button><MoreIcon size={18}/></button></div><div className="kanban-cards">{cards.map(card=><article className="content-card" key={card.title}><div className="content-card-meta"><span>{card.format}</span><button><MoreIcon size={17}/></button></div><h3>{card.title}</h3><p>{card.client}</p><div className="content-card-bottom"><small><CalendarIcon size={13}/>{card.date}</small><div className="avatar tiny">{card.owner}</div></div></article>)}<button className="add-card">+ Adicionar conteúdo</button></div></div>})}</section>
  </>;
}
