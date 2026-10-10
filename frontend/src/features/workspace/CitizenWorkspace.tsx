import { WorkspaceCard } from './WorkspaceUI'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyRescueRequests, useCancelRescueRequest } from '../requests/hooks'
import { RequestStatusView } from '../../pages/dashboard/views/citizen/RequestStatusView'
import { RequestForm } from '../../pages/dashboard/views/citizen/RequestForm'
import { CitizenMap } from './CitizenMap'
import { useCitizenDraft } from './CitizenDraftContext'
import { CitizenHome } from './CitizenHome'
import { UnfinishedRequestNotice } from './UnfinishedRequestNotice'
import { RequestSubmittedNotice } from './RequestSubmittedNotice'
import { CitizenRequests } from './CitizenRequests'
import { Modal } from '../../components/ui/Modal'
import './requestRescueModal.css'
import './requestStatusModal.css'
export function CitizenWorkspace({section}: {section: string}) {
  const list = useMyRescueRequests()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)
  const [tracking, setTracking] = useState(false)
  const cancellation = useCancelRescueRequest()
  const [mapCancelError,setMapCancelError] = useState<string|null>(null)
  function cancelFromMap() {
    const request = list.data?.items.find(r=>r.id===selected)
    if (!request || request.status!=='pending' || cancellation.isPending) return
    setMapCancelError(null)
    cancellation.mutate({requestId:request.id,payload:{reason:'Citizen cancelled via prototype UI',version:request.version}}, {
      onSuccess:()=>{setCancelled(null);setSuccess(null)},
      onError:err=>{
        if ((err as {response?:{status?:number}}).response?.status===409) {
          void list.refetch()
          setMapCancelError('Conflict: the request state changed before cancellation. Refreshing the latest status.')
        } else setMapCancelError('Cancellation failed. Try again.')
      },
    })
  }
  const draftContext = useCitizenDraft()
  const [success, setSuccess] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState<string | null>(null)
  const [filter, setFilter] = useState('active')
  const [requestOpen, setRequestOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const openRequest = () => setRequestOpen(true)
  const closeRequest = () => { if (!submitting) setRequestOpen(false) }
  const statusModal = <Modal isOpen={tracking && Boolean(selected)} onClose={()=>{setTracking(false)}} title="Request status" maxWidth="var(--request-status-max-width, 1260px)" className="request-status-modal">
    {selected && <RequestStatusView key={selected} requestId={selected} popup onCancelled={()=>{setTracking(false);setCancelled(selected);setSuccess(null)}}/>}
  </Modal>
  const requestModal = <><Modal isOpen={requestOpen} onClose={closeRequest} title="Where is help needed?" headerNote="Changes stay in this tab while you navigate; signing out or reloading clears the draft." maxWidth="1440px" className="request-rescue-modal" dismissOnBackdrop={false}>
    <RequestForm requireReview modalLayout onBusyChange={setSubmitting} onCancel={closeRequest} onSuccess={r => {setRequestOpen(false);setSelected(r.id);setSuccess(r.id);setTracking(false);navigate('/dashboard?view=inquiries')}}/>
  </Modal>{statusModal}{success && <RequestSubmittedNotice key={success} onExpire={()=>setSuccess(null)}/>} {cancelled && <RequestSubmittedNotice key={`cancelled-${cancelled}`} variant="cancelled" onExpire={()=>setCancelled(null)}/>}</>
  if (['overview'].includes(section)) return <><CitizenHome onRequest={openRequest} hasDraft={Boolean(draftContext?.draft) && !requestOpen} onDiscard={()=>draftContext?.saveDraft(null)} onView={id=>{setSelected(id);setTracking(true)}}/>{requestModal}</>
  if (section === 'map') return <CitizenMap selected={selected} onSelect={id=>{setSelected(id||null);setMapCancelError(null);setTracking(false)}} onCancel={cancelFromMap} isCancelling={cancellation.isPending} cancelError={mapCancelError}/>
  if (section === 'request') return <WorkspaceCard className="workspace-editor"><h2>Where is help needed?</h2><p>Use synthetic details only. Confirm the location and number of people before sending. Changes stay in this tab while you navigate; signing out or reloading clears the draft.</p><RequestForm requireReview onCancel={() => navigate('/dashboard?view=inquiries')} onSuccess={r => {setSelected(r.id); setSuccess(r.id); setTracking(false); navigate('/dashboard?view=inquiries')}} /></WorkspaceCard>
  return <>{requestModal}<div className="workspace-stack">
    {draftContext?.draft && !requestOpen && <UnfinishedRequestNotice onResume={openRequest} onDiscard={()=>draftContext.saveDraft(null)}/>}
    <CitizenRequests filter={filter} onFilter={value=>{setFilter(value);setSelected(null);setTracking(false)}} onNew={openRequest} onSelect={id=>{setSelected(id);setTracking(true)}} selected={tracking ? selected : null}/>
  </div></>
}
