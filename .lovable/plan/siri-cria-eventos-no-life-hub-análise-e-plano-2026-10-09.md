# Siri cria eventos no Life Hub: análise e plano

## Como está hoje (verificado no projeto)

**Cadastro de eventos**
- O formulário fica na tela Calendário. Ele salva direto no banco pelo navegador, já logado na sua conta.
- Campos obrigatórios no formulário: nome e data.
- O resto é opcional: horário, local, descrição, categoria, repetição, importância e "Adicionar alarme".
- No banco, os únicos campos sem valor padrão são: dono, nome e data. Os outros já têm padrão: duração 60 min, categoria "Geral", cor "sage", sem repetição, importância "normal" e alarme desligado.

**Banco e dono de cada evento**
- O banco é o Lovable Cloud.
- Cada evento guarda o identificador do dono.
- Uma regra de segurança, ligada nessa tabela, só deixa cada pessoa ver, criar, alterar ou apagar eventos em que ela é a dona. Por isso uma conta não alcança os dados de outra.

**Existe alguma porta de entrada externa?**
- Não. Hoje não há nenhum endereço que um app de fora possa chamar para criar eventos.
- As únicas funções no servidor são as do banco (Pluggy), e elas exigem a sessão do navegador logado.
- O Atalho do iPhone não tem essa sessão, então não consegue usar o que já existe.

## Abordagem recomendada: chave pessoal do Atalho

É o padrão usado por apps como Todoist e Notion para integrar com Atalhos. É simples e segura.

1. **Gerar a chave:** em Configurações, uma nova seção "Siri e Atalhos" tem o botão "Gerar chave". A chave aparece uma única vez, para você copiar e colar no Atalho.
2. **Guardar com segurança:** o Life Hub guarda só uma "impressão digital" da chave, nunca a chave em si. Assim, mesmo quem lesse o banco não conseguiria usá-la.
3. **Endereço exclusivo:** um endereço novo do Life Hub só aceita **criar evento**. Ele não lê, não lista e não apaga nada.
4. **Atalho no iPhone:** você fala "E aí Siri, novo evento no Life Hub". A Siri pergunta o nome, a data e a hora. O Atalho envia esses dados com a chave, e a Siri responde "Evento criado".
5. **Revogar:** em Configurações você vê quando a chave foi usada pela última vez e pode revogá-la ou gerar outra a qualquer momento, por exemplo se perder o celular.

**Por que nenhuma conta mexe na outra:**
- O dono do evento sai sempre da chave, nunca do que o Atalho envia. Mesmo que alguém mande o código de outra conta, ele é ignorado.
- Chave errada, revogada ou ausente é recusada.
- O endereço só cria eventos, então não serve para espiar dados.
- Cada campo é conferido antes de salvar: tamanho do texto, data válida e horário no formato HH:MM.

**Alternativas descartadas:**
- **Login e senha dentro do Atalho:** frágil, já que a sessão expira, e arriscado.
- **Abrir o app com um link já preenchido:** ainda exige abrir a tela e tocar em salvar.

## Etapas de implementação (quando você aprovar)

1. **Banco:** uma tabela nova para as chaves. Cada linha guarda o dono, o nome do aparelho, a impressão digital da chave, o último uso e se foi revogada. Só o dono enxerga as próprias chaves. A tabela de eventos não muda.
2. **Configurações:** a seção "Siri e Atalhos" com gerar, copiar, ver o último uso e revogar.
3. **Endereço de criação:** recebe nome, data e, se houver, horário, duração, local, descrição, importância e se quer alarme. Responde com uma frase curta para a Siri ler.
4. **Guia do Atalho:** passo a passo no app, com poucas ações: Pedir Entrada → Obter Conteúdo do URL → Mostrar Resultado. Também posso entregar um prompt para o ChatGPT te guiar.
5. **Testes:**
   - chave certa cria o evento na conta certa;
   - chave errada ou revogada é recusada;
   - mandar o código de outra conta não muda o dono;
   - data inválida é recusada com mensagem clara.

## Detalhes técnicos

- Tabela `public.api_tokens` com: `id`, `user_id`, `name`, `token_hash` (SHA-256, único), `last_used_at`, `revoked_at` e `created_at`. Permissões: GRANT, RLS e policy `auth.uid() = user_id` para os usuários logados.
- Geração e revogação por `createServerFn` com `requireSupabaseAuth`. O token é aleatório (`lh_` + 32 bytes), devolvido uma única vez, e só o hash é gravado.
- Rota `src/routes/api/public/siri/events.ts`, só com POST e header `Authorization: Bearer lh_...`:
  - calcula o hash do token e busca a chave ativa com `supabaseAdmin`, carregado dentro do handler;
  - valida o corpo com zod e insere o evento com `user_id` vindo apenas da chave;
  - atualiza `last_used_at`;
  - responde 401 sem detalhes para token inválido e 400 para dados inválidos.
- Sem leitura nem listagem pela rota pública. Limite de tamanho do corpo e dos textos.
- Nenhuma mudança em `events`, nas suas regras de acesso ou nas telas atuais.
