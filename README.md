# Plenna v1.1

Central operacional para **Sarah Teixeira — Social Media & Storymaker**.

## Novidades desta edição

- Paleta com mais contraste e profundidade;
- Login por e-mail e senha com Supabase;
- Recuperação de senha;
- Proteção das páginas internas;
- CRM de clientes funcional;
- Cadastro, edição, exclusão, busca e filtros;
- Salvamento real no Supabase;
- Modo demonstração com persistência no navegador enquanto o Supabase não estiver conectado;
- Banco protegido por Row Level Security: cada usuário acessa apenas os próprios clientes.

## Executar localmente

Requisitos: **Node.js 22 ou superior**.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Sem variáveis de ambiente, a Plenna entra automaticamente no **modo demonstração**. Os clientes cadastrados ficam salvos no `localStorage` do navegador.

## Ativar Supabase e login real

### 1. Criar o projeto

Crie um projeto no Supabase.

### 2. Criar a tabela e as regras de segurança

No painel do Supabase, abra **SQL Editor**, copie todo o conteúdo de:

```text
supabase/plenna.sql
```

Execute o script.

### 3. Criar a conta da Sarah

No Supabase:

1. Abra **Authentication > Users**;
2. Clique em **Add user**;
3. Informe o e-mail da Sarah;
4. Defina uma senha inicial;
5. Marque o e-mail como confirmado, caso a opção esteja disponível.

### 4. Configurar as variáveis

Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
```

No painel atual do Supabase, a chave pode aparecer como **Publishable key**. Em projetos antigos, a chave pública pode aparecer como **anon key**; use apenas a chave pública, nunca a `service_role`.

### 5. Configurar na Vercel

No projeto da Vercel:

1. Abra **Settings > Environment Variables**;
2. Cadastre as duas variáveis acima;
3. Aplique em Production, Preview e Development;
4. Faça um novo deploy.

### 6. Configurar recuperação de senha

No Supabase, abra **Authentication > URL Configuration**:

- Defina o endereço publicado na Vercel como **Site URL**;
- Adicione `https://SEU-DOMINIO/auth/callback` e `https://SEU-DOMINIO/redefinir-senha` em **Redirect URLs**.

## Fluxo da área de clientes

Acesse **Clientes** para:

- Cadastrar uma conta;
- Informar responsável e contatos;
- Registrar plano e mensalidade;
- Definir status;
- Acompanhar percentual de organização;
- Registrar a próxima ação;
- Editar ou excluir o cadastro;
- Buscar por nome, segmento, responsável ou Instagram.

## Segurança

- As páginas internas são protegidas pelo `proxy.ts` quando o Supabase está configurado;
- O banco utiliza Row Level Security;
- A chave `service_role` não deve ser adicionada ao front-end ou à Vercel;
- Senhas não são armazenadas no código da Plenna.

## Publicar a atualização

Substitua os arquivos do repositório pela nova versão ou envie as alterações para uma branch. Depois, faça o deploy pela Vercel.

## Identidade

- Nome: **Plenna**
- Slogan: **Sua operação criativa em um só lugar.**
- Responsável: **Sarah Teixeira**
