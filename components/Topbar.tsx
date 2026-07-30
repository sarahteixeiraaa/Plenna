import { BellIcon, SearchIcon } from "./icons";
import LogoutButton from "./LogoutButton";

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="search-box"><SearchIcon size={18}/><input aria-label="Pesquisar" placeholder="Buscar clientes, tarefas ou conteúdos..."/><kbd>⌘ K</kbd></div>
      <div className="top-actions"><button className="icon-button" aria-label="Notificações"><BellIcon size={20}/><span className="notification-dot"/></button><div className="avatar small">ST</div><LogoutButton /></div>
    </header>
  );
}
