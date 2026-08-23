# Como recriar o Life Hub em outro chat (agora com cadastro e login)

Mesmo guia de antes, com uma mudança: o novo projeto terá **cadastro e login de verdade** (e-mail/senha + Google), para você acessar suas informações de qualquer dispositivo. A conta silenciosa por dispositivo foi removida do prompt.

## Passo a passo

1. Crie um novo projeto/chat no Lovable.
2. O Lovable Cloud já vem habilitado por padrão — banco, auth e storage prontos.
3. Cole o prompt abaixo (incluindo o bloco SQL) como a primeira mensagem.
4. O agente vai aplicar a migração, criar o design system, as telas de autenticação e todos os módulos.

## Prompt para colar no novo chat

```
Desenvolva um app web responsivo chamado Life Hub — um hub pessoal de organização (hábitos, treino, finanças, pets, calendário, tarefas, metas, insights). Arquitetura preparada para virar app mobile depois. Tecnologias: React, TypeScript, Tailwind CSS, Supabase (Lovable Cloud), componentes acessíveis.

=== ARQUITETURA: CADASTRO E LOGIN ===
O app tem autenticação real, para eu acessar minha conta e meus dados de qualquer dispositivo.
- Rota pública /auth com três modos: "login" (e-mail + senha), "signup" (nome, e-mail, senha) e "reset" (link de recuperação por e-mail).
- Login com Google usando o helper do Lovable: lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); configurar/habilitar o provedor Google no mesmo passo.
- Rota pública /redefinir-senha para definir a nova senha após o link de recuperação.
- Rota "/" é uma landing curta do Life Hub (o que é o app + botões "Entrar" e "Criar conta"); se já houver sessão, redirecionar para /hoje.
- Todas as telas do app ficam sob src/routes/_authenticated/, com layout ssr: false que verifica supabase.auth.getUser() e redireciona para /auth quando não há sessão.
- Após login/cadastro bem-sucedidos, navegar para /hoje.
- O AppShell mostra o nome/e-mail do usuário e um botão "Sair": cancelar e limpar as queries, supabase.auth.signOut() e navegar para /auth com replace.
- Em __root.tsx, um único supabase.auth.onAuthStateChange filtrando SIGNED_IN / SIGNED_OUT / USER_UPDATED que invalida o router (e invalida as queries quando não for SIGNED_OUT).
- NÃO criar conta silenciosa por dispositivo nem guardar credenciais em localStorage.
- Deixar a confirmação de e-mail desativada (auto-confirm) para o cadastro entrar direto no app.
- RLS por auth.uid() em todas as tabelas: cada conta só vê os próprios dados.

=== DESIGN SYSTEM ===
Fonte: "Instrument Sans" (carregar via <link> no head de __root.tsx).
Paleta em oklch, tons neutros quentes + acento sage (verde-acinzentado):
- Light: background oklch(0.986 0.004 106), foreground oklch(0.24 0.012 145), primary oklch(0.46 0.062 152), card oklch(1 0 0).
- Dark: background oklch(0.18 0.008 150), foreground oklch(0.95 0.005 110), primary oklch(0.78 0.09 152), card oklch(0.222 0.009 150).
- radius base 0.9rem. Sombra suave: 0 1px 2px oklch(0.25 0.02 140/0.04), 0 8px 24px oklch(0.25 0.02 140/0.05).
Classe utilitária ".surface" = bg-card border border-border rounded-2xl shadow-soft. Classe ".num" = font-variant-numeric tabular-nums.
Suporte a tema light/dark/system via hook useTheme (toggle classe "dark" no <html>, persistir em localStorage "lifehub-theme").

=== CAMADA DE DADOS ===
src/lib/db.ts com hooks genéricos usando React Query:
- useList<T>(table, opts): lista com filtros eq/gte/lte/order, queryKey baseado na tabela+opts.
- useSave(table, message): mutation que faz insert (com user_id automático via supabase.auth.getUser) ou update (se tiver id), invalida todas as queries, mostra toast.
- useRemove(table, message): delete por id, invalida queries, toast.
- currentUserId(): helper que pega o user do supabase.auth.getUser.
Usar "db" (cast do supabase client) para queries dinâmicas por nome de tabela.

=== HOOKS ===
- useProfile(): lê/cria o profile do usuário atual (tabela profiles). Se não existir, cria automaticamente com o nome do cadastro ou o e-mail.
- useUpdateProfile(): mutation para atualizar perfil.
- useTheme(): gerencia light/dark/system.

=== LAYOUT (AppShell) ===
Sidebar fixa (w-60) no desktop (lg+), com navegação completa e, no rodapé, o usuário logado + "Sair". Header sticky no mobile com botão de busca e tema. Bottom nav no mobile com 5 itens (Hoje, Hábitos, Treino, Calendário) + botão "Mais" que abre um Sheet com todos os módulos, o perfil e "Sair". Busca global (GlobalSearch) via Sheet.

Rotas públicas: /, /auth, /redefinir-senha.
Rotas privadas (sob _authenticated): /hoje, /habitos, /treino, /financas, /pets, /calendario, /tarefas, /metas, /insights, /configuracoes, /produtividade.

=== UI KIT (src/components/ui-kit.tsx) ===
PageHeader, SectionTitle, EmptyState, LoadingList, ErrorNote, StatCard (com tone positive/negative), Bar (barra de progresso linear), FormModal (Dialog), Field, CircularProgress (anel circular SVG com % no centro), DayTrack (faixa de dias com indicadores done/scheduled).

=== MÓDULOS ===

1. HOJE (/hoje) — ordem de cima para baixo:
   a. Cabeçalho: saudação (Bom dia/tarde/noite) com o nome do usuário + data por extenso em português.
   b. Anel de produtividade de hoje (CircularProgress, clicável -> /produtividade). Cálculo: (hábitos agendados hoje concluídos + tarefas de hoje concluídas) / (hábitos agendados hoje + tarefas de hoje).
   c. "Seu dia": bloco único com eventos de hoje (com horário) + tarefas de hoje (com checkbox).
   d. Mini calendário (3 fileiras/semanas a partir da semana atual) com pontinhos nos dias que têm evento/tarefa, + lista dos próximos 3 compromissos. Clique em um dia vai pra /calendario.
   e. Financeiro rápido (QuickMoney): campo de valor + categoria opcional + botões "+ Entrada" e "- Saída". Salva direto em transactions (type=income/expense, date=hoje). Mostra saldo do mês abaixo.
   f. Hábitos de hoje: lista com checkbox (HabitCheck), barra de progresso do dia.

2. HÁBITOS (/habitos) — lista de hábitos ativos (não arquivados). Cada hábito: nome, checkbox de hoje, DayTrack dos últimos 14 dias, taxa de consistência. Criar/editar via FormModal (nome, ícone, categoria, cor, dias da semana, horário, meta, unidade, nota). Detalhe em /habitos/$id: heatmap de consistência + gráfico de barras (Recharts) + streaks (atual/mais longa).

3. TREINO (/treino) — lista de treinos (A/B/C). Criar/editar com nome, foco, dias da semana. Detalhe /treino/$id: lista de exercícios (nome, séries alvo, reps alvo, descanso), registro de séries (peso, reps, rir), botão "Finalizar treino" que cria workout_session com duration_min.

4. FINANÇAS (/financas) — dashboard: transações (type=income/expense, NÃO usar campo "kind"), gráficos de gastos por categoria e ao longo do tempo (Recharts), compras planejadas (tabela purchases), poupança (tabela savings). Importante: o campo é "type" (income/expense), não "kind".

5. PETS (/pets) — lista de pets com foto, nome, idade. Detalhe /pets/$id: registros de saúde (vet/vacina/medicação/outro), histórico de peso, stats.

6. CALENDÁRIO (/calendario) — visões mês/semana/dia. Eventos E tarefas aparecem nos dias (tarefa aparece na data do due_date). Criar/editar eventos com título, data, horário, duração, local, categoria, cor, repetição.

7. TAREFAS (/tarefas) — lista de tarefas com prioridade (alta/média/baixa), categoria, data, horário. Checkbox para concluir. Criar/editar via FormModal.

8. METAS (/metas) — metas com nome, categoria, prazo, valor inicial, valor alvo, valor atual, unidade. Barra de progresso. Atualizar valor atual.

9. INSIGHTS (/insights) — dashboard mensal: taxa de conclusão de hábitos, sessões de treino do mês, tarefas concluídas, saldo financeiro (receitas vs despesas), ranking de hábitos por consistência.

10. PRODUTIVIDADE (/produtividade) — calendário mensal com anéis circulares (estilo Apple Fitness) em cada dia mostrando a % de produtividade. Navegação mês anterior/próximo. Resumo do mês: média de produtividade e dias em 100%. Clique no dia mostra detalhe (hábitos + tarefas concluídos).

11. CONFIGURAÇÕES (/configuracoes) — tema, meta semanal de treinos, meta mensal de poupança, nome do perfil, e-mail da conta, trocar senha e botão "Sair".

=== SQL DA MIGRAÇÃO (aplicar como primeira coisa) ===

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  theme TEXT NOT NULL DEFAULT 'system',
  weekly_workout_goal INT NOT NULL DEFAULT 4,
  monthly_savings_goal NUMERIC NOT NULL DEFAULT 0,
  modules TEXT[] NOT NULL DEFAULT ARRAY['habits','workout','finance','calendar','tasks','goals'],
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'check',
  category TEXT NOT NULL DEFAULT 'Geral',
  color TEXT NOT NULL DEFAULT 'sage',
  days INT[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6],
  time TEXT,
  target NUMERIC NOT NULL DEFAULT 1,
  unit TEXT,
  note TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO authenticated;
GRANT ALL ON public.habits TO service_role;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habits" ON public.habits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_habits_upd BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits ON DELETE CASCADE,
  date DATE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_completions TO authenticated;
GRANT ALL ON public.habit_completions TO service_role;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own completions" ON public.habit_completions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  due_time TEXT,
  priority TEXT NOT NULL DEFAULT 'media',
  category TEXT NOT NULL DEFAULT 'Geral',
  done BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_tasks_upd BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT,
  duration_min INT NOT NULL DEFAULT 60,
  location TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Geral',
  color TEXT NOT NULL DEFAULT 'sage',
  repeat TEXT NOT NULL DEFAULT 'none',
  reminder_min INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events" ON public.events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_events_upd BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'expense',
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'Outros',
  description TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transactions" ON public.transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'Compras',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own purchases" ON public.purchases FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.savings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings TO authenticated;
GRANT ALL ON public.savings TO service_role;
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own savings" ON public.savings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  birth_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pets TO authenticated;
GRANT ALL ON public.pets TO service_role;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pets" ON public.pets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_pets_upd BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pet_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_weights TO authenticated;
GRANT ALL ON public.pet_weights TO service_role;
ALTER TABLE public.pet_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pet weights" ON public.pet_weights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pet_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'vet',
  title TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_records TO authenticated;
GRANT ALL ON public.pet_records TO service_role;
ALTER TABLE public.pet_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pet records" ON public.pet_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  note TEXT,
  focus TEXT,
  weekdays INT[] NOT NULL DEFAULT ARRAY[]::INT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workouts" ON public.workouts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_workouts_upd BEFORE UPDATE ON public.workouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.workouts ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_sets INT NOT NULL DEFAULT 3,
  target_reps INT NOT NULL DEFAULT 10,
  rest_sec INT NOT NULL DEFAULT 60,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exercises" ON public.exercises FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  workout_id UUID REFERENCES public.workouts ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  duration_min INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.workout_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.workout_sessions ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises ON DELETE CASCADE,
  set_number INT NOT NULL DEFAULT 1,
  weight NUMERIC NOT NULL DEFAULT 0,
  reps INT NOT NULL DEFAULT 0,
  rir NUMERIC,
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_sets TO authenticated;
GRANT ALL ON public.exercise_sets TO service_role;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sets" ON public.exercise_sets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Geral',
  deadline DATE,
  start_value NUMERIC NOT NULL DEFAULT 0,
  target_value NUMERIC NOT NULL DEFAULT 100,
  current_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals" ON public.goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_goals_upd BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', false) ON CONFLICT DO NOTHING;
CREATE POLICY "media own read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "media own insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "media own update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "media own delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
```

=== ORDEM DE IMPLEMENTAÇÃO ===
1. Aplicar a migração SQL acima.
2. Configurar o design system em src/styles.css (paleta oklch, fonte Instrument Sans, classe .surface).
3. Criar src/lib/db.ts (hooks genéricos), src/lib/format.ts (money, datas em pt-BR, greeting), src/lib/habits.ts (isScheduled, streaks, habitStats).
4. Criar hooks useProfile, useTheme.
5. Criar as telas de autenticação: landing em "/", /auth (login, cadastro, recuperação de senha e Google) e /redefinir-senha. Habilitar o provedor Google e o auto-confirm de e-mail.
6. Proteger o app com src/routes/_authenticated/route.tsx (ssr: false) redirecionando para /auth quando não houver sessão.
7. Criar AppShell com navegação, GlobalSearch, usuário logado e botão "Sair".
8. Criar ui-kit.tsx (PageHeader, StatCard, CircularProgress, DayTrack, FormModal, etc).
9. Construir cada módulo na ordem: hoje, habitos, treino, financas, pets, calendario, tarefas, metas, insights, produtividade, configuracoes.
```

## Observações importantes

- Com cadastro e login reais, seus dados ficam ligados à sua conta (não ao navegador) — você abre o mesmo Life Hub no celular, no notebook, onde quiser.
- Toda tabela tem RLS por auth.uid(), então cada conta só enxerga os próprios dados.
- O SQL é a migração completa e única: 14 tabelas, RLS, grants, triggers e o bucket de storage.
- O design system (paleta sage/ink em oklch + Instrument Sans) é o que dá a identidade visual; sem ele o resultado fica genérico.
- Os dados NÃO vêm junto: o novo projeto terá um banco vazio. Se quiser migrar o que já existe aqui, exporte os dados neste projeto e me peça ajuda para importar no novo.
