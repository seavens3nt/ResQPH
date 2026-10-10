import { useEffect, useRef, useState } from 'react'
import './requestSubmittedNotice.css'

export function RequestSubmittedNotice({onExpire, variant = 'submitted'}: {onExpire:()=>void; variant?:'submitted'|'cancelled'}) {
  const [hovered,setHovered] = useState(false)
  const [focused,setFocused] = useState(false)
  const expire = useRef(onExpire)
  useEffect(() => { expire.current = onExpire }, [onExpire])
  useEffect(() => {
    if (hovered || focused) return
    const timer = window.setTimeout(() => expire.current(), 8000)
    return () => window.clearTimeout(timer)
  }, [hovered,focused])
  return <div className={`request-submitted-notice${variant === 'cancelled' ? ' request-cancelled-notice' : ''}`} role="status" aria-live="polite" tabIndex={0}
    onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
    onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}>
    {variant === 'cancelled' ? 'Request cancelled' : 'Your request has successfully been submitted!'}
  </div>
}
