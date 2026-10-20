import { useNavigate, type To } from 'react-router';

// Seta de voltar das telas de detalhe no celular. Volta no histórico, como o botão físico do
// aparelho — assim os dois levam ao mesmo lugar. Quem chegou por link direto não tem tela
// anterior dentro do app: aí vai para `fallback`, em vez de sair do console.
export function useGoBack() {
  const navigate = useNavigate();
  return (fallback: To) => {
    // O React Router guarda a posição no histórico em `state.idx`; 0 é a primeira tela do app.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
}
