# Integração Siri / Atalhos do iPhone → criar eventos no Life Hub

## 1. O que existe hoje

**Como os eventos são cadastrados**
- Pelo formulário da página Calendário. O app grava direto no banco usando a sessão de quem está logado.
- Obrigatórios de fato: **título** e **data** (AAAA-MM-DD).
- Os demais campos têm valor padrão ou são opcionais:
  - horário (opcional);
  - duração (60 min);
  - categoria ("Geral");
  - cor ("sage");
  - repetição ("none");
  - importância ("normal");
  - lembrete (opcional);
  - local e descrição (opcionais);
  - "Adicionar alarme" (desligado).

**Banco e dono dos dados**
- O banco é o Lovable Cloud, que funciona sobre PostgreSQL. Os eventos ficam numa tabela própria.
- Cada evento guarda o identificador do usuário que o criou.
- Uma regra de segurança do próprio banco permite ler, criar, editar e apagar só os eventos em que esse identificador é o de quem está logado. Ninguém vê nem mexe nos eventos de outra conta.

**Existe alguma porta de entrada externa?**
- **Não.** Hoje não há endereço público nem Edge Function que receba eventos de fora.
- As funções que rodam no servidor (as do banco/Nubank) só funcionam com o usuário logado dentro do próprio app.
- Um Atalho do iOS não tem essa sessão. Por isso ele precisa de uma credencial própria.

## 2. Abordagem recomendada: "Chave pessoal do Atalho"

A forma mais segura e simples é dar a cada usuário uma **chave pessoal** e criar um **endereço do Life Hub** que recebe eventos.

```text
Siri ("Novo evento no Life Hub")
   -> Atalho pergunta: título, data, hora
   -> envia para https://lifehubb.lovable.app/api/public/siri/events
      com a chave pessoal no cabeçalho
   -> o servidor descobre de quem é a chave e cria o evento SÓ para essa conta
   -> o Atalho responde "Evento criado: Dentista, 12/10 às 14:00"
```

**Por que é seguro**
- O banco guarda só uma versão embaralhada da chave, nunca a chave em si.
- A chave aparece **uma única vez**, ao ser gerada. Depois ela não pode mais ser vista.
- O dono do evento sai sempre da chave. O servidor ignora qualquer identificador de usuário enviado junto, então não dá para criar evento em outra conta.
- A chave só serve para **criar eventos**. Ela não lê, não apaga e não acessa outros dados.
- Você pode **revogar** a chave quando quiser, por exemplo se perder o celular, e gerar outra.
- O servidor confere os dados recebidos: título até 200 caracteres, data e hora válidas, campos conhecidos. Também limita o tamanho do envio.
- Chave errada ou ausente recebe uma recusa genérica, sem revelar se a chave existe.

**Por que é simples**
- No iPhone basta um Atalho com 4 ou 5 ações: Perguntar, Perguntar, Obter conteúdo da URL e Mostrar resultado.
- Não precisa de login no Atalho nem de renovar a sessão.

## 3. O que será construído (quando você aprovar)

1. **Lugar para guardar as chaves:**
   - Uma tabela nova de chaves, com dono, versão embaralhada da chave, nome do aparelho, data de criação, último uso e se foi revogada.
   - Protegida pela mesma regra de cada usuário só ver as próprias chaves.
2. **Configurações → "Siri e Atalhos":**
   - Botão "Gerar chave", que mostra a chave uma vez com um botão "Copiar".
   - Lista das chaves ativas, com o último uso e um botão "Revogar".
   - Passo a passo para montar o Atalho no iPhone.
3. **Endereço que recebe eventos:**
   - Endereço: `/api/public/siri/events`.
   - Recebe título, data e hora, além de duração, local e descrição opcionais.
   - Cria o evento com os mesmos padrões do formulário.
   - Responde uma frase curta para a Siri falar.
4. **Datas faladas:** aceitar "hoje" e "amanhã" e o formato AAAA-MM-DD, que é o que o Atalho envia quando usa "Data formatada".
5. **Testes automáticos:**
   - Chave válida cria o evento na conta certa.
   - Chave revogada ou inválida é recusada.
   - Mandar o identificador de outra conta não muda o dono do evento.
   - Data ou título inválidos são recusados.

Fora deste primeiro passo: criar tarefas pela Siri e consultar a agenda pela Siri. Os dois podem vir depois, aproveitando a mesma chave.

## Detalhes técnicos

- A tabela nova `api_tokens` terá as colunas `id`, `user_id`, `name`, `token_hash` (SHA-256, único), `scopes` (padrão `{events:create}`), `last_used_at`, `revoked_at` e `created_at`.
- Sobre o acesso a `api_tokens`:
  - GRANT para `authenticated` e `service_role`.
  - RLS com `auth.uid() = user_id`.
  - O usuário logado só faz select, insert e update (para revogar) das próprias linhas.
- A chave é gerada no servidor com `createServerFn` e `requireSupabaseAuth`: 32 bytes aleatórios com o prefixo `lh_`. Ela volta uma única vez e só o hash é gravado.
- A rota será `src/routes/api/public/siri/events.ts` e só aceita POST. Ela:
  - lê `Authorization: Bearer lh_...`;
  - calcula o hash com `crypto.subtle`;
  - procura a chave com o `supabaseAdmin`, carregado dentro do handler;
  - confere que ela não foi revogada e que tem o escopo `events:create`;
  - insere o evento com `user_id` vindo da chave;
  - atualiza `last_used_at`;
  - valida os dados com zod;
  - responde com 401 genérico, 400 com mensagem curta ou 201 com `{ message }`.
- No Atalho, a ação "Obter conteúdo da URL" envia método POST, cabeçalho `Authorization` e corpo JSON com `title`, `date` e `time`.
