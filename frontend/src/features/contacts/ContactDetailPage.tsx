import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Building2, MessageSquare, Pencil, Plus, Ticket as TicketIcon, Trash2 } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { useCurrentUser } from '../../app/permissions';
import { Avatar, Badge, Button, EmptyState, ErrorState, LoadingState, Page, TagChip } from '../../design-system/components';
import { ConfirmDialog } from '../../design-system/ConfirmDialog';
import { Select } from '../../design-system/forms';
import { Timeline, type TimelineItem } from '../../design-system/Timeline';
import { useToast } from '../../design-system/useToast';
import { conversationStatus, ticketStatus } from '../../domain/labels';
import type { Contact, Conversation, Tag, Ticket } from '../../domain/types';
import { formatDate, formatDateTime } from '../../lib/format';
import { ContactDialog } from './ContactDialog';
import s from './Contacts.module.css';

export function ContactDetailPage() {
  const { contactId = '' } = useParams();
  const contact = useQuery(() => api.contact(contactId), contactId);
  const conversations = useQuery(() => api.conversationsByContact(contactId), contactId);
  const tickets = useQuery(() => api.ticketsByContact(contactId), contactId);
  const reference = useQuery(() => Promise.all([api.contacts(), api.tags()]));

  if (contact.status === 'error') {
    return (
      <Page>
        <BackLink />
        <ErrorState error={contact.error} />
      </Page>
    );
  }
  if (contact.status === 'loading' || conversations.status !== 'success' || tickets.status !== 'success' || reference.status !== 'success') {
    return <LoadingState />;
  }

  const [all, tags] = reference.data;
  return (
    <ContactDetail
      contact={contact.data}
      conversations={conversations.data}
      tickets={tickets.data}
      siblings={all.filter((c) => c.id !== contact.data.id && c.organization?.id && c.organization.id === contact.data.organization?.id)}
      tags={tags}
    />
  );
}

function BackLink() {
  return (
    <Link to="/contatos" className={s.back}>
      <ArrowLeft aria-hidden /> Contatos
    </Link>
  );
}

type DetailProps = {
  contact: Contact;
  conversations: Conversation[];
  tickets: Ticket[];
  siblings: Contact[];
  tags: Tag[];
};

function ContactDetail({ contact, conversations, tickets, siblings, tags }: DetailProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const { can } = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const canEdit = can('contacts.edit');

  const items = useMemo(() => timelineOf(contact, conversations, tickets), [contact, conversations, tickets]);

  const setTags = async (next: Tag[], message: string) => {
    try {
      await api.setContactTags(contact.id, next);
      toast({ message });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : 'Não foi possível salvar as etiquetas.', tone: 'error' });
    }
  };

  const available = tags.filter((t) => !contact.tags.some((applied) => applied.id === t.id));

  return (
    <Page>
      <BackLink />

      <header className={s.detailHeader}>
        <Avatar name={contact.name} size={56} />
        <div className={s.detailTitle}>
          <h1>{contact.name}</h1>
          <p className={s.detailSubtitle}>
            <span className={s.code}>{contact.phone}</span>
            <span aria-hidden>·</span>
            <span>Código {contact.code}</span>
            {contact.organization && (
              <>
                <span aria-hidden>·</span>
                <span className={s.orgInline}>
                  <Building2 aria-hidden /> {contact.organization.name}
                </span>
              </>
            )}
          </p>
        </div>
        {canEdit && (
          <div className={s.detailActions}>
            <Button variant="secondary" icon={<Pencil />} onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button variant="ghost" iconOnlyLabel="Remover contato" icon={<Trash2 />} onClick={() => setRemoving(true)} />
          </div>
        )}
      </header>

      <div className={s.detailLayout}>
        <section className={s.mainColumn}>
          <div className={s.panel}>
            <h2 className={s.panelTitle}>Etiquetas</h2>
            <div className={s.tagRow}>
              {contact.tags.length === 0 && <span className={s.muted}>Nenhuma etiqueta aplicada.</span>}
              {contact.tags.map((tag) => (
                <TagChip
                  key={tag.id}
                  color={tag.color}
                  onRemove={
                    canEdit
                      ? () => setTags(contact.tags.filter((t) => t.id !== tag.id), `Etiqueta “${tag.name}” removida.`)
                      : undefined
                  }
                >
                  {tag.name}
                </TagChip>
              ))}
              {canEdit && available.length > 0 && (
                <label className={s.tagPicker}>
                  <span className="visually-hidden">Aplicar etiqueta</span>
                  <Select
                    value=""
                    onChange={(e) => {
                      const tag = tags.find((t) => t.id === e.target.value);
                      if (tag) setTags([...contact.tags, tag], `Etiqueta “${tag.name}” aplicada.`);
                    }}
                  >
                    <option value="">+ Aplicar etiqueta</option>
                    {available.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </label>
              )}
            </div>
          </div>

          <div className={s.panel}>
            <h2 className={s.panelTitle}>Histórico</h2>
            {items.length === 0 ? (
              <EmptyState title="Sem histórico" description="Nenhuma conversa ou ticket com este contato." />
            ) : (
              <Timeline items={items} formatAt={formatDateTime} />
            )}
          </div>
        </section>

        <aside className={s.sideColumn}>
          <div className={s.panel}>
            <h2 className={s.panelTitle}>Dados</h2>
            <dl className={s.properties}>
              <Row label="E-mail" value={contact.email} />
              <Row label="Cargo" value={contact.jobTitle} />
              <Row label="CPF" value={contact.cpf} mono />
              <Row label="CNPJ" value={contact.cnpj} mono />
              <Row label="Cadastrado em" value={formatDate(contact.createdAt)} />
            </dl>
            {contact.notes && <p className={s.notes}>{contact.notes}</p>}
          </div>

          <div className={s.panel}>
            <h2 className={s.panelTitle}>Resumo</h2>
            <dl className={s.summary}>
              <div>
                <dt>Conversas</dt>
                <dd>{conversations.length}</dd>
              </div>
              <div>
                <dt>Tickets</dt>
                <dd>{tickets.length}</dd>
              </div>
              <div>
                <dt>Abertos</dt>
                <dd>{tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length}</dd>
              </div>
            </dl>
          </div>

          {contact.organization && (
            <div className={s.panel}>
              <h2 className={s.panelTitle}>{contact.organization.name}</h2>
              {siblings.length === 0 ? (
                <p className={s.muted}>Único contato desta organização.</p>
              ) : (
                <ul className={s.siblingList}>
                  {siblings.map((sibling) => (
                    <li key={sibling.id}>
                      <Link to={`/contatos/${sibling.id}`}>
                        <Avatar name={sibling.name} size={24} />
                        <span>
                          {sibling.name}
                          {sibling.jobTitle && <small>{sibling.jobTitle}</small>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>

      <ContactDialog
        open={editing}
        onOpenChange={setEditing}
        contact={contact}
        onSaved={(_, message) => toast({ message })}
      />

      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title={`Remover ${contact.name}?`}
        confirmLabel="Remover contato"
        destructive
        onConfirm={async () => {
          setRemoving(false);
          try {
            await api.deleteContact(contact.id);
            toast({ message: `${contact.name} removido.` });
            navigate('/contatos', { replace: true });
          } catch (error) {
            toast({ message: error instanceof Error ? error.message : 'Não foi possível remover.', tone: 'error' });
          }
        }}
      >
        <p>
          Contatos com conversa ou ticket não podem ser removidos — o histórico aponta para eles. Esta ação não pode ser desfeita.
        </p>
      </ConfirmDialog>
    </Page>
  );
}

function Row({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={mono ? s.code : undefined}>{value || '—'}</dd>
    </div>
  );
}

// Conversas e tickets numa única linha do tempo: é assim que o atendente lê a relação com
// o cliente — por ordem do que aconteceu, não por tipo de registro.
function timelineOf(contact: Contact, conversations: Conversation[], tickets: Ticket[]): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      id: `contact-${contact.id}`,
      icon: <Plus />,
      title: 'Contato cadastrado',
      at: contact.createdAt,
      body: <span className={s.muted}>Código {contact.code}</span>,
    },
    ...conversations.map((c) => ({
      id: `conversation-${c.id}`,
      icon: <MessageSquare />,
      title: (
        <>
          Conversa por {c.endpoint.name} <Badge tone={conversationStatus[c.status].tone}>{conversationStatus[c.status].label}</Badge>
        </>
      ),
      at: c.lastMessage.at,
      body: <span className={s.preview}>{c.lastMessage.preview}</span>,
    })),
    ...tickets.map((t) => ({
      id: `ticket-${t.id}`,
      icon: <TicketIcon />,
      title: (
        <>
          <Link to={`/tickets/${t.id}`}>#{t.protocol}</Link> {t.subject}{' '}
          <Badge tone={ticketStatus[t.status].tone}>{ticketStatus[t.status].label}</Badge>
        </>
      ),
      at: t.createdAt,
    })),
  ];
  return items.sort((a, b) => a.at.localeCompare(b.at));
}
