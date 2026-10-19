import { EmptyState } from '../../design-system/components';
import s from './Settings.module.css';

// Seção planejada, visível para a navegação de Configurações já mostrar o que vem a seguir.
export function SoonSection({ title, description }: { title: string; description: string }) {
  return (
    <>
      <header className={s.header}>
        <div>
          <h2 className={s.title}>{title}</h2>
          <p className={s.description}>{description}</p>
        </div>
      </header>
      <EmptyState title="Em breve" description="Esta seção será desenhada nas próximas etapas." />
    </>
  );
}
