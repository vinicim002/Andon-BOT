import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { AlertTriangle, Mic, Paperclip, Send, Smile, Type, Zap } from 'lucide-react';
import { Button } from '../../design-system/components';
import type { QuickReply } from '../../domain/types';
import { cx } from '../../lib/cx';
import { useIsMobile } from '../../lib/useIsMobile';
import s from './Inbox.module.css';

type Props = {
  onSend: (body: string, internal: boolean) => void;
  windowClosed: boolean;
  quickReplies: QuickReply[];
  contactName: string;
};

// Preenche as variáveis da resposta rápida com dados da conversa.
function fillReply(body: string, contactName: string) {
  const firstName = /^\+?\d/.test(contactName) ? '' : contactName.split(' ')[0];
  return body.replace(/\{\{nome\}\}/g, firstName).replace(/^,\s*/, '').replace(/\s+,/g, ',').trim();
}

export function Composer({ onSend, windowClosed, quickReplies, contactName }: Props) {
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [pickerForced, setPickerForced] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mobile = useIsMobile();
  const blocked = windowClosed && !internal;

  // "/" no início abre as respostas rápidas; o texto depois da barra filtra por atalho ou título.
  const slash = body.match(/^\/(\S*)$/);
  const query = (slash?.[1] ?? '').toLowerCase();
  const pickerOpen = !internal && (Boolean(slash) || pickerForced);
  const matches = pickerOpen
    ? quickReplies.filter((r) => r.shortcut.includes(query) || r.title.toLowerCase().includes(query))
    : [];
  const active = Math.min(highlight, Math.max(0, matches.length - 1));

  const choose = (reply: QuickReply) => {
    setBody(fillReply(reply.body, contactName));
    setPickerForced(false);
    setHighlight(0);
    textareaRef.current?.focus();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text || blocked) return;
    onSend(text, internal);
    setBody('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (pickerOpen && matches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((active + 1) % matches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((active - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        choose(matches[active]);
        return;
      }
    }
    if (pickerOpen && e.key === 'Escape') {
      setPickerForced(false);
      if (slash) setBody('');
      return;
    }
    // No celular não existe Shift: Enter quebra a linha e quem envia é o botão, como no
    // WhatsApp. `isComposing` evita enviar no meio de uma palavra do corretor do teclado.
    if (e.key === 'Enter' && !e.shiftKey && !mobile && !e.nativeEvent.isComposing) submit(e);
  };

  return (
    <div className={s.composerArea}>
      {pickerOpen && (
        <div className={s.quickReplies} role="listbox" id="quick-replies" aria-label="Respostas rápidas">
          <div className={s.quickRepliesHeader}>
            <Zap aria-hidden /> Respostas rápidas
            <span>↑↓ para navegar · Enter para usar · Esc para fechar</span>
          </div>
          {matches.length === 0 ? (
            <p className={s.quickEmpty}>Nenhuma resposta com “{query}”.</p>
          ) : (
            matches.map((r, i) => (
              <button
                key={r.id}
                type="button"
                role="option"
                aria-selected={i === active}
                className={cx(s.quickReply, i === active && s.quickReplyActive)}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
              >
                <span className={s.quickShortcut}>/{r.shortcut}</span>
                <span className={s.quickText}>
                  <strong>{r.title}</strong>
                  <span>{fillReply(r.body, contactName)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <form className={cx(s.composer, internal && s.composerInternal)} onSubmit={submit}>
        <div className={s.composerTabs} role="tablist" aria-label="Tipo de mensagem">
          <button type="button" role="tab" aria-selected={!internal} className={cx(s.composerTab, !internal && s.composerTabActive)} onClick={() => setInternal(false)}>
            Mensagem
          </button>
          <button type="button" role="tab" aria-selected={internal} className={cx(s.composerTab, internal && s.composerTabActive)} onClick={() => setInternal(true)}>
            Anotações internas
          </button>
        </div>

        {blocked && (
          <p className={s.windowWarning}>
            <AlertTriangle aria-hidden /> A janela de 24h do WhatsApp terminou. Envie um modelo aprovado para retomar a conversa.
          </p>
        )}

        <label htmlFor="composer" className="visually-hidden">
          {internal ? 'Anotação interna' : 'Mensagem'}
        </label>
        <textarea
          id="composer"
          ref={textareaRef}
          rows={3}
          value={body}
          disabled={blocked}
          role="combobox"
          aria-expanded={pickerOpen}
          aria-controls={pickerOpen ? 'quick-replies' : undefined}
          aria-autocomplete="list"
          placeholder={internal ? 'Nota interna — o cliente nunca vê.' : 'Digite / para adicionar uma Mensagem Pronta'}
          onChange={(e) => {
            setBody(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
        />

        <div className={s.composerToolbar}>
          <Button
            variant="ghost"
            iconOnlyLabel="Mensagens prontas"
            icon={<Zap />}
            disabled={internal}
            onClick={() => {
              setPickerForced(!pickerOpen);
              textareaRef.current?.focus();
            }}
          />
          <Button variant="ghost" iconOnlyLabel="Emoji" icon={<Smile />} />
          <Button variant="ghost" iconOnlyLabel="Formatação" icon={<Type />} />
          <Button variant="ghost" iconOnlyLabel="Anexar arquivo" icon={<Paperclip />} disabled={internal} />
          <Button variant="ghost" iconOnlyLabel="Gravar áudio" icon={<Mic />} disabled={internal} />
          <Button type="submit" variant="ghost" className={s.sendButton} iconOnlyLabel="Enviar" icon={<Send />} disabled={!body.trim() || blocked} />
        </div>
      </form>
      <p className={s.composerHint}>
        Aperte <strong>Enter</strong> para enviar ou <strong>Shift+Enter</strong> para quebrar a linha.
      </p>
    </div>
  );
}
