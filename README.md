# Plenna v1.4 — Planejamento de Conteúdo

Atualização incremental para projetos que já estão na **Plenna v1.3.1**.

Este pacote contém apenas arquivos novos ou modificados. Ele não substitui o projeto inteiro e não apaga clientes, briefings, reuniões ou compromissos já cadastrados.

## O que foi adicionado

- Kanban com sete etapas: **Ideia, Roteiro, Gravação, Edição, Aprovação, Agendado e Publicado**;
- Movimentação dos cartões por arrastar e soltar;
- Visualização em calendário editorial;
- Visualização em lista;
- Cadastro, edição, duplicação e exclusão de conteúdos;
- Conteúdo vinculado a um cliente;
- Formatos: Reel, Carrossel, Stories, Post, Live e Outro;
- Pilar editorial, objetivo, jornada e prioridade;
- Gancho, roteiro, legenda e CTA;
- Data e horário de publicação;
- Links de referência e do arquivo final;
- Filtros por cliente e formato;
- Pesquisa por conteúdo, pilar e cliente;
- Dados salvos no Supabase;
- Modo demonstração preservado para projetos sem Supabase.

## Arquivos do pacote

```text
app/(app)/conteudos/page.tsx
app/globals.css
components/content/ContentManager.tsx
components/Sidebar.tsx
lib/content.ts
supabase/plenna-v1.4.sql
README.md
CHANGELOG.md
```

O `components/Sidebar.tsx` foi alterado apenas para remover o número fixo que aparecia ao lado de **Conteúdos**. Agora o menu não mostra uma quantidade incorreta.

## Instalação

### 1. Faça uma cópia de segurança

Antes de substituir os arquivos, mantenha uma cópia da versão que está funcionando no GitHub.

### 2. Copie os arquivos

Extraia o ZIP e copie todo o seu conteúdo para a raiz do projeto Plenna.

Mantenha a estrutura das pastas e confirme a substituição dos arquivos existentes.

### 3. Crie a tabela no Supabase

Abra:

**Supabase → SQL Editor → New query**

Cole e execute somente:

```text
supabase/plenna-v1.4.sql
```

O script cria a tabela `content_items`, os índices, as políticas de segurança por usuário e o gatilho de atualização.

Ele pode ser executado novamente sem recriar ou apagar os conteúdos existentes.

### 4. Envie ao GitHub

Depois de substituir os arquivos:

```bash
git add .
git commit -m "Plenna v1.4 planejamento de conteúdo"
git push
```

A Vercel deverá iniciar um novo deploy automaticamente.

## Variáveis de ambiente

Nenhuma variável nova é necessária.

Continue utilizando:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

## Roteiro de teste

1. Entre na Plenna publicada;
2. Abra **Conteúdos**;
3. Clique em **Novo conteúdo**;
4. Escolha um cliente e preencha título, formato e status;
5. Adicione gancho, roteiro, legenda e CTA;
6. Defina uma data de publicação;
7. Salve;
8. Arraste o cartão para outra coluna;
9. Atualize a página e confira se a nova etapa foi mantida;
10. Abra **Calendário** e confirme que o conteúdo aparece na data escolhida;
11. Abra **Lista** e teste os filtros;
12. Edite, duplique e exclua um conteúdo de teste;
13. No Supabase, abra **Table Editor → content_items** e confirme que os registros foram salvos.

## Uso do Kanban

No computador, arraste um cartão para mudar sua etapa. No celular, abra o conteúdo e altere o campo **Status**.

A movimentação atual altera a etapa do conteúdo. A ordenação manual dentro da mesma coluna poderá ser adicionada em uma versão futura.

## Calendário editorial

- Clique no número de um dia para criar uma pauta já vinculada àquela data;
- Clique em um conteúdo para editá-lo;
- Conteúdos sem data continuam visíveis no Kanban e na lista, mas não aparecem no calendário.

## Integrações externas

Esta versão organiza o calendário editorial dentro da Plenna. Ela ainda não publica automaticamente no Instagram, Meta Business Suite ou Metricool.

Essas integrações dependem das permissões e APIs disponíveis em cada plataforma e serão tratadas separadamente.

## Solução de problemas

### A página mostra que `content_items` não existe

O script `supabase/plenna-v1.4.sql` ainda não foi executado no mesmo projeto Supabase utilizado pela Vercel.

### O conteúdo some após atualizar

Confira:

- Se a Vercel possui as variáveis do Supabase;
- Se o SQL foi executado sem erros;
- Se o usuário continua autenticado;
- Se o registro aparece em **Table Editor → content_items**.

### O cartão não arrasta no celular

O arrastar e soltar foi pensado para computador. No celular, edite o conteúdo e selecione o novo status.

### A Vercel ainda mostra a página antiga

Abra **Deployments**, faça um novo deploy e, se necessário, escolha a opção sem reutilizar o cache anterior.
