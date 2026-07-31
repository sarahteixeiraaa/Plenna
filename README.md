# Plenna v1.6 — atualização incremental

Esta atualização reúne:

- **v1.5 — Aprovação de conteúdos**;
- **v1.6 — Gestão profissional de Storymaker**;
- refinamentos para diferenciar a **Agenda operacional** do **Calendário editorial**.

O pacote contém somente arquivos novos ou modificados. Ele deve ser aplicado sobre a Plenna v1.4 já instalada.

---

## 1. Antes de atualizar

Confirme que a versão atual está funcionando e faça um backup do repositório ou crie um commit antes da substituição.

Não apague:

- `.env.local`;
- variáveis configuradas na Vercel;
- tabelas existentes no Supabase;
- arquivos que não aparecem neste pacote.

---

## 2. Arquivos modificados

Copie estes arquivos para os mesmos caminhos do projeto e confirme a substituição:

```text
package.json
app/globals.css
app/(app)/storymaker/page.tsx
components/calendar/AgendaManager.tsx
components/content/ContentManager.tsx
lib/content.ts
lib/supabase/proxy.ts
README.md
CHANGELOG.md
```

## 3. Arquivos novos

```text
app/aprovacao/[token]/page.tsx
app/(app)/storymaker/[id]/page.tsx
components/approvals/PublicContentApproval.tsx
components/storymaker/CoverageMode.tsx
components/storymaker/StorymakerManager.tsx
lib/approval.ts
lib/storymaker.ts
supabase/plenna-v1.6.sql
```

---

## 4. Atualizar o Supabase

Abra:

**Supabase → SQL Editor → New query**

Copie e execute somente:

```text
supabase/plenna-v1.6.sql
```

O script cria:

- campos de aprovação na tabela `content_items`;
- tabela `content_approval_events`;
- funções seguras para aprovação por link público;
- tabela `story_coverages`;
- índices, políticas RLS e gatilho de atualização.

O script foi preparado para ser executado após os scripts das versões anteriores.

### Nenhuma variável nova é necessária

Continue utilizando:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

---

## 5. Enviar ao GitHub e à Vercel

Depois de copiar os arquivos e executar o SQL:

```bash
git add .
git commit -m "Plenna v1.6 - aprovacoes e storymaker"
git push
```

A Vercel deverá iniciar o deploy automaticamente.

Se a versão antiga continuar aparecendo, faça um novo deploy em:

**Vercel → Deployments → Redeploy**

---

# TESTE 1 — Aprovação de conteúdo

## Preparar o conteúdo

1. Entre em **Conteúdos**.
2. Crie ou edite uma pauta.
3. Preencha principalmente:
   - título;
   - cliente;
   - formato;
   - legenda;
   - data de publicação;
   - link do arquivo final;
   - prazo de aprovação.
4. Salve o conteúdo.
5. Abra-o novamente.

## Enviar para aprovação

Na seção **04 — Aprovação do cliente**:

1. Clique em **Enviar para aprovação**.
2. Clique em **Copiar link**.
3. Abra o link em uma janela anônima.
4. Confira a arte ou o arquivo, a legenda e a data.
5. Informe o nome do responsável.
6. Escolha:
   - **Aprovar**; ou
   - **Solicitar ajustes**.
7. Confirme a decisão.

## Resultado esperado

### Ao aprovar

- o status de aprovação fica **Aprovado**;
- o conteúdo avança automaticamente para **Agendado** no Kanban;
- nome, horário e comentário ficam registrados no histórico.

### Ao solicitar ajustes

- o status fica **Ajustes solicitados**;
- o conteúdo permanece na etapa **Aprovação**;
- o comentário aparece dentro da pauta;
- a Sarah pode corrigir e clicar em **Reenviar para aprovação**.

Depois da resposta do cliente, clique em **Atualizar status** dentro do conteúdo para buscar a decisão imediatamente. Recarregar a página também atualiza os dados.

## Sobre a prévia do arquivo

- Links diretos terminados em `.jpg`, `.png`, `.webp`, `.mp4` ou formatos semelhantes recebem prévia na página.
- Links do Canva, Google Drive, CapCut ou pastas externas aparecem como botão para abrir o arquivo.
- O cliente não precisa criar conta na Plenna.

## Segurança do link

A página pública mostra apenas as informações necessárias para revisão. Objetivo estratégico, roteiro interno, observações operacionais e demais dados privados não são retornados pela função pública.

---

# TESTE 2 — Storymaker

## Criar uma cobertura

1. Entre em **Storymaker**.
2. Clique em **Nova cobertura**.
3. Preencha:
   - evento e cliente;
   - data, horários e local;
   - objetivo e estilo;
   - programação;
   - pessoas importantes;
   - momentos obrigatórios;
   - equipamentos;
   - marcações, hashtags, links e CTA.
4. Salve.

## Usar o modo cobertura

1. Clique em **Abrir modo cobertura**.
2. Clique em **Iniciar cobertura**.
3. Toque em cada momento para avançar entre:

```text
Pendente → Capturado → Publicado
```

4. Marque os equipamentos conferidos.
5. Use os botões para copiar marcações, hashtags, links e CTA.
6. Ao terminar, clique em **Finalizar**.

## Resultado esperado

- progresso salvo no Supabase;
- status da cobertura atualizado;
- momentos e equipamentos preservados após atualizar a página;
- tela confortável para uso pelo celular durante o evento.

---

# TESTE 3 — Calendários

A navegação agora diferencia explicitamente:

- **Agenda operacional:** reuniões, gravações, eventos e prazos;
- **Calendário editorial:** datas de publicação dos conteúdos.

Há atalhos entre as duas telas para reduzir confusão.

---

# Modo demonstração

Sem Supabase, os novos módulos continuam utilizando `localStorage`.

Atenção: no modo demonstração, o link público de aprovação funciona somente no mesmo navegador em que o conteúdo foi criado. Com o Supabase configurado, o link funciona em qualquer dispositivo.

---

# Solução de problemas

## A página pública redireciona para o login

Confirme que este arquivo foi substituído:

```text
lib/supabase/proxy.ts
```

A rota `/aprovacao/` precisa estar marcada como pública.

## Erro dizendo que uma tabela não existe

Execute novamente:

```text
supabase/plenna-v1.6.sql
```

## Link de aprovação abre como indisponível

Abra o conteúdo e clique em **Enviar para aprovação**. O link só é liberado quando o status está diferente de **Não enviado**.

## Cliente aprovou, mas o Kanban ainda não mudou

Abra a pauta e clique em **Atualizar status**, ou recarregue a página de Conteúdos.

## Arquivo não aparece como imagem ou vídeo

Alguns serviços não fornecem um link direto para a mídia. Nesses casos, a Plenna exibe o botão **Abrir arquivo para revisão**, o que é o comportamento esperado.
