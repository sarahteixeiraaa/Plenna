# Plenna v1.7 — Portal do Cliente

Atualização incremental da Plenna para criar uma área privada e individual para cada cliente.

## O que foi incluído

- Administração dos portais dentro da Plenna;
- Link privado e código de acesso por cliente;
- Ativação e desativação individual;
- Mensagem personalizada de boas-vindas;
- Registro do último acesso;
- Visão geral do projeto;
- Conteúdos em aprovação, agendados e publicados;
- Acesso direto à aprovação de conteúdos;
- Reuniões, gravações e eventos vinculados ao cliente;
- Status e link do briefing;
- Central de arquivos e links;
- Pendências com prazo, prioridade e resposta do cliente;
- Interface responsiva para celular;
- Separação completa entre dados internos da Sarah e dados exibidos ao cliente.

## Instalação

### 1. Atualize os arquivos

Extraia o ZIP na raiz do projeto e confirme a substituição dos arquivos existentes.

Arquivos modificados:

```text
app/globals.css
components/Sidebar.tsx
components/icons.tsx
lib/supabase/proxy.ts
package.json
README.md
CHANGELOG.md
```

Arquivos novos:

```text
app/(app)/portal/page.tsx
app/cliente/[token]/page.tsx
components/portal/PortalManager.tsx
components/portal/PublicClientPortal.tsx
lib/portal.ts
supabase/plenna-v1.7.sql
```

### 2. Atualize o Supabase

Abra **Supabase → SQL Editor**, crie uma nova consulta, cole todo o conteúdo de:

```text
supabase/plenna-v1.7.sql
```

Execute apenas esse arquivo. Não é necessário executar novamente os SQLs anteriores.

O script cria:

- configurações de portal na tabela `clients`;
- tabela `client_portal_tasks`;
- tabela `client_portal_files`;
- funções protegidas para acesso pelo token e código;
- políticas de segurança para a área interna da Sarah.

### 3. Faça o deploy

Envie os arquivos ao GitHub. A Vercel deverá iniciar um novo deploy automaticamente.

Nenhuma variável de ambiente nova é necessária.

## Primeiro teste

1. Entre na Plenna com a conta da Sarah;
2. Abra **Portal** no menu lateral;
3. Selecione um cliente;
4. Ative o portal;
5. Crie um código de acesso;
6. Personalize a mensagem de boas-vindas;
7. Clique em **Salvar configurações**;
8. Crie uma pendência;
9. Adicione um link de arquivo;
10. Copie o link do portal;
11. Abra o link em uma janela anônima;
12. Informe o código criado;
13. Confira conteúdos, agenda, briefing, arquivos e pendências;
14. Responda uma pendência e marque-a como concluída;
15. Volte à área interna e confirme que a resposta apareceu.

## Regras de exibição

O portal mostra automaticamente apenas:

- conteúdos em `Aprovação`, `Agendado` ou `Publicado`;
- reuniões, gravações e eventos vinculados ao cliente e não cancelados;
- briefings vinculados ao cliente;
- arquivos cadastrados especificamente no módulo Portal;
- pendências cadastradas especificamente no módulo Portal.

Não são exibidos:

- notas internas de reunião;
- decisões internas;
- roteiros e conteúdos ainda em produção;
- mensalidade, contrato ou dados financeiros;
- informações de outros clientes;
- anotações estratégicas privadas da Sarah.

## Arquivos no portal

Nesta versão, a Central de Arquivos trabalha com **links** do Google Drive, Canva, Dropbox, OneDrive ou outra plataforma. O upload direto de arquivos para o Supabase Storage ficará para uma atualização futura.

## Segurança

Cada portal utiliza:

- um token UUID exclusivo no endereço;
- um código de acesso armazenado como hash no banco;
- funções `security definer` que retornam apenas dados permitidos;
- validação do cliente em todas as atualizações públicas;
- sessão temporária no navegador do cliente.

O código original não é armazenado em texto aberto no Supabase.

## Teste de regressão

Depois da atualização, confirme também:

- login da Sarah;
- cadastro de clientes;
- briefings públicos;
- agenda e reuniões;
- calendário de conteúdos;
- aprovação pública;
- Storymaker;
- logout e proteção das páginas internas.
