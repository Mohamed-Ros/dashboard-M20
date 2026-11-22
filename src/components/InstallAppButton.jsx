import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

// Shows an "Install app" button when the browser allows installing the dashboard (Chrome/Edge desktop).
export default function InstallAppButton({ className = '' }) {
  const [deferred, setDeferred] = useState(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => setDeferred(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!deferred) return null;
  const install = async () => {
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <button
      onClick={install}
      className={`inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium h-8 px-3 text-xs hover:bg-brand-50 ${className}`}
    >
      <Download size={14} />
      <span>تثبيت التطبيق</span>
    </button>
  );
}
