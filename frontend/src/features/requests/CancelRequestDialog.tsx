import { Modal } from '../../components/ui/Modal'
import { createPortal } from 'react-dom'
export function CancelRequestDialog({open,busy,onClose,onConfirm}: {open:boolean;busy:boolean;onClose:()=>void;onConfirm:()=>void}) {
  // Keep the confirmation outside the status dialog's filtered containing block,
  // while retaining the workspace theme and shared action styles.
  if (typeof document === 'undefined') return null
  return createPortal(<Modal isOpen={open} onClose={()=>{if (!busy) onClose()}} title="Cancel request confirmation" className="cancel-request-confirmation" maxWidth="520px" footer={<><button disabled={busy} onClick={onClose}>Keep request</button><button data-action-tone="danger" disabled={busy} onClick={onConfirm}>{busy ? 'Cancelling…' : 'Yes, cancel request'}</button></>}>
    <p>Cancel this request before travel starts? The assigned station will be released. Your request and cancellation history will remain.</p>
  </Modal>, document.querySelector('.workspace-shell') ?? document.body)
}
