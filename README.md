# Plenna v1.3 — Agenda e Reuniões

Atualização incremental da Plenna para Sarah Teixeira. Este pacote contém **somente arquivos novos ou alterados** em relação à v1.2.

## O que foi adicionado

### Agenda funcional

- Cadastro, edição e exclusão de compromissos;
- Vínculo opcional com clientes;
- Tipos: reunião, gravação, evento, prazo e compromisso interno;
- Status: agendado, confirmado, concluído e cancelado;
- Visualização mensal e em lista;
- Filtros por tipo e campo de busca;
- Painel dos compromissos do dia;
- Marcação rápida como concluído;
- Funcionamento com Supabase e no modo demonstração.

### Gestão de reuniões

- Reuniões compartilhadas com a Agenda;
- Pauta organizada por itens;
- Anotações;
- Registro de decisões;
- Próximos passos com responsável e prazo;
- Marcação de pendências concluídas;
- Link do Google Meet, Zoom ou outro canal;
- Histórico de reuniões concluídas.

### Google Agenda

Cada compromisso pode:

- Abrir o Google Agenda com os dados já preenchidos;
- Gerar um arquivo `.ics` compatível com Google Agenda, Outlook e Apple Calendar.

Esta versão usa uma integração leve, sem credenciais adicionais. Ela **não realiza sincronização automática em duas vias** e não cria links do Google Meet automaticamente.

---

## Como instalar

### 1. Substitua e adicione os arquivos

Copie o conteúdo deste pacote para a raiz do projeto, mantendo a mesma estrutura de pastas.

Arquivos alterados:

```text
app/(app)/agenda/page.tsx
app/(app)/reunioes/page.tsx
app/globals.css
README.md
CHANGELOG.md
```

Arquivos novos:

```text
components/calendar/AgendaManager.tsx
components/calendar/ScheduleEventModal.tsx
components/meetings/MeetingsManager.tsx
lib/schedule.ts
supabase/plenna-v1.3.sql
```

### 2. Atualize o Supabase

No painel do Supabase, abra:

```text
SQL Editor → New query
```

Cole e execute apenas:

```text
supabase/plenna-v1.3.sql
```

O script cria a tabela `calendar_events`, índices, validações e políticas de segurança por usuário.

### 3. Envie ao GitHub

Faça o commit normalmente. A Vercel deverá iniciar um novo deploy automaticamente.

Nenhuma variável de ambiente nova é necessária.

---

## Teste recomendado

1. Entre na Plenna;
2. Abra **Agenda**;
3. Cadastre uma reunião vinculada a um cliente;
4. Atualize a página e confirme que ela continua salva;
5. Abra **Reuniões** e confirme que o mesmo compromisso aparece;
6. Adicione pauta, anotações, decisões e próximos passos;
7. Marque uma pendência como concluída;
8. Teste **Adicionar ao Google Agenda**;
9. Baixe o arquivo `.ics`;
10. Edite e exclua um compromisso de teste.

---

## Formato dos próximos passos

No campo **Próximos passos**, use uma linha para cada tarefa:

```text
Enviar fotos | Cliente | 2026-08-05
Criar roteiros | Sarah | 2026-08-07
```

A ordem é:

```text
Ação | Responsável | Data
```

Os campos de responsável e data são opcionais.

---

## Segurança

A tabela utiliza Row Level Security. Cada usuário autenticado acessa somente os próprios compromissos e só pode vinculá-los aos próprios clientes.
