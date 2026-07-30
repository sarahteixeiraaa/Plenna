import PageHeader from "@/components/PageHeader";
import { CalendarIcon, ClockIcon, MoreIcon, VideoIcon } from "@/components/icons";

const meetings=[
 {date:"30 JUL",time:"09:00",title:"Planejamento mensal",client:"Amanda Vieira",kind:"Google Meet",status:"Hoje"},
 {date:"30 JUL",time:"17:30",title:"Aprovação de calendário",client:"Studio Lume",kind:"Google Meet",status:"Hoje"},
 {date:"31 JUL",time:"10:00",title:"Reunião de onboarding",client:"Casa Aurora",kind:"Zoom",status:"Amanhã"},
 {date:"04 AGO",time:"14:00",title:"Análise de métricas",client:"Clínica Essenza",kind:"Google Meet",status:"Próxima semana"},
];
export default function MeetingsPage(){return <><PageHeader eyebrow="ALINHAMENTO" title="Reuniões" description="Pautas, anotações, decisões e próximos passos registrados." action="Nova reunião"/>
<section className="meeting-layout"><div className="meeting-list">{meetings.map((m,i)=><article className="meeting-card" key={m.title}><div className="meeting-date"><span>{m.date.split(" ")[1]}</span><strong>{m.date.split(" ")[0]}</strong></div><div className="meeting-info"><span className="meeting-badge">{m.status}</span><h3>{m.title}</h3><p>{m.client}</p><small><ClockIcon size={13}/>{m.time} · <VideoIcon size={13}/>{m.kind}</small></div><div className="meeting-actions"><button className="secondary-button">Ver pauta</button><button><MoreIcon/></button></div></article>)}</div>
<aside className="panel meeting-template"><span className="panel-kicker">ROTEIRO RECOMENDADO</span><h2>Onboarding de 45 minutos</h2><p>Condução profissional para entender o negócio e definir a estratégia.</p>{["Abertura e expectativas","Negócio e prioridades","Público e ciclo de compra","Marca e posicionamento","Operação e próximos passos"].map((x,i)=><div className="template-step" key={x}><em>{i+1}</em><div><strong>{x}</strong><span>{["5 min","10 min","10 min","7 min","13 min"][i]}</span></div></div>)}<button className="primary-button full"><CalendarIcon size={16}/>Usar este roteiro</button></aside></section></>}
