# Changelog — Plenna

## v1.7.0 — Portal do Cliente

### Adicionado

- Portal privado por cliente;
- Token exclusivo e código de acesso protegido;
- Ativação e desativação do portal;
- Mensagem personalizada de boas-vindas;
- Registro do último acesso;
- Dashboard público responsivo;
- Conteúdos com acesso à aprovação;
- Agenda compartilhada;
- Área de briefing;
- Central de arquivos por links;
- Pendências com prazo, prioridade, resposta e conclusão;
- Administração interna de portais;
- Funções RPC públicas com validação de acesso;
- Tabelas `client_portal_tasks` e `client_portal_files`.

### Segurança

- Código armazenado com hash `pgcrypto`;
- Dados internos não são retornados ao portal;
- Funções públicas filtram todos os registros pelo cliente autenticado pelo token e código;
- RLS preservada para a área interna da Sarah;
- Rota `/cliente/[token]` liberada no proxy sem liberar as páginas administrativas.

### Observação

- Arquivos são compartilhados por links nesta versão;
- Upload direto para armazenamento será tratado em uma etapa futura.
