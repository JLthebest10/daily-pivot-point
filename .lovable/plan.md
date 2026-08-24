# Conectar o Nubank às Finanças (Open Finance via Pluggy)

Sincronizar automaticamente as transações do Nubank (débito, Pix, recebimentos, cartão) para a aba Finanças, usando a Pluggy como agregador certificado de Open Finance.

## O que você precisa fazer (fora do app)

1. Criar conta em `dashboard.pluggy.ai` (gratuita para desenvolvimento).
2. Copiar o **Client ID** e o **Client Secret**.
3. Me enviar os dois quando eu pedir — vou guardá-los como segredos do backend, nunca no código do navegador.

Sem essas chaves nada conecta. O restante é comigo.

## Como vai funcionar no app

1. Em **Finanças** aparece um bloco novo: **Contas conectadas**.
2. Botão "Conectar banco" abre o widget da Pluggy (lista de bancos, incluindo Nubank) e você autoriza o acesso.
3. Ao autorizar, o app guarda a conexão e importa os últimos 12 meses de transações.
4. Cada transação vira um lançamento normal (entrada/saída) na sua lista, com etiqueta "Nubank" e ícone de importado.
5. Botão **Sincronizar agora** puxa o que há de novo; o app também sincroniza sozinho ao abrir Finanças se passaram mais de 6 horas.
6. Transações importadas não podem ser duplicadas: cada uma tem um identificador único do banco.
7. Você pode editar categoria e descrição de uma transação importada; a edição não é sobrescrita na próxima sincronização.
8. Botão para desconectar a conta e (opcionalmente) apagar os lançamentos importados.

## Categorização automática por regras

Um conjunto de regras converte o descritivo do banco em categoria do Life Hub:

- Alimentação: iFood, Rappi, restaurante, padaria, mercado, supermercado, hortifruti
- Transporte: Uber, 99, posto, combustível, estacionamento
- Moradia: aluguel, condomínio, energia, água, internet
- Saúde: farmácia, drogaria, clínica, laboratório
- Lazer: Netflix, Spotify, cinema, bar
- Educação: curso, faculdade, livraria
- Receitas: Pix recebido, salário, transferência recebida
- Sem correspondência: "Outros"

As regras ficam num arquivo único, fáceis de ampliar. Depois de importada, a categoria é editável por você.

## Detalhes técnicos

**Banco de dados (migração):**
- Nova tabela `bank_connections`: `provider`, `item_id` (Pluggy), `institution_name`, `status`, `last_synced_at`, RLS por `auth.uid()`.
- Nova tabela `bank_accounts`: vínculo com a conexão, `account_id`, `name`, `type`, `balance`.
- Em `transactions`: colunas `external_id` (único por usuário), `source` (`manual` | `nubank`), `bank_account_id`, `category_locked` (marca edição manual para não ser sobrescrita).

**Backend (server functions do TanStack, nada roda no navegador com as chaves):**
- `src/lib/pluggy.server.ts`: autenticação na API da Pluggy (`/auth`), criação de connect token, listagem de contas e transações.
- `src/lib/banking.functions.ts` com `requireSupabaseAuth`:
  - `createConnectToken` — devolve o token do widget
  - `saveConnection` — grava o `itemId` retornado pelo widget
  - `syncTransactions` — busca transações desde a última sincronização, aplica as regras de categoria e faz upsert por `external_id`
  - `listConnections`, `disconnectBank`
- Segredos: `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`.

**Frontend:**
- `src/lib/tx-rules.ts` — regras de categorização.
- `src/components/finance/BankConnections.tsx` — lista de conexões, conectar, sincronizar, desconectar; widget da Pluggy carregado só no cliente.
- `financas.tsx` — nova aba "Contas", etiqueta de origem nos lançamentos, tudo com atualização otimista como no resto do app.

## Limitações honestas

- Em produção a Pluggy é paga; o plano gratuito serve para uso pessoal/teste, com limite de conexões e sincronizações.
- O consentimento do Open Finance expira (normalmente 12 meses) e precisa ser renovado no widget — o app avisa quando a conexão cair.
- A sincronização não é em tempo real: depende do intervalo do agregador (geralmente algumas horas).
