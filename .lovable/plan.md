# Plano: trocar o tema do Life Hub para "Roxo elegância"

## Objetivo
Repaginar o tema inteiro do app (cor primária, fundo, cartões, sidebar, gráficos e estados) de sage/ink para uma paleta roxo/índigo elegante. Tudo usa tokens semânticos, então a mudança é isolada no CSS.

## Paleta escolhida (hex → oklch)
- `#1E1B4B` → fundo escuro (índigo profundo)
- `#4C1D95` → roxo profundo (accent/secondary)
- `#7C3AED` → primária (roxo vibrante)
- `#C4B5FD` → claro (muted/accent claro)

## Escopo: TUDO
- Cor primária, fundo, cartões, gráficos (chart-1..5), sidebar e estados (success/warning/destructive) — repaginar o tema completo mantendo contraste em light e dark.

## O que muda
Apenas `src/styles.css`. Nenhum componente é tocado — todos já usam tokens (`--primary`, `--background`, `--card`, `--chart-1`...).

### Bloco `:root` (modo claro)
- `--background`: fundo neutro levemente arroxeado (oklch claro, baixa croma, hue ~285)
- `--foreground`: tinta escura arroxeada
- `--card` / `--popover`: branco puro (mantém legibilidade)
- `--primary`: `#7C3AED` convertido (oklch ~0.48 0.20 290)
- `--primary-foreground`: branco/quase branco
- `--secondary`, `--muted`, `--accent`: tons arroxeados claros derivados de `#C4B5FD` dessaturado
- `--chart-1..5`: variação arroxeada→violeta→magenta para os gráficos
- `--success`/`--warning`/`--destructive`: mantêm semântica (verde/âmbar/vermelho), levemente ajustados pra harmonizar com o roxo
- `--sidebar`: neutro claro arroxeado

### Bloco `.dark` (modo escuro)
- `--background`: `#1E1B4B` convertido (oklch ~0.22 0.06 280)
- `--card` / `--popover`: índigo um pouco mais claro que o fundo
- `--primary`: roxo mais claro/luminoso pra contrastar no escuro (oklch ~0.70 0.16 290)
- `--secondary`, `--muted`, `--accent`: tons arroxeados escuros
- `--chart-1..5`: versões luminosas
- `--sidebar`: índigo escuro

### Detalhes
- Manter `--ring` = `--primary` em ambos os modos.
- Manter `--border`/`--input` como variações sutis do fundo.
- Ajustar `--shadow-soft` pra um tom arroxeado no halo (oklch roxo em vez do sage atual).

## Verificação
- `bunx tsgo` não é necessário (só CSS).
- Abrir o preview e conferir light/dark em Hoje, Hábitos, Finanças e Insights (páginas com mais uso de cor).
- Confirmar contraste: texto sobre primária, texto sobre card, muted-foreground legível.

## Fora de escopo
- Qualquer mudança de layout, componente ou comportamento.
