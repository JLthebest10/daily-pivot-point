# Alarme de descanso que toca mesmo fora do app

Hoje o alarme é criado só quando o cronômetro chega a zero. Se o navegador estiver em segundo plano (você foi ao Instagram, ou a tela apagou), o celular congela o cronômetro e bloqueia a criação de som naquele momento — por isso nada tocou.

## Como resolver

1. **Ligar o áudio no toque**: quando você escolhe 1:00 / 1:30 / 2:00 / 2:30, esse toque já cria e destrava o motor de áudio (é o único momento em que o celular permite). O motor fica ligado até o fim do descanso.
2. **Agendar o beep no futuro, não no fim**: no mesmo instante em que você escolhe o tempo, os três beeps já ficam agendados para tocar exatamente daqui a X segundos. O agendamento roda no relógio do áudio, que continua correndo com o app em segundo plano — então o som sai mesmo com você no Instagram.
3. **Manter a sessão de áudio viva**: um som silencioso em loop mantém o canal de áudio ativo no celular enquanto o descanso corre, evitando que o sistema desligue o motor antes da hora.
4. **Alarme mais audível**: em vez de 3 bipes curtos e baixos, um padrão de alarme mais longo e alto (várias repetições, ~3 segundos), fácil de ouvir com o celular no bolso.
5. **Notificação + vibração como reforço**: ao terminar, o app pede permissão (uma vez) e dispara uma notificação "Descanso terminado — próxima série" com vibração. A notificação aparece mesmo com o app em segundo plano e serve de lembrete visual.
6. **Cancelar limpa tudo**: tocar no X cancela os beeps agendados, para a notificação e desliga o som silencioso.
7. **Contagem correta ao voltar**: o número na tela é recalculado pelo horário real de término, então voltar ao app depois de 2 minutos mostra o estado certo (ou já finalizado).

## Detalhes técnicos

- `src/components/treino/RestTimer.tsx`: criar o `AudioContext` dentro do handler de clique de `startTimer` (com `resume()`), guardar em ref, e agendar os osciladores com `start(ctx.currentTime + restanteEmSegundos + offset)` em vez de tocar no callback do intervalo.
- Manter um `<audio>`/`BufferSource` silencioso em loop conectado ao destino enquanto o timer corre; parar e fechar o contexto ao terminar ou cancelar.
- Guardar as fontes agendadas em ref para `stop()` no cancelamento.
- Notificação: `Notification.requestPermission()` no primeiro start; disparar `new Notification(...)` no fim, com fallback silencioso se negado. Manter `navigator.vibrate`.
- Nenhuma mudança de dados ou de outras telas.

Limitação honesta: com o app fechado de vez (aba encerrada), nenhum som é possível sem um app instalado/PWA com service worker. Com o app em segundo plano (você trocou para o Instagram), o plano acima resolve.
