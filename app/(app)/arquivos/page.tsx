import PageHeader from "@/components/PageHeader";
import { FileIcon, FolderIcon, MoreIcon, SearchIcon, UploadIcon } from "@/components/icons";

const folders=[
 {name:"Amanda Vieira",files:28,updated:"Hoje",tone:"wine"},{name:"Clínica Essenza",files:46,updated:"Ontem",tone:"rose"},{name:"Casa Aurora",files:17,updated:"28 jul",tone:"sage"},{name:"Studio Lume",files:62,updated:"26 jul",tone:"sand"},{name:"Bistrô Oliva",files:34,updated:"25 jul",tone:"olive"},{name:"Modelos Plenna",files:19,updated:"22 jul",tone:"plum"},
];
export default function FilesPage(){return <><PageHeader eyebrow="BIBLIOTECA" title="Arquivos" description="Ativos de marca, materiais, documentos e links organizados por cliente." action="Enviar arquivo"/>
<div className="toolbar"><div className="filter-search"><SearchIcon size={17}/><input placeholder="Buscar arquivos ou pastas..."/></div><button className="filter active">Todos</button><button className="filter">Recentes</button><button className="filter">Compartilhados</button></div>
<section className="folders-grid">{folders.map(f=><article className="folder-card" key={f.name}><div className={`folder-icon ${f.tone}`}><FolderIcon size={30}/></div><button><MoreIcon/></button><h3>{f.name}</h3><p>{f.files} arquivos · Atualizado {f.updated.toLowerCase()}</p></article>)}</section>
<section className="panel recent-files"><div className="panel-header"><div><span className="panel-kicker">RECENTES</span><h2>Últimos arquivos</h2></div></div>{["Roteiros_Agosto_Amanda.pdf","Ensaio_Equipe_Essenza.zip","Briefing_Casa_Aurora.pdf","Calendario_Editorial_Lume.xlsx"].map((x,i)=><div className="file-row" key={x}><span className="file-type"><FileIcon/></span><div><strong>{x}</strong><small>{["Amanda Vieira · 2,4 MB","Clínica Essenza · 146 MB","Casa Aurora · 1,1 MB","Studio Lume · 842 KB"][i]}</small></div><em>{["há 18 min","há 2 h","ontem","28 jul"][i]}</em><button><MoreIcon/></button></div>)}</section></>}
