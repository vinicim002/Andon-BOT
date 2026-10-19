// Link público de ativação. Com a API real, o back-end envia por e-mail e o painel só mostra o status.
export const inviteLink = (token: string) => `${window.location.origin}/convite/${token}`;
