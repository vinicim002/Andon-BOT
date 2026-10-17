const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const formatTime = (iso: string) => time.format(new Date(iso));
export const formatDate = (iso: string) => date.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

// Tempo relativo curto, usado em listas densas (inbox).
export function formatRelative(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return formatDate(iso);
}

// Contagem regressiva "h:mm:ss" (ou "m:ss" abaixo de 1h) até o instante informado.
export function formatCountdown(targetIso: string, now: number) {
  const total = Math.max(0, Math.floor((new Date(targetIso).getTime() - now) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function formatDayLabel(iso: string) {
  const today = new Date();
  const day = new Date(iso);
  if (day.toDateString() === today.toDateString()) return 'Hoje';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (day.toDateString() === yesterday.toDateString()) return 'Ontem';
  return formatDate(iso);
}

// Na lista: hora se for hoje, "Ontem", ou a data.
export function formatListTime(iso: string) {
  const label = formatDayLabel(iso);
  return label === 'Hoje' ? formatTime(iso) : label;
}
