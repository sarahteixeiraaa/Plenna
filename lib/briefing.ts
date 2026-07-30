export type BriefingStatus = "Não iniciado" | "Em andamento" | "Concluído" | "Revisado";

export type BriefingAnswers = Record<string, string>;
export type ChecklistState = Record<string, boolean>;
export type OnboardingSectionState = Record<string, { done: boolean; notes: string }>;
export type StrategySummary = {
  objective: string;
  audience: string;
  offer: string;
  ticket_cycle: string;
  positioning: string;
  pillars: string;
  cta: string;
  next_steps: string;
};

export type BriefingRecord = {
  id: string;
  owner_id?: string;
  client_id: string;
  title: string;
  status: BriefingStatus;
  public_token: string;
  current_step: number;
  progress: number;
  answers: BriefingAnswers;
  internal_notes: string;
  checklist: ChecklistState;
  onboarding_notes: OnboardingSectionState;
  summary: StrategySummary;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    segment: string;
    email?: string;
    phone?: string;
    instagram?: string;
  } | null;
};

export type BriefingField = {
  id: string;
  label: string;
  help: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export type BriefingStep = {
  id: string;
  shortTitle: string;
  title: string;
  description: string;
  fields: BriefingField[];
};

export const briefingSteps: BriefingStep[] = [
  {
    id: "negocio",
    shortTitle: "Negócio",
    title: "Negócio, metas e diferencial",
    description: "Ajude-nos a entender como a marca funciona, o que precisa crescer e por que o público deve escolhê-la.",
    fields: [
      { id: "business_description", label: "Como você explicaria seu negócio para alguém que ainda não o conhece?", help: "Uma explicação simples revela a clareza atual do posicionamento.", type: "textarea", required: true, placeholder: "Conte o que a marca faz, para quem e qual transformação entrega." },
      { id: "priority_services", label: "Quais produtos ou serviços devem ser priorizados nos próximos meses?", help: "A estratégia precisa de uma prioridade comercial clara.", type: "textarea", required: true, placeholder: "Liste as principais soluções e sinalize a prioridade." },
      { id: "goal_90_days", label: "Qual é a principal meta para os próximos 90 dias?", help: "Transforma expectativas amplas em uma direção mensurável.", type: "textarea", required: true, placeholder: "Ex.: gerar 20 oportunidades qualificadas por mês." },
      { id: "instagram_goal", label: "O que você espera que o Instagram gere para o negócio?", help: "Diferencia autoridade, alcance, relacionamento, leads e vendas.", type: "textarea", required: true },
      { id: "differentials", label: "Por que alguém deveria escolher sua marca em vez de um concorrente?", help: "Buscamos diferenciais concretos, não apenas palavras como qualidade e excelência.", type: "textarea", required: true },
      { id: "competitors", label: "Quais marcas disputam a atenção ou o dinheiro do mesmo público?", help: "Ajuda a encontrar espaços de diferenciação.", type: "textarea" },
    ],
  },
  {
    id: "publico",
    shortTitle: "Público",
    title: "Persona, dores e objeções",
    description: "Descreva o cliente real, o momento em que ele busca ajuda e as barreiras que atrasam a decisão.",
    fields: [
      { id: "ideal_client", label: "Quem são seus melhores clientes hoje?", help: "O público real costuma ser mais útil do que um perfil idealizado.", type: "textarea", required: true, placeholder: "Inclua características, rotina, momento de vida ou negócio." },
      { id: "trigger_moment", label: "Em que momento essa pessoa começa a procurar sua solução?", help: "Identifica os gatilhos que iniciam a jornada de compra.", type: "textarea", required: true },
      { id: "main_pains", label: "Quais são as principais dores, preocupações ou frustrações?", help: "Essas dores orientam conteúdos de identificação e educação.", type: "textarea", required: true },
      { id: "desired_results", label: "O que esse público deseja conquistar?", help: "A comunicação também precisa mostrar transformação e futuro desejado.", type: "textarea", required: true },
      { id: "objections", label: "Quais dúvidas e objeções aparecem antes da compra?", help: "Preço, confiança, prazo, prioridade e adequação podem exigir conteúdos diferentes.", type: "textarea", required: true },
      { id: "trust_proofs", label: "O que normalmente faz o cliente confiar e decidir?", help: "Mostra quais provas devem aparecer com mais frequência.", type: "textarea" },
    ],
  },
  {
    id: "compra",
    shortTitle: "Compra",
    title: "Ticket médio e ciclo de decisão",
    description: "Mapeie como a pessoa compara, amadurece e conclui a contratação ou compra.",
    fields: [
      { id: "average_ticket", label: "Qual é o ticket médio das principais soluções?", help: "O valor influencia o risco percebido e a profundidade necessária do conteúdo.", type: "text", required: true, placeholder: "Ex.: R$ 1.500 a R$ 3.000" },
      { id: "decision_cycle", label: "Quanto tempo normalmente passa entre o primeiro contato e a compra?", help: "Define se o conteúdo deve acelerar uma ação ou nutrir por semanas.", type: "select", required: true, options: ["0 a 1 dia — compra impulsiva", "7 a 15 dias — consideração curta", "30 a 90 dias — compra racional", "90 dias ou mais — ciclo complexo"] },
      { id: "purchase_style", label: "Como a decisão costuma acontecer?", help: "Ajuda a equilibrar argumentos emocionais, práticos e racionais.", type: "select", required: true, options: ["Principalmente impulsiva", "Principalmente emocional", "Equilíbrio entre emoção e razão", "Principalmente racional e comparativa"] },
      { id: "decision_makers", label: "Quem participa da decisão?", help: "A pessoa que acompanha o perfil pode não ser a única responsável pela aprovação.", type: "textarea", required: true },
      { id: "conversion_channel", label: "Onde normalmente acontece a conversão?", help: "Define a chamada para ação principal.", type: "select", required: true, options: ["WhatsApp", "Direct do Instagram", "Site ou loja virtual", "Loja física", "Formulário", "Ligação", "Reunião comercial", "Outro"] },
      { id: "decision_steps", label: "Quais etapas o cliente percorre antes de comprar?", help: "Ex.: descobre, acompanha, compara, pede orçamento, conversa e fecha.", type: "textarea" },
    ],
  },
  {
    id: "marca",
    shortTitle: "Marca",
    title: "Tom de voz e universo da marca",
    description: "Defina como a marca deve ser percebida, sentida e reconhecida ao longo do tempo.",
    fields: [
      { id: "desired_perception", label: "Como você gostaria que as pessoas descrevessem a marca?", help: "Transforma percepção desejada em critério de comunicação.", type: "textarea", required: true },
      { id: "brand_adjectives", label: "Quais três adjetivos representam a personalidade da marca?", help: "Esses atributos orientarão textos, vídeos e design.", type: "text", required: true, placeholder: "Ex.: segura, próxima e sofisticada" },
      { id: "avoid_adjectives", label: "Quais características nunca devem ser associadas à marca?", help: "Define limites de linguagem e estética.", type: "text", required: true },
      { id: "voice_style", label: "Qual estilo de comunicação combina mais com a marca?", help: "Escolha a característica predominante; os ajustes serão feitos na estratégia.", type: "select", required: true, options: ["Didática e próxima", "Técnica e segura", "Sofisticada e objetiva", "Inspiradora e acolhedora", "Descontraída e espontânea", "Firme e provocativa"] },
      { id: "humor", label: "A marca pode usar humor? Em qual intensidade?", help: "Evita tendências e abordagens incompatíveis com o posicionamento.", type: "textarea" },
      { id: "references", label: "Quais marcas, perfis, ambientes ou estilos servem de referência?", help: "As referências ajudam a construir o repertório visual e emocional.", type: "textarea" },
    ],
  },
  {
    id: "ativos",
    shortTitle: "Ativos",
    title: "Identidade visual e estrutura de produção",
    description: "Mapeie os materiais, pessoas e condições necessárias para produzir com consistência.",
    fields: [
      { id: "visual_identity", label: "A empresa possui logotipo, paleta e manual de identidade?", help: "Ajuda a preservar reconhecimento e evitar improvisos visuais.", type: "textarea", required: true },
      { id: "photo_video_assets", label: "Quais fotos, vídeos, depoimentos e materiais já existem?", help: "Mostra o que já pode ser utilizado e o que precisa ser produzido.", type: "textarea", required: true },
      { id: "who_appears", label: "Quem poderá aparecer nos conteúdos?", help: "Define as possibilidades de humanização, autoridade e demonstração.", type: "textarea", required: true },
      { id: "recording_availability", label: "Qual é a disponibilidade real para gravações?", help: "A estratégia precisa caber na rotina do cliente.", type: "textarea", required: true },
      { id: "approval_owner", label: "Quem será responsável por enviar materiais e aprovar conteúdos?", help: "Centraliza a comunicação e reduz atrasos.", type: "textarea", required: true },
      { id: "restrictions", label: "Existem restrições de imagem, privacidade, assuntos ou linguagem?", help: "Protege a reputação e evita exposições indevidas.", type: "textarea" },
      { id: "important_dates", label: "Quais campanhas, eventos e datas importantes já estão previstos?", help: "Permite planejar com antecedência.", type: "textarea" },
    ],
  },
];

export const checklistItems = [
  { id: "logo", label: "Logotipo em alta resolução" },
  { id: "brand_manual", label: "Manual, paleta e fontes da marca" },
  { id: "photos", label: "Fotos profissionais" },
  { id: "videos", label: "Vídeos brutos e banco de cenas" },
  { id: "testimonials", label: "Depoimentos e casos autorizados" },
  { id: "meta_access", label: "Acesso ao Meta Business Suite" },
  { id: "metricool_access", label: "Acesso ou conexão ao Metricool" },
  { id: "drive_folder", label: "Pasta compartilhada no Google Drive" },
  { id: "calendar", label: "Calendário de datas e campanhas" },
  { id: "contract", label: "Contrato e termos necessários" },
];

export const onboardingSections = [
  { id: "opening", title: "Abertura e posicionamento", time: "0–5 min", prompt: "Explique o método e confirme a pauta da reunião." },
  { id: "expectations", title: "Contexto e expectativas", time: "5–10 min", prompt: "Entenda o momento da marca, experiências anteriores e o que motivou a contratação." },
  { id: "business", title: "Negócio, metas e diferencial", time: "10–20 min", prompt: "Aprofunde oferta prioritária, meta, capacidade e diferenciação concreta." },
  { id: "audience", title: "Público e ciclo de compra", time: "20–30 min", prompt: "Mapeie dores, objeções, ticket, tempo de decisão e canal de conversão." },
  { id: "brand", title: "Tom de voz e universo da marca", time: "30–36 min", prompt: "Defina percepção, personalidade, referências e limites." },
  { id: "operations", title: "Ativos e processo operacional", time: "36–40 min", prompt: "Alinhe gravações, materiais, aprovações, acessos e responsabilidades." },
  { id: "synthesis", title: "Síntese e próximos passos", time: "40–45 min", prompt: "Recapitule as decisões, valide o diagnóstico e apresente o fluxo de trabalho." },
];

export const emptySummary: StrategySummary = {
  objective: "",
  audience: "",
  offer: "",
  ticket_cycle: "",
  positioning: "",
  pillars: "",
  cta: "",
  next_steps: "",
};

export function emptyChecklist(): ChecklistState {
  return Object.fromEntries(checklistItems.map((item) => [item.id, false]));
}

export function emptyOnboarding(): OnboardingSectionState {
  return Object.fromEntries(onboardingSections.map((section) => [section.id, { done: false, notes: "" }]));
}

export function calculateBriefingProgress(answers: BriefingAnswers) {
  const requiredFields = briefingSteps.flatMap((step) => step.fields.filter((field) => field.required));
  const answered = requiredFields.filter((field) => String(answers[field.id] ?? "").trim().length > 0).length;
  return requiredFields.length ? Math.round((answered / requiredFields.length) * 100) : 0;
}

export function statusFromProgress(progress: number, completed = false): BriefingStatus {
  if (completed) return "Concluído";
  if (progress > 0) return "Em andamento";
  return "Não iniciado";
}

export function answerLabel(fieldId: string) {
  return briefingSteps.flatMap((step) => step.fields).find((field) => field.id === fieldId)?.label ?? fieldId;
}

export function buildSuggestedSummary(answers: BriefingAnswers): StrategySummary {
  const join = (...values: Array<string | undefined>) => values.filter(Boolean).join("\n\n");
  return {
    objective: join(answers.goal_90_days, answers.instagram_goal),
    audience: join(answers.ideal_client, answers.trigger_moment, answers.main_pains),
    offer: join(answers.priority_services, answers.differentials),
    ticket_cycle: join(
      answers.average_ticket ? `Ticket médio: ${answers.average_ticket}` : "",
      answers.decision_cycle ? `Ciclo de decisão: ${answers.decision_cycle}` : "",
      answers.purchase_style ? `Estilo de decisão: ${answers.purchase_style}` : "",
      answers.decision_makers ? `Decisores: ${answers.decision_makers}` : "",
    ),
    positioning: join(answers.desired_perception, answers.brand_adjectives ? `Personalidade: ${answers.brand_adjectives}` : "", answers.voice_style ? `Tom de voz: ${answers.voice_style}` : ""),
    pillars: join(
      answers.main_pains ? `Educação e dores: ${answers.main_pains}` : "",
      answers.objections ? `Objeções: ${answers.objections}` : "",
      answers.trust_proofs ? `Provas e confiança: ${answers.trust_proofs}` : "",
    ),
    cta: answers.conversion_channel ? `Direcionar o público principalmente para: ${answers.conversion_channel}.` : "",
    next_steps: "Validar a síntese estratégica, organizar os ativos pendentes, definir a linha editorial e criar o primeiro plano de 30 dias.",
  };
}

export function createDemoBriefing(clientId: string, title: string): BriefingRecord {
  const now = new Date().toISOString();
  return {
    id: `local-${Date.now()}`,
    client_id: clientId,
    title,
    status: "Não iniciado",
    public_token: crypto.randomUUID(),
    current_step: 0,
    progress: 0,
    answers: {},
    internal_notes: "",
    checklist: emptyChecklist(),
    onboarding_notes: emptyOnboarding(),
    summary: { ...emptySummary },
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
}
