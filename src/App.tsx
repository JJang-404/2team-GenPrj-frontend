import { useEffect, useState } from 'react';
import EditingPage from './pages/EditingPage';
import InitPage from './pages/InitPage';

type AppRoute = 'init' | 'editing';

function resolveRoute(pathname: string): AppRoute {
  return pathname.startsWith('/editing') ? 'editing' : 'init';
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => resolveRoute(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setRoute(resolveRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return route === 'editing' ? <EditingPage /> : <InitPage />;
}
