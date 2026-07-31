# Changelog — Plenna v1.6

## Aprovação de conteúdos

- Link público exclusivo por conteúdo.
- Aprovação sem conta para o cliente.
- Opções de aprovar ou solicitar ajustes.
- Registro do nome, comentário, data e horário da decisão.
- Prazo de aprovação.
- Histórico interno das solicitações e respostas.
- Reenvio após ajustes.
- Mudança automática para `Agendado` quando aprovado.
- Retorno para `Aprovação` quando ajustes são solicitados.
- Página pública com prévia de imagem ou vídeo quando o link é direto.
- Abertura segura de arquivos hospedados no Canva, Drive, CapCut ou serviços externos.
- Funções RPC com exposição limitada de dados.

## Storymaker

- Cadastro completo de coberturas.
- Vínculo com clientes.
- Data, horários, local e contato no evento.
- Objetivo, estilo e plataforma.
- Programação e pessoas importantes.
- Shot list editável.
- Checklist de equipamentos.
- Marcações, hashtags, links e CTA preparados.
- Modo cobertura otimizado para celular.
- Estados `Pendente`, `Capturado` e `Publicado` por momento.
- Progresso em tempo real.
- Botões para copiar textos.
- Início e finalização da cobertura.
- Persistência no Supabase e modo demonstração.

## Interface e organização

- Agenda renomeada visualmente como agenda operacional.
- Calendário de Conteúdos identificado como calendário editorial.
- Atalhos entre os dois calendários.
- Novos indicadores de aprovação nos cartões.
- Novos painéis e estados responsivos.

## Banco de dados

- Novos campos em `content_items`.
- Nova tabela `content_approval_events`.
- Nova tabela `story_coverages`.
- Políticas RLS por usuário.
- Funções públicas específicas para leitura e decisão de aprovação.
