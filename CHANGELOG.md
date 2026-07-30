# Changelog — Plenna v1.4

## Adicionado

- Planejamento de conteúdo persistente no Supabase;
- Kanban em sete etapas;
- Movimentação de cartões entre etapas;
- Calendário editorial mensal;
- Visualização em lista;
- Cadastro completo de pauta, roteiro, legenda e CTA;
- Vínculo entre conteúdo e cliente;
- Filtros, pesquisa, prioridades e etapas da jornada;
- Duplicação de pautas;
- Links de referência e arquivo final;
- Indicadores operacionais no topo da página;
- Modo demonstração com armazenamento local.

## Alterado

- Página `Conteúdos` deixou de utilizar dados estáticos;
- Badge numérico fixo foi removido do menu lateral;
- Estilos responsivos adicionados para desktop, tablet e celular.

## Banco de dados

- Nova tabela `content_items`;
- Políticas RLS por proprietário;
- Relação opcional com `clients`;
- Índices por proprietário, cliente, status, formato e data de publicação.
