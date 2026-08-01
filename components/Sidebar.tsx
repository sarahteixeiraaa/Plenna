"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarIcon, ClipboardIcon, CloseIcon, FolderIcon, HomeIcon, LayersIcon,
  MenuIcon, PortalIcon, SettingsIcon, SparklesIcon, UsersIcon, VideoIcon
} from "./icons";

const navigation = [
  { label: "Início", href: "/", icon: HomeIcon },
  { label: "Agenda", href: "/agenda", icon: CalendarIcon },
  { label: "Clientes", href: "/clientes", icon: UsersIcon },
  { label: "Conteúdos", href: "/conteudos", icon: LayersIcon },
  { label: "Briefings", href: "/briefings", icon: ClipboardIcon },
  { label: "Reuniões", href: "/reunioes", icon: VideoIcon },
  { label: "Storymaker", href: "/storymaker", icon: SparklesIcon },
  { label: "Portal", href: "/portal", icon: PortalIcon },
  { label: "Biblioteca", href: "/arquivos", icon: FolderIcon },
];

function NavContent({ pathname, close }: { pathname: string; close?: () => void }) {
  return (
    <>
      <div className="brand">
        <div className="brand-mark">P<span>•</span></div>
        <div><strong>Plenna</strong><small>operação criativa</small></div>
      </div>
      <nav className="sidebar-nav">
        <span className="nav-caption">ESPAÇO DE TRABALHO</span>
        {navigation.map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return <Link key={href} href={href} onClick={close} className={active ? "nav-link active" : "nav-link"}><Icon size={19}/><span>{label}</span></Link>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <Link href="/configuracoes" onClick={close} className={pathname.startsWith("/configuracoes") ? "nav-link active" : "nav-link"}><SettingsIcon size={19}/><span>Configurações</span></Link>
        <div className="profile-mini"><div className="avatar">ST</div><div><strong>Sarah Teixeira</strong><small>Social Media</small></div><span className="online-dot"/></div>
      </div>
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="sidebar"><NavContent pathname={pathname}/></aside>
      <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Abrir menu"><MenuIcon/></button>
      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)}><aside className="drawer" onClick={e => e.stopPropagation()}><button className="drawer-close" onClick={() => setOpen(false)}><CloseIcon/></button><NavContent pathname={pathname} close={() => setOpen(false)}/></aside></div>}
      <nav className="bottom-nav">
        {navigation.slice(0, 5).map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return <Link key={href} href={href} className={active ? "active" : ""}><Icon size={20}/><span>{label}</span></Link>;
        })}
      </nav>
    </>
  );
}
