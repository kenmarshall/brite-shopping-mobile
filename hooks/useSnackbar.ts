import { useCallback, useRef, useState } from 'react';

import type { SnackbarMessage } from '@/components/ui/Snackbar';

interface SnackbarState {
  message: SnackbarMessage | null;
  /** Shows a message, with an action button when both label and handler are given. */
  show: (text: string, action?: { label: string; onPress: () => void }) => void;
  dismiss: () => void;
}

export function useSnackbar(): SnackbarState {
  const [message, setMessage] = useState<SnackbarMessage | null>(null);
  const nextId = useRef(0);

  const show = useCallback((text: string, action?: { label: string; onPress: () => void }) => {
    nextId.current += 1;
    setMessage({ id: nextId.current, text, actionLabel: action?.label, onAction: action?.onPress });
  }, []);
  const dismiss = useCallback(() => setMessage(null), []);

  return { message, show, dismiss };
}
