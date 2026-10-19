import { useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { Button, EmptyState, ErrorState, LoadingState } from '../../design-system/components';
import { ConfirmDialog } from '../../design-system/ConfirmDialog';
import { TextInput } from '../../design-system/forms';
import { useToast } from '../../design-system/useToast';
import type { QuickReply } from '../../domain/types';
import { QuickReplyDialog } from './QuickReplyDialog';
import s from './Settings.module.css';

export function QuickRepliesSettings() {
  const toast = useToast();
  const replies = useQuery(api.quickReplies);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<QuickReply | 'new' | null>(null);
  const [deleting, setDeleting] = useState<QuickReply | null>(null);

  if (replies.status === 'loading') return <LoadingState />;
  if (replies.status === 'error') return <ErrorState error={replies.error} />;

  const term = search.trim().toLowerCase().replace(/^\//, '');
  const visible = replies.data
    .filter((r) => !term || r.shortcut.includes(term) || r.title.toLowerCase().includes(term) || r.body.toLowerCase().includes(term))
    .sort((a, b) => a.shortcut.localeCompare(b.shortcut));

  return (
    <>
      <header className={s.header}>
        <div>
          <h2 className={s.title}>Respostas rápidas</h2>
          <p className={s.description}>
            Mensagens prontas que qualquer atendente usa digitando <kbd>/atalho</kbd> no campo de mensagem. Use <code>{'{{nome}}'}</code> para
            o primeiro nome do contato.
          </p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => setEditing('new')}>
          Nova resposta
        </Button>
      </header>

      <div className={s.searchBox}>
        <Search aria-hidden />
        <TextInput type="search" placeholder="Buscar por atalho, título ou texto" aria-label="Buscar respostas" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={replies.data.length === 0 ? 'Nenhuma resposta ainda' : 'Nada encontrado'}
          description={replies.data.length === 0 ? 'Crie a primeira para agilizar o atendimento.' : 'Ajuste a busca.'}
        />
      ) : (
        <ul className={s.replyList}>
          {visible.map((r) => (
            <li key={r.id} className={s.replyItem}>
              <span className={s.shortcut}>/{r.shortcut}</span>
              <div className={s.replyText}>
                <strong>{r.title}</strong>
                <p>{r.body}</p>
              </div>
              <div className={s.replyActions}>
                <Button variant="ghost" iconOnlyLabel={`Editar /${r.shortcut}`} icon={<Pencil />} onClick={() => setEditing(r)} />
                <Button variant="ghost" iconOnlyLabel={`Excluir /${r.shortcut}`} icon={<Trash2 />} onClick={() => setDeleting(r)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <QuickReplyDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        reply={editing === 'new' ? undefined : (editing ?? undefined)}
        onSaved={(message) => {
          setEditing(null);
          toast({ message });
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Excluir /${deleting?.shortcut ?? ''}?`}
        confirmLabel="Excluir resposta"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          const reply = deleting;
          setDeleting(null);
          await api.deleteQuickReply(reply.id);
          toast({ message: 'Resposta removida.' });
        }}
      >
        <p>Ela deixa de aparecer para toda a equipe. Mensagens já enviadas não mudam.</p>
      </ConfirmDialog>
    </>
  );
}
