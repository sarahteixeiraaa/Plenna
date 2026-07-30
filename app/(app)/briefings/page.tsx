import PageHeader from "@/components/PageHeader";
import { clients } from "@/lib/data";
import { ArrowIcon, CheckIcon, ClipboardIcon, ClockIcon } from "@/components/icons";

export default function BriefingsPage() {
  return <><PageHeader eyebrow="ESTRATÉGIA" title="Briefings" description="Colete informações, conduza o onboarding e transforme respostas em direção estratégica." action="Criar briefing"/>
  <section className="briefing-highlight"><div className="highlight-icon"><ClipboardIcon size={30}/></div><div><span>MODELO DE ELITE</span><h2>Briefing Estratégico em 5 Pilares</h2><p>Negócio, público, ciclo de compra, universo da marca e ativos do cliente.</p></div><button className="light-button">Usar modelo <ArrowIcon size={16}/></button></section>
  <section className="briefing-list">{clients.slice(0,5).map((c,i)=>{const state=i===2?"Em andamento":i===5?"Não iniciado":"Concluído"; const prog=i===2?62:i===4?88:100;return <article key={c.name} className="briefing-row"><div className="client-avatar" style={{background:c.accent}}>{c.initials}</div><div className="briefing-info"><strong>{c.name}</strong><span>{c.segment} · Briefing inicial</span></div><div className="briefing-progress"><div><span>Progresso</span><b>{prog}%</b></div><div className="progress-bar"><i style={{width:`${prog}%`}}/></div></div><span className={`brief-state ${state==="Concluído"?"done":"ongoing"}`}>{state==="Concluído"?<CheckIcon size={14}/>:<ClockIcon size={14}/>} {state}</span><button className="card-link compact">Abrir <ArrowIcon size={14}/></button></article>})}</section>
  </>;
}
