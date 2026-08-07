import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Sans ce composant, une seule exception non gérée dans n'importe quel
 * composant enfant démonte tout l'arbre React et laisse une page
 * entièrement blanche, sans aucune indication pour le visiteur.
 *
 * Doit rester un composant de classe : React n'expose pas encore
 * componentDidCatch aux composants fonctionnels.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur non gérée :', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 px-6 text-center"
      >
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Une erreur est survenue
        </h1>
        <p className="text-xs font-mono text-neutral-400 max-w-sm">
          Quelque chose s'est mal passé de notre côté. Recharge la page pour réessayer.
        </p>
        <button
          onClick={() => window.location.assign('/')}
          className="px-6 py-3 bg-[#A00303] hover:bg-[#c00404] text-white text-xs font-mono font-bold uppercase tracking-widest rounded-xl transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }
}