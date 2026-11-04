import { AppRouter, ErrorBoundary } from './providers';
import './styles/global.css';

export const App = () => (
  <ErrorBoundary>
    <AppRouter />
  </ErrorBoundary>
);
