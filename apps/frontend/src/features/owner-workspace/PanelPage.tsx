import { useTranslation } from 'react-i18next';

export function PanelPage() {
  const { t } = useTranslation();

  return (
    <main
      aria-label={t('app.workspace.navigation.panel')}
      className="min-h-screen flex-1 bg-background p-6 text-foreground"
    />
  );
}
