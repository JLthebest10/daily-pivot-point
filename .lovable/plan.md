# Alarme do iPhone: prompt para o ChatGPT + ajuda dentro do app

## O que vai ser entregue
1. Um prompt pronto (abaixo) para colar no ChatGPT. Ele explica o que o Life Hub envia e como o atalho tem que ficar, e faz o ChatGPT te guiar um passo de cada vez, esperando sua confirmação antes do próximo.
2. Dentro do app, em Configurações, uma seção "Alarme do iPhone" com:
   - um botão "Copiar prompt para o ChatGPT";
   - um botão "Testar alarme", que manda um alarme de teste para daqui a 2 minutos com o nome "Teste Life Hub". Assim você confirma que funcionou sem precisar criar uma tarefa.

Nada muda nas tarefas, nos eventos nem no botão de relógio que já existe.

## O prompt para o ChatGPT

```text
Preciso que você me guie, passo a passo, a criar um atalho no app Atalhos (Shortcuts) do iPhone, com o iOS mais recente em português do Brasil. Eu não sei nada de Atalhos, então siga estas regras:

REGRAS DE COMO ME GUIAR
- Me dê UM passo por mensagem e espere eu responder "feito" antes de mandar o próximo.
- Em cada passo, diga exatamente onde tocar: o nome do botão, onde ele fica na tela (canto superior direito, barra de baixo etc.) e o que deve aparecer depois.
- Se o nome de algum botão for diferente na minha tela, me pergunte o que estou vendo e adapte. Não invente.
- Não pule etapas e não junte duas ações no mesmo passo.

O QUE O ATALHO PRECISA FAZER
Tenho um app web (Life Hub) que abre este link quando eu toco num botão de relógio:
shortcuts://run-shortcut?name=Life%20Hub%20Alarme&input=text&text=14:30|Reunião

Ou seja: ele roda um atalho chamado exatamente "Life Hub Alarme" e manda como entrada um TEXTO no formato HORA|NOME. Exemplo: "14:30|Reunião". A barra vertical "|" separa a hora do nome.

O atalho tem que:
1. Receber esse texto (Entrada do Atalho).
2. Dividir o texto usando o separador personalizado "|".
3. Pegar o PRIMEIRO item da lista (a hora, ex.: 14:30).
4. Pegar o ÚLTIMO item da lista (o nome, ex.: Reunião).
5. Criar um alarme no app Relógio com a hora do passo 3 e o nome (rótulo) do passo 4.

O ATALHO FINAL DEVE TER EXATAMENTE ESTAS AÇÕES, NESTA ORDEM
- (Bloco no topo, se aparecer) "Receber [Texto] entrada de [Nenhum lugar]" e, embaixo, "Se não houver entrada: Continuar". Pode ficar assim; não precisa ativar a Folha de Compartilhamento.
- Ação "Dividir Texto": dividir [Entrada do Atalho] por [Personalizado], e no campo do separador digitar só o caractere |
- Ação "Obter Item da Lista": obter [Primeiro Item] de [Texto Dividido]
- Ação "Obter Item da Lista": obter [Último Item] de [Texto Dividido]
- Ação "Criar Alarme" (do app Relógio): no campo de hora, usar a variável "Item da Lista" da PRIMEIRA ação Obter Item; tocar em "Mostrar Mais" e, no campo Rótulo/Nome, usar a variável "Item da Lista" da SEGUNDA ação Obter Item (ex.: "Item da Lista 2").
- Nome do atalho: exatamente  Life Hub Alarme  (com L, H e A maiúsculos, um espaço entre as palavras, sem ponto no final).

PONTOS ONDE EU COSTUMO ERRAR (me ajude a conferir)
- Para escolher uma variável num campo: toque no campo azul e use a barra que aparece em cima do teclado, ou mantenha o dedo pressionado sobre o campo, toque em "Selecionar Variável" e depois toque no ícone da ação certa.
- Na última ação, os dois "Item da Lista" são diferentes: o primeiro é a hora e o segundo é o nome. Confira comigo qual é qual.
- O nome do atalho tem que ser idêntico, senão o link não acha o atalho.

COMO TESTAR NO FINAL
1. Me mande testar tocando no atalho dentro do app Atalhos. Na primeira vez ele pede permissão para acessar o Relógio: tocar em "Permitir". Sem entrada, pode dar erro, e isso é normal.
2. Depois me mande abrir o Safari e colar na barra de endereço:
   shortcuts://run-shortcut?name=Life%20Hub%20Alarme&input=text&text=23:59|Teste
   Tocar em "Abrir" quando o iPhone perguntar e conferir no app Relógio, aba Alarmes, se apareceu um alarme às 23:59 chamado "Teste".
3. Se o alarme for criado com a hora errada ou não for criado, me ajude a inserir, logo depois da primeira "Obter Item da Lista", a ação "Obter Datas da Entrada" e usar o resultado dela no campo de hora do "Criar Alarme".

Comece agora pelo passo 1: abrir o app Atalhos.
```

## Detalhes técnicos
- Novo bloco em `src/routes/_authenticated/configuracoes.tsx`: o texto do prompt fica guardado numa constante, e o botão de copiar usa `navigator.clipboard.writeText` e mostra um toast de confirmação.
- O "Testar alarme" calcula a hora atual + 2 min (formato HH:MM) e reaproveita o mesmo link `shortcuts://` montado em `src/components/AlarmButton.tsx`. Para isso, extrair uma função `buildAlarmUrl(time, title)` desse arquivo.
- Nada muda no banco de dados nem em outras telas.
