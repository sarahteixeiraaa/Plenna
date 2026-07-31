export const APPROVAL_STATUSES = ["Não enviado", "Aguardando", "Aprovado", "Ajustes solicitados"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export type ApprovalEvent = {
  id: string;
  content_item_id: string;
  action: ApprovalStatus | "Solicitação enviada" | "Solicitação cancelada";
  reviewer_name: string;
  feedback: string;
  created_at: string;
};

export type PublicApprovalContent = {
  id: string;
  title: string;
  content_format: string;
  caption: string;
  cta: string;
  asset_url: string;
  reference_url: string;
  publication_date: string;
  publication_time: string;
  approval_status: ApprovalStatus;
  approval_due_date: string;
  approval_requested_at: string;
  approval_decided_at: string;
  approval_reviewer_name: string;
  approval_feedback: string;
  client_name: string;
  client_accent: string;
};

export function approvalStatusClass(status: ApprovalStatus) {
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export function approvalPublicUrl(token: string) {
  if (typeof window === "undefined" || !token) return "";
  return `${window.location.origin}/aprovacao/${token}`;
}

export function formatApprovalDate(value: string) {
  if (!value) return "Sem prazo";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .format(date)
    .replace(".", "");
}

export function formatApprovalTimestamp(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function isImageAsset(url: string) {
  return /\.(png|jpe?g|webp|gif|avif)(?:\?|#|$)/i.test(url);
}

export function isVideoAsset(url: string) {
  return /\.(mp4|webm|mov|m4v)(?:\?|#|$)/i.test(url);
}
