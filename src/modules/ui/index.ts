import type { ModuleDescriptor } from '../../shared/types/contracts';
export * from './textEditor';
export * from './diagramEditor';
export * from './exporters';

export const UiModule: ModuleDescriptor = {
  name: 'ui',
  status: 'ready'
};
