// In-app "Are you sure?" dialog. Works everywhere, including embedded pages where window.confirm is blocked.
import { useEffect, useState } from 'react';
import { Button, Modal } from './ui';

interface Request { message: string; confirmLabel: string; danger: boolean; resolve: (ok: boolean) => void }
let show: ((r: Request) => void) | null = null;

/** Ask the user to confirm. Resolves true when they press the confirm button. */
export function ask(message: string, confirmLabel = 'Yes', danger = false): Promise<boolean> {
  return new Promise((resolve) => (show ? show({ message, confirmLabel, danger, resolve }) : resolve(false)));
}

export function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null);
  useEffect(() => {
    show = setReq;
    return () => { show = null; };
  }, []);
  const close = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
  };
  return (
    <Modal open={!!req} onClose={() => close(false)} title="Please confirm" labelledBy="confirm-title">
      <p className="text-lg text-navy">{req?.message}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
        <Button variant={req?.danger ? 'accent' : 'primary'} onClick={() => close(true)} autoFocus>{req?.confirmLabel}</Button>
      </div>
    </Modal>
  );
}
