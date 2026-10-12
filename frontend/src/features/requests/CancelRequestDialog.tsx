import { Modal } from '../../components/ui/Modal'
export function CancelRequestDialog({open,busy,onClose,onConfirm}: {open:boolean;busy:boolean;onClose:()=>void;onConfirm:()=>void}) {
  return <Modal isOpen={open} onClose={()=>{if (!busy) onClose()}} title="Cancel request confirmation">
    <p>Cancel this request before travel starts? The assigned station will be released. Your request and cancellation history will remain.</p>
    <div className="workspace-actions"><button disabled={busy} onClick={onClose}>Keep request</button><button data-action-tone="danger" disabled={busy} onClick={onConfirm}>{busy ? 'Cancelling…' : 'Yes, cancel request'}</button></div>
  </Modal>
}
