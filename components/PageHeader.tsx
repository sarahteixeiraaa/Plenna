import type { ReactNode } from "react";
import { PlusIcon } from "./icons";

export default function PageHeader({
  eyebrow,
  title,
  description,
  action = "Adicionar",
  actionNode,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: string;
  actionNode?: ReactNode;
}) {
  return <div className="page-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actionNode ?? <button className="primary-button"><PlusIcon size={17}/>{action}</button>}</div>;
}
