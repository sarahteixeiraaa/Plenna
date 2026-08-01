# Plenna v1.8 — Atualização incremental

Esta atualização adiciona a **Biblioteca Criativa e a Central de Arquivos** à instalação existente da Plenna v1.7.

> O pacote contém somente arquivos novos ou alterados. Não apague as demais pastas do projeto.

## Novidades

### Materiais dos clientes

- Central única para links do Google Drive, Canva, CapCut, sites e documentos;
- Materiais vinculados a cada cliente;
- Tipos: link, pasta, documento, identidade visual, foto, vídeo e outro;
- Categorias, tags, favoritos e observações;
- Filtro por cliente;
- Separação entre materiais visíveis no portal e materiais internos da Sarah;
- Os materiais cadastrados anteriormente no Portal continuam aparecendo na Biblioteca.

### Biblioteca criativa

- Banco interno de ideias, roteiros, ganchos, legendas, CTAs, sequências de Stories, templates e mensagens;
- Classificação por formato e categoria editorial;
- Tags, favoritos e contador de reutilizações;
- Cópia rápida do texto;
- Botão **Usar com cliente**;
- Criação automática de uma pauta no Planejamento de Conteúdo.

### Refinamentos

- O item `Arquivos` do menu passa a se chamar `Biblioteca`;
- Explicação visual clara entre materiais dos clientes e recursos internos da Sarah;
- Materiais marcados como internos deixam de aparecer no Portal do Cliente;
- Estados vazios e atalhos foram atualizados.

## Arquivos incluídos

```text
app/(app)/arquivos/page.tsx
app/globals.css
components/Sidebar.tsx
components/icons.tsx
components/library/LibraryManager.tsx
lib/library.ts
package.json
supabase/plenna-v1.8.sql
README.md
CHANGELOG.md
```

## Instalação

1. Faça um backup do repositório atual.
2. Extraia o ZIP da atualização.
3. Copie todas as pastas e arquivos para a raiz do projeto.
4. Confirme a substituição dos arquivos existentes.
5. Abra o Supabase.
6. Acesse **SQL Editor**.
7. Execute somente:

```text
supabase/plenna-v1.8.sql
```

8. Envie as alterações ao GitHub.
9. Aguarde o deploy automático da Vercel.

Nenhuma variável de ambiente nova é necessária.

## Teste 1 — Material de cliente

1. Abra **Biblioteca**.
2. Permaneça em **Materiais dos clientes**.
3. Clique em **Novo material**.
4. Escolha um cliente.
5. Cadastre um link válido.
6. Deixe **Mostrar no Portal do Cliente** ativado.
7. Salve.
8. Abra o Portal desse cliente em janela anônima.
9. Confirme que o material aparece em **Arquivos**.
10. Volte à Biblioteca, edite o material e desative a opção do portal.
11. Abra novamente o Portal e confirme que ele não aparece mais.

## Teste 2 — Biblioteca criativa

1. Abra **Biblioteca criativa**.
2. Clique em **Novo modelo**.
3. Cadastre um roteiro, gancho ou sequência de Stories.
4. Salve.
5. Teste o botão **Copiar**.
6. Clique em **Usar com cliente**.
7. Escolha um cliente e confirme.
8. Abra **Conteúdos**.
9. Confirme que a nova pauta foi criada com o roteiro, gancho e CTA preenchidos.

## Observação sobre arquivos

Nesta versão, a Biblioteca organiza **links** para arquivos e pastas externos. Ela não envia arquivos pesados diretamente para o banco da Plenna.

Isso mantém a plataforma leve e permite continuar usando:

- Google Drive;
- Canva;
- CapCut;
- Dropbox;
- OneDrive;
- Links de documentos e sites.

Upload direto poderá ser adicionado futuramente com Supabase Storage, incluindo limites, pastas e regras de armazenamento.

## Modo demonstração

Sem Supabase, o módulo salva dados no navegador por `localStorage`. Os dados não são compartilhados entre aparelhos nesse modo.


Integração Vercel reativada.
