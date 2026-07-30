# Plenna v1.3.1 — Correção da página Reuniões

Esta é uma atualização incremental. O pacote contém somente os arquivos modificados.

## Problema corrigido

A página `/reunioes` podia entrar na tela **This page couldn't load** quando um próximo passo era salvo com uma data em formato brasileiro, como `30/07/2026`, ou com algum texto que não pudesse ser convertido diretamente em data pelo navegador.

A Agenda continuava abrindo porque ela não exibia essa data no cartão. Ao voltar para Reuniões, o sistema tentava formatar novamente o valor e a página falhava.

## Arquivos alterados

Copie os arquivos mantendo exatamente estes caminhos:

- `lib/schedule.ts`
- `components/meetings/MeetingsManager.tsx`
- `components/calendar/ScheduleEventModal.tsx`

## Como instalar

1. Extraia este ZIP.
2. Copie as pastas `lib` e `components` para a raiz do projeto Plenna.
3. Confirme a substituição dos três arquivos existentes.
4. Envie a alteração ao GitHub.
5. Aguarde o novo deploy automático da Vercel.

Não é necessário executar SQL e nenhuma variável de ambiente foi alterada.

## Depois da atualização

A página passa a aceitar datas de próximos passos nestes formatos:

- `2026-08-05`
- `05/08/2026`
- `05-08-2026`

Valores antigos que não forem reconhecidos serão exibidos como texto, sem derrubar a página.

## Teste recomendado

1. Abra `/reunioes` após o deploy.
2. Confirme que a reunião que causava o erro agora aparece.
3. Edite a reunião e salve um próximo passo como:

   `Enviar materiais | Sarah | 05/08/2026`

4. Atualize a página e acesse Agenda → Reuniões novamente.
