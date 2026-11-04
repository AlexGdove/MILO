import { create } from 'zustand';

/** Событие Chromium, не входящее в стандартные типы DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

interface InstallState {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
}

const useInstallStore = create<InstallState>()(() => ({
  deferred: null,
  installed: isStandalone(),
}));

// Событие может прийти раньше, чем откроется экран с кнопкой, поэтому слушаем с момента загрузки модуля.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  useInstallStore.setState({ deferred: event as BeforeInstallPromptEvent });
});
window.addEventListener('appinstalled', () => {
  useInstallStore.setState({ deferred: null, installed: true });
});

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

export const useInstallPrompt = () => {
  const deferred = useInstallStore((state) => state.deferred);
  const installed = useInstallStore((state) => state.installed);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    useInstallStore.setState({ deferred: null });
  };

  return { canInstall: deferred !== null, installed, isIos, install };
};
