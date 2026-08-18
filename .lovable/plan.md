# Reorganizar a aba "Hoje" + histórico de produtividade

## O que muda na tela inicial

Nova ordem da página (de cima para baixo):

1. **Cabeçalho** (saudação + data) — como hoje.
2. **Anel de produtividade de hoje** — primeiro bloco, logo abaixo do cabeçalho, agora clicável e levando para o histórico.
3. **Compromissos e tarefas do dia** — bloco único "Seu dia" (eventos de hoje com horário + tarefas de hoje com check).
4. **Mini calendário (3 fileiras)** — substitui o resumo financeiro. Mostra 3 semanas a partir da semana atual, com pontinhos nos dias que têm evento/tarefa e uma lista curta dos próximos compromissos. Clique em um dia abre `/calendario`.
5. **Mecanismo financeiro rápido** — caixa "Entrou / Saiu": campo de valor, categoria opcional, botões `+ Entrada` e `− Saída`. Salva direto na tabela de transações com a data de hoje, então aparece imediatamente em Finanças. Mostra abaixo o saldo do mês em uma linha.
6. **Hábitos de hoje** — último bloco da página.

## Histórico de produtividade

Nova página `/produtividade`, aberta ao clicar no anel "Produtividade de hoje".

- Calendário mensal (navegação mês anterior/próximo).
- Cada dia é um anel circular estilo Apple Fitness com a % dentro; dias sem dados ficam apagados.
- Cálculo por dia: (hábitos agendados concluídos + tarefas do dia concluídas) / (hábitos agendados + tarefas do dia). Mesma fórmula já usada na tela inicial.
- Toque em um dia mostra o detalhe abaixo: quantos hábitos e tarefas foram concluídos naquele dia.
- Resumo do mês no topo: média de produtividade e número de dias em 100%.

## Detalhes técnicos

- `src/routes/_authenticated/hoje.tsx`: reordenar seções, remover o bloco de resumo financeiro, adicionar `MiniCalendar` e `QuickMoney`; anel envolto em `<Link to="/produtividade">`.
- Novos componentes: `src/components/home/MiniCalendar.tsx` e `src/components/home/QuickMoney.tsx`.
- Nova rota `src/routes/_authenticated/produtividade.tsx` com `head()` próprio; anéis reutilizando/derivando de `CircularProgress` do `ui-kit` (variante pequena sem label).
- Dados: `habits`, `habit_completions` (mês inteiro), `tasks`, `events` via `useList`; agregação por data no cliente.
- Lançamento rápido usa `useSave("transactions")` com `{ type, amount, date, category, description }`.
- Correção necessária: a página de Finanças grava/lê o campo `kind`, mas a coluna real é `type` — vou alinhar Finanças para `type` para que os lançamentos rápidos e os da tela de Finanças apareçam juntos.
