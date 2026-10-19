// Link de ativação que vai no e-mail do convite. O painel só o exibe no ambiente de
// desenvolvimento (sem servidor de e-mail); em produção quem envia é o back-end.
export const inviteLink = (token: string) => `${window.location.origin}/convite/${token}`;
