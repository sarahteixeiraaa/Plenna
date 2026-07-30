# Plenna v1.2 — Sarah Teixeira

Central operacional para social media e storymaker, construída com Next.js, React, TypeScript e Supabase.

## Novidades desta versão

- Briefing público por link exclusivo;
- Questionário em cinco pilares;
- Salvamento automático;
- Progresso e status;
- Workspace de respostas;
- Roteiro de onboarding de 45 minutos;
- Checklist de materiais e acessos;
- Resumo estratégico;
- Documento pronto para imprimir ou salvar em PDF.

## 1. Atualizar o projeto

Substitua os arquivos do repositório atual pelos arquivos desta pasta e envie as alterações ao GitHub. A Vercel deverá iniciar um novo deploy automaticamente.

## 2. Atualizar o Supabase

Como a versão 1.1 já está funcionando, abra o **SQL Editor** do Supabase e execute somente:

```text
supabase/plenna-v1.2.sql
```

O script cria a tabela `briefings`, as políticas de segurança e duas funções usadas pelo formulário público.

Não é necessário alterar as variáveis existentes:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

## 3. Teste recomendado

1. Entre na Plenna;
2. Abra **Briefings**;
3. Clique em **Criar briefing**;
4. Selecione um cliente;
5. Copie o link público;
6. Abra o link em uma janela anônima;
7. Preencha algumas respostas e atualize a página;
8. Confirme que as respostas continuam salvas;
9. Conclua o formulário;
10. Volte à Plenna e abra o workspace do briefing;
11. Teste reunião, checklist, resumo e **Gerar documento / PDF**.

## 4. Como salvar o documento em PDF

No workspace do briefing:

1. Abra **Resumo estratégico**;
2. Complete ou revise os campos;
3. Clique em **Gerar documento / PDF**;
4. Na janela de impressão do navegador, escolha **Salvar como PDF**.

## 5. Segurança do link público

O visitante não recebe acesso direto às tabelas do CRM. O formulário utiliza funções específicas do banco e um token UUID aleatório para buscar e salvar somente o briefing correspondente ao link.

Não adicione uma chave `service_role` ao projeto ou à Vercel.

## 6. Modo demonstração

Sem as variáveis do Supabase, a Plenna continua funcionando com `localStorage`. Nesse modo, o link público funciona apenas no mesmo navegador em que o briefing foi criado.

## 7. Comandos locais

```bash
npm install
npm run dev
```

Validação de TypeScript:

```bash
npm run lint
```

Build de produção:

```bash
npm run build
```
