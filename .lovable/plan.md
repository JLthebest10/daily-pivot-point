# Nubank conectado no "Meu Pluggy" — como aproveitar isso no Life Hub

## O que aconteceu

O `meu.pluggy.ai` é o app pessoal da própria Pluggy, não o seu aplicativo de desenvolvedor. A conexão com o Nubank funcionou lá porque aquele app já tem acesso a dados reais aprovado. As credenciais do Life Hub (as chaves que guardamos aqui) continuam em modo demo, então o widget do nosso app ainda só aceita o banco de teste.

Ou seja: a conexão existe, mas provavelmente está registrada na conta da Pluggy, não na "sua aplicação". Isso precisa ser confirmado antes de qualquer código.

## Passo 1 — Diagnóstico (rápido, sem mudar nada)

Consultar a API da Pluggy com as chaves do Life Hub e listar as conexões existentes:

- Se a conexão real do Nubank aparecer, não há nada a construir: basta abrir Finanças → Contas → Sincronizar e as transações entram.
- Se não aparecer, a conexão pertence ao Meu Pluggy e o Life Hub não consegue ler os dados enquanto a sua aplicação não for aprovada para dados reais.

## Passo 2 — Depende do resultado

### Caso A: a conexão aparece
- Vincular a conexão existente ao seu usuário no Life Hub (botão "Usar conexão existente" na aba Contas, caso ela não venha automaticamente).
- Rodar a primeira sincronização e conferir categorias, Pix, débito e recebimentos.

### Caso B: a conexão não aparece
Dois caminhos, e faz sentido ter os dois:

1. **Solicitar acesso a dados reais** no painel da Pluggy para a sua aplicação. Nada muda no código — quando aprovarem, o botão "Conectar banco" do Life Hub passa a listar o Nubank de verdade.
2. **Importação de extrato (OFX/CSV)** dentro do Life Hub, que funciona hoje e sem depender de aprovação:
   - Nova aba/ação "Importar extrato" em Finanças.
   - Você exporta o extrato no app do Nubank (OFX ou CSV) e sobe o arquivo.
   - O sistema lê os lançamentos, aplica as mesmas regras de categorização já existentes (iFood → Alimentação, Uber → Transporte, etc.), identifica Pix/débito/crédito e ignora duplicatas usando o identificador do lançamento.
   - Tela de pré-visualização antes de confirmar, para você ajustar categorias.
   - Os lançamentos entram marcados como importados, iguais aos da conexão automática.

## Detalhes técnicos

- Diagnóstico: `GET /items` e `GET /connectors` na API da Pluggy usando `PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET` (já salvos), via server function — as chaves não saem do servidor.
- Importação: parser de OFX (SGML) e CSV em `src/lib/statement-import.ts`, reaproveitando `src/lib/tx-rules.ts`; gravação pela server function existente em `src/lib/banking.functions.ts`, com `external_id` no formato `ofx:<FITID>` para deduplicar.
- UI: componente novo em `src/components/finance/StatementImport.tsx`, exibido na aba "Contas" de `src/routes/_authenticated/financas.tsx`.
- Nenhuma mudança de banco de dados é necessária: `external_id`, `source` e `category_locked` já existem em `transactions`.
