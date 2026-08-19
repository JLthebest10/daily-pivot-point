# Life Compass

PROMPT — PERSONAL LIFE HUB

Quero que você desenvolva um aplicativo web responsivo chamado Life Hub, funcionando como um hub pessoal de organização, produtividade, hábitos, saúde, treino, finanças, pets e compromissos.

O objetivo é criar um aplicativo que centralize minha vida em um único lugar, com uma interface extremamente minimalista, moderna, limpa e intuitiva, mas sem sacrificar funcionalidades.

Não quero apenas uma landing page ou um protótipo visual. Quero uma aplicação funcional, com persistência de dados, navegação entre módulos, criação/edição/exclusão de registros e estrutura preparada para uso real.



1. CONCEITO DO APP

O aplicativo deve funcionar como um painel de controle da minha vida.

A tela inicial deve apresentar um resumo do meu dia e permitir que eu veja rapidamente:

Hábitos de hoje

Progresso dos hábitos

Próximos compromissos

Lembretes

Treino do dia

Resumo financeiro

Informações importantes dos meus gatos

Metas e progresso geral

A ideia é que eu consiga abrir o aplicativo pela manhã e entender rapidamente:

“O que eu preciso fazer hoje?”

E, ao longo do tempo, consiga responder:

“Estou realmente evoluindo?”



2. DESIGN E INTERFACE

Quero uma interface:

Minimalista

Moderna

Premium

Muito limpa

Rápida

Intuitiva

Responsiva para celular, tablet e desktop

Com excelente experiência mobile

Use bastante espaço em branco, cards discretos, tipografia moderna e hierarquia visual clara.

Evite:

Excesso de cores

Gradientes exagerados

Sombras pesadas

Animações desnecessárias

Interfaces visualmente poluídas

Informações demais aparecendo simultaneamente

A interface deve passar uma sensação semelhante a aplicativos modernos de produtividade e saúde.

Utilize uma sidebar no desktop e uma bottom navigation no mobile, com acesso rápido aos principais módulos.

Criar suporte para:

Light mode

Dark mode



3. DASHBOARD / HOME

Criar uma página inicial chamada Hoje.

Ela deve mostrar:

Saudação

Exemplo:

Boa tarde, João.

E abaixo:

Sexta-feira, 14 de agosto

Hábitos de hoje

Mostrar todos os hábitos programados para o dia.

Cada hábito deve possuir uma pequena caixa de conclusão/check.

Exemplo:

Beber água

Treinar

Ler

Organizar quarto

Estudar

Meditar

Ao clicar, o hábito é marcado como concluído.

Mostrar:

4/6 hábitos concluídos

e uma barra de progresso.

Próximos compromissos

Mostrar os próximos eventos do calendário.

Exemplo:

14:00 — Trabalho
18:30 — Treino
21:00 — Jantar

Resumo rápido

Cards pequenos mostrando:

Hábitos: 67%

Treino: 3 sessões esta semana

Economia: R$ 450 este mês

Próximo compromisso: em 2h



4. MÓDULO DE HÁBITOS

Criar uma área completa chamada Hábitos.

Eu quero poder criar hábitos personalizados.

Ao criar um hábito, permitir configurar:

Nome

Ícone

Categoria

Frequência

Dias da semana

Horário opcional

Meta diária/semanal

Cor opcional

Observação

Exemplos:

Treinar

Frequência:
Segunda, terça, quarta, quinta e sexta.

Ler

Meta:
10 páginas por dia.

Beber água

Meta:
3 litros por dia.



5. HISTÓRICO DOS HÁBITOS

Cada hábito deve possuir uma página de análise.

Mostrar:

Taxa de conclusão

Sequência atual

Maior sequência

Total de dias concluídos

Total de dias perdidos

Progresso semanal

Progresso mensal

Progresso anual

Criar uma visualização em estilo heatmap de calendário, mostrando os dias em que o hábito foi concluído.

Também criar gráficos simples.

Exemplo:

Agosto

27 dias cumpridos
87% de consistência

Permitir selecionar:

Semana

Mês

Ano

Também mostrar comparações:

Julho → 72%

Agosto → 87%



6. MÓDULO FINANCEIRO

Criar uma seção chamada Financeiro.

Quero conseguir controlar minha vida financeira de forma simples.

Funcionalidades:

Receitas

Registrar:

Valor

Data

Categoria

Descrição

Despesas

Registrar:

Valor

Data

Categoria

Descrição

Forma de pagamento

Categorias:

Alimentação

Transporte

Academia

Compras

Lazer

Casa

Trabalho

Assinaturas

Outros

Compras

Criar uma área específica para registrar coisas que comprei.

Exemplo:

Produto: Tênis
Valor: R$ 350
Data: 10/08
Categoria: Roupas

Economia

Criar uma área para registrar quanto economizei.

Exemplo:

Meta mensal: R$ 1.000

Economizado:

R$ 650

65% da meta.

Criar gráficos simples mostrando:

Entradas

Saídas

Economia

Gastos por categoria



7. MÓDULO DE PETS / GATOS

Criar uma área chamada Pets.

Quero conseguir cadastrar meus gatos.

Cada gato deve possuir um perfil.

Informações:

Nome

Foto

Data de nascimento

Peso

Observações

Vacinas

Medicamentos

Consultas veterinárias

Alimentação

Criar também lembretes relacionados aos gatos.

Exemplos:

“Dar vermífugo”

“Consulta veterinária”

“Comprar ração”

“Aplicar vacina”

Permitir registrar histórico de peso.

Mostrar gráfico de evolução do peso.



8. MÓDULO DE TREINO

Criar uma seção chamada Treino.

Quero que funcione como um aplicativo de academia/fitness.

Deve ser possível criar:

Treinos

Exercícios

Séries

Repetições

Carga

Descanso

Exemplo:

Treino A — Peito e Tríceps

Supino reto
4 séries × 10 reps — 30 kg

Supino inclinado
3 séries × 10 reps — 25 kg

Tríceps pulley
3 séries × 12 reps — 20 kg



9. HISTÓRICO DE CARGAS

Cada exercício deve armazenar histórico.

Exemplo:

Supino reto

01/08 — 30 kg — 10 reps
08/08 — 32 kg — 10 reps
14/08 — 34 kg — 8 reps

Mostrar gráfico de evolução da carga.

Também mostrar:

Carga atual: 34 kg

Maior carga: 34 kg

Evolução: +13,3%

Criar possibilidade de registrar:

Carga

Repetições

Séries

RIR/RPE opcional

Observações



10. PRGRESSÃO DE TREINO

O sistema deve permitir visualizar evolução ao longo do tempo.

Mostrar:

Evolução de carga

Volume total

Número de treinos

Melhores marcas

Exercícios mais realizados

Criar uma área de PRs / Personal Records.

Exemplo:

Supino — 40 kg
Agachamento — 80 kg
Rosca direta — 20 kg



11. CALENDÁRIO

Criar um módulo chamado Calendário.

Quero uma experiência semelhante ao calendário nativo de smartphones.

Mostrar:

Mês

Semana

Dia

Permitir criar eventos.

Cada evento deve possuir:

Título

Data

Hora

Duração

Local

Descrição

Categoria

Cor

Repetição

Lembrete

Exemplos:

“Consulta”

“Treino”

“Faculdade”

“Trabalho”

“Gravar conteúdo”

“Reunião NAV”



12. LEMBRETES E NOTIFICAÇÕES

Criar sistema de lembretes.

Eu quero poder configurar:

Notificação no horário

5 minutos antes

15 minutos antes

30 minutos antes

1 hora antes

1 dia antes

Também permitir notificações para hábitos.

Exemplo:

“Hora de treinar.”

“Você ainda não completou seu hábito de leitura hoje.”

“Não esqueça da consulta amanhã.”

Priorizar notificações push, utilizando recursos compatíveis com PWA/web push.

A arquitetura deve ficar preparada para posteriormente transformar o projeto em aplicativo mobile.



13. TAREFAS E LEMBRETES

Além do calendário, criar uma área simples de Tarefas.

Cada tarefa deve ter:

Nome

Data

Horário opcional

Prioridade

Categoria

Status

Observação

Prioridades:

Baixa
Média
Alta

Permitir marcar como concluída.



14. METAS

Criar uma seção chamada Metas.

Permitir criar metas pessoais.

Exemplos:

“Economizar R$ 5.000”

“Treinar 150 vezes no ano”

“Ler 20 livros”

“Postar 100 vídeos”

Cada meta deve possuir:

Nome

Categoria

Prazo

Valor inicial

Meta final

Progresso atual

Porcentagem concluída

Mostrar uma barra de progresso.



15. VISÃO GERAL DA VIDA

Criar uma página chamada Insights ou Progresso.

Essa página deve reunir informações de diferentes módulos.

Exemplo:

Este mês

Hábitos:

82% de consistência

Treinos:

14 sessões

Finanças:

R$ 800 economizados

Tarefas:

74% concluídas

Metas:

3 de 5 em andamento

Criar gráficos simples para mostrar evolução.

O objetivo é transformar meus dados pessoais em uma espécie de painel de performance da minha vida.



16. NAVEGAÇÃO

Estruturar a aplicação aproximadamente assim:

Hoje

Hábitos

Treino

Finanças

Pets

Calendário

Tarefas

Metas

Insights

Configurações

No mobile, usar uma navegação inferior com os módulos mais importantes:

Hoje
Hábitos
Treino
Calendário
Mais



17. BANCO DE DADOS

Não criar apenas dados estáticos.

Criar uma arquitetura real de persistência de dados.

Utilizar Supabase para:

Autenticação

Banco de dados

Persistência

Segurança

Storage para imagens

Criar estrutura de banco de dados organizada para:

Users

Habits

Habit completions

Workouts

Exercises

Workout sessions

Exercise sets

Financial transactions

Purchases

Savings

Pets

Pet health records

Calendar events

Tasks

Goals

Notifications

Cada usuário deve ter acesso somente aos próprios dados.

Implementar regras de segurança/RLS no Supabase.



18. AUTENTICAÇÃO

Criar:

Login

Cadastro

Logout

Recuperação de senha

Após login, o usuário deve acessar seu próprio Life Hub.



19. EXPERIÊNCIA DE USO

Quero que o sistema seja extremamente rápido para registrar informações.

Por exemplo:

Se eu terminar um treino, quero conseguir registrar uma série em poucos segundos.

Se eu gastar R$ 20, quero conseguir registrar a despesa rapidamente.

Se eu completar um hábito, quero apenas clicar no check.

Evite formulários excessivamente longos.

Use:

Modais

Bottom sheets no mobile

Quick actions

Botões “+”

Atalhos de registro rápido



20. SISTEMA DE BUSCA

Criar uma busca global.

Eu quero conseguir pesquisar:

Hábitos

Treinos

Exercícios

Compras

Transações

Eventos

Tarefas

Pets



21. RESPONSIVIDADE

O aplicativo deve ser mobile-first.

A maior parte do uso será pelo celular.

Garantir:

Botões grandes o suficiente para toque

Navegação confortável

Cards adaptáveis

Calendário funcional no mobile

Bottom navigation

Formulários adequados para telas pequenas

Também deve funcionar perfeitamente em desktop.



22. EXPERIÊNCIA VISUAL

Quero que o design pareça um produto real de uma startup premium.

Referências de experiência:

Apple

Notion

Linear

Things

aplicativos modernos de fitness

Não copie visualmente nenhum deles.

Apenas utilize como referência de:

Minimalismo

Organização

Hierarquia

Microinterações

Facilidade de uso



23. MICROINTERAÇÕES

Adicionar pequenas animações quando fizer sentido.

Exemplos:

Ao completar um hábito:

Check → pequena animação → progresso atualizado.

Ao completar uma tarefa:

Tarefa → riscada → desaparece/é movida para concluídas.

Ao registrar um treino:

Mostrar confirmação discreta.

As animações devem ser rápidas e sutis.



24. DASHBOARD PERSONALIZÁVEL

No futuro quero poder escolher quais cards aparecem na Home.

Portanto, estruturar o código para permitir que o dashboard seja configurável.



25. ARQUITETURA

Utilize uma arquitetura limpa e escalável.

Separar:

Components

Pages

Hooks

Services

Database

Types

Utilities

Evitar colocar toda a lógica em um único arquivo.

Criar componentes reutilizáveis.



26. TECNOLOGIA

Utilizar tecnologias modernas e adequadas ao Lovable.

Preferência por:

React

TypeScript

Tailwind CSS

Supabase

Componentes acessíveis

PWA

Utilizar bibliotecas consolidadas quando realmente ajudarem.

Não adicionar dependências desnecessárias.



27. DADOS E GRÁFICOS

Utilizar gráficos simples e fáceis de interpretar.

Evitar dashboards extremamente complexos.

Priorizar:

Barras

Linhas

Progress bars

Heatmaps

Donuts quando fizer sentido

O objetivo é entender os dados rapidamente, não criar um sistema empresarial.



28. CONFIGURAÇÕES

Criar uma área de configurações com:

Nome

Foto

Tema

Notificações

Preferências

Unidades

Configurações de hábitos

Configurações de calendário



29. IMPORTANTE — QUALIDADE DO CÓDIGO

Não quero uma implementação superficial.

Antes de finalizar:

Verifique todos os fluxos.

Verifique se os dados realmente persistem.

Verifique se criar, editar e excluir registros funciona.

Verifique se o dashboard atualiza automaticamente.

Verifique se os gráficos utilizam dados reais.

Verifique se o calendário utiliza os eventos reais cadastrados.

Verifique se os hábitos realmente geram histórico.

Verifique se os treinos realmente geram histórico de cargas.

Verifique responsividade.

Verifique estados vazios.

Verifique loading states.

Verifique mensagens de erro.

Verifique autenticação e isolamento dos dados entre usuários.

Não utilizar informações falsas como se fossem dados reais.

Quando não houver dados, criar estados vazios elegantes, por exemplo:

“Você ainda não possui hábitos.”

“Adicione seu primeiro hábito.”



30. PRIMEIRA EXPERIÊNCIA DO USUÁRIO

Ao entrar pela primeira vez, mostrar um pequeno onboarding.

Perguntar:

Nome

Quais áreas deseja acompanhar?

Quais hábitos deseja criar?

Quantas vezes pretende treinar por semana?

Deseja acompanhar finanças?

Possui pets?

Depois disso, montar automaticamente o dashboard inicial.



31. PRINCIPAL OBJETIVO DO PRODUTO

O Life Hub não deve parecer um conjunto de ferramentas separadas.

Quero que pareça um único sistema operacional pessoal.

Tudo deve estar conectado.

Exemplo:

Eu registro um treino.

→ O treino aparece no histórico.

→ A sessão conta para meus hábitos.

→ Aparece no dashboard.

→ Entra nos meus insights semanais.

Outro exemplo:

Eu crio um compromisso no calendário.

→ Aparece na Home.

→ Gera lembrete.

→ Envia notificação no horário configurado.

Outro:

Eu registro uma compra.

→ Entra no Financeiro.

→ Atualiza meus gastos do mês.

→ Atualiza meus gráficos.



32. PRIORIDADE DE DESENVOLVIMENTO

Desenvolva primeiro uma versão funcional completa do MVP, priorizando:

Autenticação

Dashboard

Hábitos

Histórico e estatísticas dos hábitos

Calendário

Tarefas e lembretes

Treinos

Histórico de cargas

Financeiro

Pets

Metas

Insights

Depois, melhore o visual e as microinterações.

O mais importante é:

FUNCIONALIDADE + PERSISTÊNCIA + EXPERIÊNCIA MOBILE + DESIGN LIMPO.

Não quero apenas uma interface bonita.

Quero uma aplicação realmente utilizável no dia a dia.

Ao finalizar cada módulo, teste o fluxo completo antes de passar para o próximo.

Crie o projeto de forma modular para que novos módulos possam ser adicionados futuramente sem precisar reestruturar toda a aplicação.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://daily-pivot-point.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2905764f-5700-42f4-8b97-018aea62d36c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
