export type Client = {
  name: string;
  segment: string;
  initials: string;
  status: "Ativo" | "Onboarding" | "Pausado";
  accent: string;
  nextAction: string;
  progress: number;
};

export const clients: Client[] = [
  { name: "Amanda Vieira", segment: "Advocacia", initials: "AV", status: "Ativo", accent: "#6F354E", nextAction: "Aprovar 3 roteiros", progress: 78 },
  { name: "Clínica Essenza", segment: "Estética", initials: "CE", status: "Ativo", accent: "#9E756D", nextAction: "Enviar fotos da equipe", progress: 63 },
  { name: "Casa Aurora", segment: "Arquitetura", initials: "CA", status: "Onboarding", accent: "#7A8062", nextAction: "Concluir briefing", progress: 34 },
  { name: "Studio Lume", segment: "Fotografia", initials: "SL", status: "Ativo", accent: "#8A6F85", nextAction: "Reunião mensal amanhã", progress: 86 },
  { name: "Bistrô Oliva", segment: "Gastronomia", initials: "BO", status: "Ativo", accent: "#7E704B", nextAction: "Gravação na sexta", progress: 71 },
  { name: "Marina Prado", segment: "Psicologia", initials: "MP", status: "Pausado", accent: "#6B7A79", nextAction: "Renovação em 12 dias", progress: 48 },
];

export const agendaItems = [
  { time: "09:00", title: "Planejamento mensal", client: "Amanda Vieira", type: "Reunião", duration: "45 min" },
  { time: "11:30", title: "Captação de Reels", client: "Clínica Essenza", type: "Gravação", duration: "2h" },
  { time: "15:00", title: "Revisão de pauta", client: "Casa Aurora", type: "Interno", duration: "30 min" },
  { time: "17:30", title: "Aprovação do calendário", client: "Studio Lume", type: "Reunião", duration: "30 min" },
];

export const contentCards = [
  { title: "3 erros antes de prestar depoimento", client: "Amanda Vieira", format: "Reel", date: "01 ago", status: "Roteiro", owner: "ST" },
  { title: "Bastidores: preparação do consultório", client: "Clínica Essenza", format: "Stories", date: "01 ago", status: "Roteiro", owner: "ST" },
  { title: "Como escolher iluminação para ambientes", client: "Casa Aurora", format: "Carrossel", date: "03 ago", status: "Produção", owner: "ST" },
  { title: "Ensaio corporativo sem poses engessadas", client: "Studio Lume", format: "Reel", date: "04 ago", status: "Produção", owner: "ST" },
  { title: "Menu executivo da semana", client: "Bistrô Oliva", format: "Stories", date: "31 jul", status: "Aprovação", owner: "ST" },
  { title: "Investigação não é condenação", client: "Amanda Vieira", format: "Carrossel", date: "02 ago", status: "Aprovação", owner: "ST" },
  { title: "Depoimento: experiência da paciente", client: "Clínica Essenza", format: "Reel", date: "05 ago", status: "Agendado", owner: "ST" },
  { title: "Tour pelo projeto Jardim", client: "Casa Aurora", format: "Reel", date: "06 ago", status: "Agendado", owner: "ST" },
];
