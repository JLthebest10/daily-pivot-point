# Alarme de descanso em segundo plano

## Objetivo
Fazer o fim do descanso chegar como uma notificação sonora do sistema mesmo quando o Life Hub estiver em segundo plano e o usuário estiver em outro aplicativo, como o Instagram.

## Situação confirmada
- O temporizador atual depende de `AudioContext`, `setInterval` e `new Notification()` dentro da página (`RestTimer.tsx`). O iPhone suspende esses recursos ao colocar o navegador em segundo plano, por isso o som deixa de tocar.
- O projeto ainda não possui manifest, service worker, assinatura Web Push ou agendamento no backend.
- Um site não pode reproduzir áudio arbitrário enquanto está suspenso. No iPhone, a solução web suportada é uma notificação push com o som do próprio sistema, e exige instalar o Life Hub na Tela de Início e autorizar notificações.

## Implementação
1. **Transformar o Life Hub em PWA instalável**
   - Adicionar manifest, ícones e registro de service worker.
   - Manter o funcionamento responsivo atual e permitir instalação na Tela de Início.

2. **Ativar notificações push por dispositivo**
   - Criar uma tabela protegida para armazenar assinaturas Web Push vinculadas ao usuário, com grants e RLS.
   - Exibir uma ativação simples de “Alertas de descanso” dentro do fluxo de treino.
   - Solicitar permissão somente após ação explícita do usuário e salvar/remover a assinatura do aparelho.

3. **Agendar o alerta fora da página**
   - Ao escolher 1:00, 1:30, 2:00 ou 2:30, registrar um disparo autenticado com horário exato de término.
   - Usar um agendador HTTP compatível com atrasos de segundos para chamar uma rota pública assinada; a rota validará a assinatura antes de enviar o Web Push.
   - Ao cancelar ou substituir o timer, invalidar o alerta anterior para evitar notificações atrasadas.

4. **Receber o alerta em segundo plano**
   - O service worker mostrará “Descanso terminado — hora da próxima série” com som/vibração definidos pelo sistema operacional.
   - Tocar na notificação abrirá diretamente o treino em andamento.
   - Com o app aberto, preservar a contagem regressiva e o alarme interno já existentes.

5. **Estados e compatibilidade**
   - Informar de forma curta quando o iPhone ainda precisar instalar o app na Tela de Início ou liberar notificações.
   - Mostrar estado ativado, bloqueado ou indisponível sem interromper o treino.
   - Manter fallback visual quando Web Push não for suportado.

6. **Validação**
   - Testar ativação, início, substituição e cancelamento do timer.
   - Confirmar o recebimento com a aba em segundo plano e o retorno ao treino ao tocar na notificação.
   - Verificar que nenhuma assinatura de outro usuário pode ser acessada e que a rota de disparo rejeita chamadas não assinadas.

## Observação importante
No iPhone, o som será o som padrão da notificação do sistema — páginas web não podem escolher um alarme personalizado em segundo plano. O recurso funcionará depois que o Life Hub publicado for adicionado à Tela de Início e as notificações forem permitidas.

## Configuração necessária
A implementação precisará de credenciais Web Push e de um serviço de agendamento com atraso em segundos. As chaves privadas serão guardadas somente nos segredos do backend, nunca no código ou no navegador.
