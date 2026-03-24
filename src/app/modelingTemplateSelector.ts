import { listTemplateDefinitions } from './templateRegistry';

const TEMPLATE_OPTION_THEME_LABEL = 'Tema';

export interface TemplateSelectorOption {
  readonly id: string;
  readonly label: string;
}

export function buildTemplateOptionLabel(templateName: string, themeLabel: string): string {
  return `${templateName} — ${TEMPLATE_OPTION_THEME_LABEL}: ${themeLabel}`;
}

export const TEMPLATE_SELECTOR_OPTIONS: readonly TemplateSelectorOption[] = listTemplateDefinitions().map(
  (template) => ({
    id: template.metadata.id,
    label: buildTemplateOptionLabel(template.metadata.name, template.metadata.themeLabel)
  })
);

export function resolveInitialTemplateId(): string {
  const [firstOption] = TEMPLATE_SELECTOR_OPTIONS;
  if (!firstOption) {
    throw new Error('O seletor de modelos requer pelo menos um modelo registrado.');
  }
  return firstOption.id;
}
