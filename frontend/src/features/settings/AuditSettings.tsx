import { useMemo, useState } from 'react';
import { ArrowRight, Bot, Search, ShieldCheck, X } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { Avatar, Badge, Button, DataTable, EmptyState, ErrorState, LoadingState } from '../../design-system/components';
import { Select, TextInput } from '../../design-system/forms';
import { auditAction, auditEntity } from '../../domain/labels';
import type { AuditEntityType, AuditEvent } from '../../domain/audit';
import type { User } from '../../domain/types';
import { formatDateTime } from '../../lib/format';
import s from './Settings.module.css';

const DAY = 24 * 60 * 60 * 1000;

const windowOf = (days: string) => ({ days, cutoff: days ? Date.now() - Number(days) * DAY : 0 });

// Períodos relativos: a pergunta de quem audita é "o que mudou hoje / nesta semana".
const periods = [
  { value: '1', label: 'Últimas 24 horas' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '', label: 'Tudo' },
];

export function AuditSettings() {
  const data = useQuery(() => Promise.all([api.auditEvents(), api.users()]));
  const [search, setSearch] = useState('');
  const [actorId, setActorId] = useState('');
  const [entityType, setEntityType] = useState('');
  // A janela é calculada no momento da escolha e guardada junto do período: com Date.now()
  // dentro do filtro, a lista mudaria sozinha enquanto a tela está aberta.
  const [period, setPeriod] = useState(() => windowOf('7'));
  const { days, cutoff } = period;

  const events = data.data?.[0];
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (events ?? []).filter(
      (event) =>
        (!term || event.entityLabel.toLowerCase().includes(term) || event.summary.toLowerCase().includes(term)) &&
        (!actorId || (actorId === 'system' ? !event.actorUserId : event.actorUserId === actorId)) &&
        (!entityType || event.entityType === entityType) &&
        new Date(event.at).getTime() >= cutoff,
    );
  }, [events, search, actorId, entityType, cutoff]);

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} />;
  const [all, users] = data.data;
  const filtering = Boolean(search || actorId || entityType || days !== '7');

  const clear = () => {
    setSearch('');
    setActorId('');
    setEntityType('');
    setPeriod(windowOf('7'));
  };

  return (
    <>
      <header className={s.header}>
        <div>
          <h2 className={s.title}>Auditoria</h2>
          <p className={s.description}>
            Quem mudou o quê, quando, e de qual valor para qual. Um evento registrado não é editado nem apagado.
          </p>
        </div>
      </header>

      <div className={s.toolbar}>
        <div className={s.auditSearch}>
          <Search aria-hidden />
          <TextInput
            type="search"
            placeholder="Buscar por entidade ou ação"
            aria-label="Buscar na auditoria"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select aria-label="Filtrar por autor" value={actorId} onChange={(e) => setActorId(e.target.value)}>
          <option value="">Todos os autores</option>
          <option value="system">Sistema</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Filtrar por tipo" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="">Tudo</option>
          {(Object.keys(auditEntity) as AuditEntityType[]).map((type) => (
            <option key={type} value={type}>
              {auditEntity[type]}
            </option>
          ))}
        </Select>
        <Select aria-label="Período" value={days} onChange={(e) => setPeriod(windowOf(e.target.value))}>
          {periods.map((period) => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </Select>
        {filtering && (
          <Button variant="ghost" icon={<X />} onClick={clear}>
            Limpar
          </Button>
        )}
        <span className={s.auditCount}>
          {visible.length} de {all.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nenhum evento no período"
          description={filtering ? 'Amplie o período ou limpe os filtros.' : 'As mudanças de configuração aparecem aqui.'}
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Autor</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>O que mudou</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((event) => (
              <tr key={event.id}>
                <td className={s.runNumber}>{formatDateTime(event.at)}</td>
                <td>
                  <Actor event={event} users={users} />
                </td>
                <td>
                  <Badge tone={auditAction[event.action].tone}>{auditAction[event.action].label}</Badge>
                </td>
                <td>
                  <span className={s.auditEntity}>
                    <strong>{event.entityLabel}</strong>
                    <small>{auditEntity[event.entityType]}</small>
                  </span>
                </td>
                <td>
                  <span className={s.auditSummary}>
                    {event.summary}
                    {event.changes.length > 0 && (
                      <span className={s.changeList}>
                        {event.changes.map((change) => (
                          <span key={change.field} className={s.change}>
                            <span className={s.changeField}>{change.field}</span>
                            {change.from && <span className={s.changeFrom}>{change.from}</span>}
                            <ArrowRight aria-hidden />
                            <span className={s.changeTo}>{change.to ?? 'vazio'}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      <p className={s.securityNote}>
        <ShieldCheck aria-hidden />
        <span>
          Tokens, senhas e chaves nunca entram na trilha: a troca de uma credencial aparece como fato (“substituída”), sem o valor
          antigo nem o novo.
        </span>
      </p>
    </>
  );
}

// Sem ator = ação do próprio sistema (indexador, rodízio de fila, worker). Precisa ficar
// visualmente distinto, senão parece que alguém fez.
function Actor({ event, users }: { event: AuditEvent; users: User[] }) {
  if (!event.actorUserId) {
    return (
      <span className={s.auditActor}>
        <span className={s.systemIcon} aria-hidden>
          <Bot />
        </span>
        Sistema
      </span>
    );
  }
  const user = users.find((u) => u.id === event.actorUserId);
  return (
    <span className={s.auditActor}>
      <Avatar name={user?.name ?? 'Usuário removido'} size={24} />
      {user?.name ?? 'Usuário removido'}
    </span>
  );
}
