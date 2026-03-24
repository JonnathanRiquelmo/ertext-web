import { ModelingToolPage } from './ModelingToolPage';
import { StartupTemplatePage } from './StartupTemplatePage';

function resolveRoute(pathname: string): 'workspace' | 'template' {
  if (pathname === '/template') {
    return 'template';
  }
  return 'workspace';
}

export function App() {
  const route = resolveRoute(window.location.pathname);
  if (route === 'template') {
    return <StartupTemplatePage />;
  }
  return <ModelingToolPage />;
}
