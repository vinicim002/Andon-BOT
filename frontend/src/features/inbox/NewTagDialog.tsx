import { useState, type FormEvent } from 'react';
import { api } from '../../api';
import { Button, TagChip } from '../../design-system/components';
import { Field, TextInput } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import type { Tag, TagColor } from '../../domain/types';
import { cx } from '../../lib/cx';
import dialogs from './dialogs.module.css';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (tag: Tag) => void };

const colors: { value: TagColor; label: string }[] = [
  { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' },
  { value: 'orange', label: 'Laranja' },
  { value: 'red', label: 'Vermelho' },
  { value: 'purple', label: 'Roxo' },
  { value: 'cyan', label: 'Ciano' },
];

export function NewTagDialog(props: Props) {
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Nova etiqueta"
      description="Fica disponível para todas as conversas da empresa."
    >
      {props.open && <NewTagForm {...props} />}
    </Modal>
  );
}

function NewTagForm({ onCreated, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<TagColor>('blue');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    onCreated(await api.createTag(name, color));
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      <Field label="Nome">{(id) => <TextInput id={id} autoFocus maxLength={30} placeholder="Ex.: Urgente" value={name} onChange={(e) => setName(e.target.value)} />}</Field>
      <div>
        <span className={dialogs.fieldLabel} id="tag-color-label">
          Cor
        </span>
        <div className={dialogs.colors} role="radiogroup" aria-labelledby="tag-color-label">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={color === c.value}
              aria-label={c.label}
              title={c.label}
              className={cx(dialogs.color, color === c.value && dialogs.colorSelected)}
              style={{ background: `var(--tag-${c.value})` }}
              onClick={() => setColor(c.value)}
            />
          ))}
        </div>
      </div>
      {name.trim() && (
        <p className={dialogs.contextLine}>
          Prévia: <TagChip color={color}>{name.trim()}</TagChip>
        </p>
      )}
      <div className={dialogs.actions}>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={!name.trim() || saving}>
          Criar e aplicar
        </Button>
      </div>
    </form>
  );
}
