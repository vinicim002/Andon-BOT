import { EmptyState, Page, PageHeader } from '../../design-system/components';

// Telas ainda não desenhadas: deixam a navegação completa visível para discutir o produto.
export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <Page>
      <PageHeader title={title} description={description} />
      <EmptyState title="Em definição" description="Esta tela será desenhada nas próximas etapas." />
    </Page>
  );
}
