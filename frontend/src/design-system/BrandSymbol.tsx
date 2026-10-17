import { cx } from '../lib/cx';
import s from './BrandSymbol.module.css';

// Símbolo da marca. O traço escuro some no tema escuro, então existe uma versão clara;
// as duas são renderizadas e o CSS mostra a do tema ativo, sem depender de JavaScript.
export function BrandSymbol({ className, label = 'Andon BOT' }: { className?: string; label?: string }) {
  return (
    <span className={cx(s.symbol, className)} role="img" aria-label={label}>
      <img className={s.light} src="/brand/andon-symbol.png" alt="" />
      <img className={s.dark} src="/brand/andon-symbol-dark.png" alt="" />
    </span>
  );
}
