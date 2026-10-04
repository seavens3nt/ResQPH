import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, getMission, listMyMissions, nextValidStatus, updateMissionStatus } from '../../api/missions'
import type { MissionDetail, OfflineQueueEntry } from '../../api/missions'
import { acknowledgeEvent, clearMission, discardEvent, enqueueEvent, readMission, readQueue, updateQueue, writeMission } from './offlineStore'

interface OfflineMissionState {
  actorId: string | null
  mission: MissionDetail | null
  lastSyncedAt: string | null
  entry: OfflineQueueEntry | null
  storageError: string | null
  networkError: string | null
  currentServerMission: MissionDetail | null
  serverConfirmed: boolean
  loading: boolean
}
const emptyState: OfflineMissionState = {
  actorId: null, mission: null, lastSyncedAt: null, entry: null,
  storageError: null, networkError: null, currentServerMission: null, serverConfirmed: false, loading: true,
}
const message = (error: unknown) => error instanceof Error ? error.message : 'Offline storage is unavailable.'

export function useOfflineMission(actorId: string | null, demoOffline: boolean) {
  const [state, setState] = useState(emptyState)
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const autoSyncEvent = useRef<string | null>(null)
  const session = useRef(0)
  const sessionActor = useRef<string | null>(null)
  const loadRevision = useRef(0)
  const pendingActorLoad = useRef<string | null>(null)
  const isOffline = demoOffline || !online

  // Generation tokens prevent late callbacks crossing account switches,
  // logout, unmount, or StrictMode's effect restart.
  useEffect(() => {
    session.current += 1
    sessionActor.current = actorId
    autoSyncEvent.current = null
    return () => { session.current += 1; sessionActor.current = null }
  }, [actorId])

  const load = useCallback(async () => {
    if (!actorId || sessionActor.current !== actorId) return
    if (inFlight.current) { pendingActorLoad.current = actorId; return }
    pendingActorLoad.current = null
    const token = session.current
    const revision = ++loadRevision.current
    const current = () => session.current === token && loadRevision.current === revision
    const [cacheResult, queueResult] = await Promise.allSettled([readMission(actorId), readQueue(actorId)])
    if (!current()) return
    const cached = cacheResult.status === 'fulfilled' ? cacheResult.value : null
    const queued = queueResult.status === 'fulfilled' ? queueResult.value : null
    const errors = [cacheResult, queueResult].flatMap((result) => result.status === 'rejected' ? [message(result.reason)] : [])
    setState({ ...emptyState, actorId, mission: cached?.mission ?? null,
      lastSyncedAt: cached?.last_synced_at ?? null, entry: queued, storageError: errors.join(' ') || null })
    try {
      if (!isOffline) {
        // Pending events may refer to a mission no longer in the active list.
        const serverMission = queued ? await getMission(queued.missionId) : (await listMyMissions())[0]
        if (!current()) return
        if (serverMission) {
          setState((value) => ({ ...value, mission: serverMission, serverConfirmed: true,
            currentServerMission: queued?.syncState === 'failed' ? serverMission : null }))
          try {
            const record = await writeMission(actorId, serverMission)
            if (current()) setState((value) => ({ ...value, mission: record.mission, lastSyncedAt: record.last_synced_at }))
          } catch (error) {
            if (current()) setState((value) => ({ ...value, lastSyncedAt: null, storageError: message(error) }))
          }
        } else {
          // An authoritative empty list must not resurrect an old assignment.
          setState((value) => ({ ...value, mission: null, lastSyncedAt: null, serverConfirmed: true }))
          try { await clearMission(actorId) }
          catch (error) { if (current()) setState((value) => ({ ...value, storageError: message(error) })) }
        }
      }
    } catch (error) {
      if (current()) setState((value) => ({ ...value, networkError: message(error), serverConfirmed: false }))
    } finally {
      if (current()) setState((value) => ({ ...value, loading: false }))
    }
  }, [actorId, isOffline])

  useEffect(() => {
    const onlineHandler = () => setOnline(true)
    const offlineHandler = () => setOnline(false)
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
    return () => { window.removeEventListener('online', onlineHandler); window.removeEventListener('offline', offlineHandler) }
  }, [])
  useEffect(() => { void Promise.resolve().then(load) }, [load])
  useEffect(() => {
    // A previous actor's request may have held the lock during this actor's
    // initial load. Resume only that skipped initialization when it releases.
    if (!busy && actorId && pendingActorLoad.current === actorId) void load()
  }, [actorId, busy, load])

  const synchronize = useCallback(async () => {
    if (!actorId || sessionActor.current !== actorId || state.actorId !== actorId || !online || demoOffline || inFlight.current || state.loading || !state.entry || state.entry.syncState === 'failed') return
    const token = session.current
    const current = () => session.current === token
    inFlight.current = true
    setBusy(true)
    const syncing = { ...state.entry, syncState: 'syncing' as const }
    try {
      // Storage failure must not be mislabeled as an API transport failure.
      try { await updateQueue(actorId, syncing) }
      catch (error) {
        if (current()) setState((value) => ({ ...value, storageError: message(error) }))
        return
      }
      if (!current()) return
      setState((value) => ({ ...value, entry: syncing, storageError: null }))
      let accepted: MissionDetail
      try { accepted = await updateMissionStatus(syncing.missionId, syncing.body) }
      catch (error) {
        if (!current()) return
        const permanent = error instanceof ApiError && error.httpStatus >= 400 && error.httpStatus < 500
        let latest: MissionDetail | null = null
        if (error instanceof ApiError && error.isConflict) {
          try { latest = await getMission(syncing.missionId) } catch { /* No fabricated current state. */ }
          if (!current()) return
        }
        const retained = { ...syncing, syncState: permanent ? 'failed' as const : 'pending' as const, failureReason: message(error) }
        let storageError: string | null = null
        try { await updateQueue(actorId, retained) } catch (error) { storageError = message(error) }
        if (current()) setState((value) => ({ ...value, entry: retained, currentServerMission: latest, storageError, serverConfirmed: false }))
        return
      }
      if (!current()) return
      try {
        const record = await acknowledgeEvent(actorId, syncing.localId, accepted)
        if (current()) setState((value) => ({ ...value, mission: record.mission, lastSyncedAt: record.last_synced_at,
          entry: null, currentServerMission: null, networkError: null, storageError: null, serverConfirmed: true }))
      } catch (error) {
        // The server may have committed. Preserve the ID for replay, never
        // label a failed local transaction as a durable success.
        const retained = { ...syncing, syncState: 'pending' as const }
        try { await updateQueue(actorId, retained) } catch { /* Syncing recovers on reload. */ }
        if (current()) setState((value) => ({ ...value, entry: retained, storageError: message(error), serverConfirmed: false }))
      }
    } finally { inFlight.current = false; setBusy(false) }
  }, [actorId, demoOffline, online, state.actorId, state.entry, state.loading])

  useEffect(() => {
    if (isOffline) { autoSyncEvent.current = null; return }
    const eventId = state.entry?.localId
    if (busy || state.loading || state.actorId !== actorId || !eventId || state.entry?.syncState === 'failed' || autoSyncEvent.current === eventId) return
    autoSyncEvent.current = eventId
    void Promise.resolve().then(synchronize)
  }, [actorId, busy, isOffline, state.actorId, state.entry, state.loading, synchronize])

  const advance = useCallback(async () => {
    if (!actorId || sessionActor.current !== actorId || state.actorId !== actorId || state.loading || !state.mission || state.entry || inFlight.current) return
    const next = nextValidStatus(state.mission.status)
    if (!next) return
    const token = session.current
    inFlight.current = true
    setBusy(true)
    const recordedAt = new Date().toISOString()
    const eventId = crypto.randomUUID()
    const entry: OfflineQueueEntry = {
      localId: eventId, missionId: state.mission.id,
      body: { event_id: eventId, new_status: next, expected_mission_version: state.mission.version,
        client_recorded_at: recordedAt, source: 'offline-sync' },
      syncState: 'pending', enqueuedAt: recordedAt,
    }
    // Persist before every send, even online, so a lost response can replay
    // the exact original payload instead of manufacturing another event.
    try {
      await enqueueEvent(actorId, entry)
      if (session.current === token) setState((value) => ({ ...value, entry, storageError: null }))
    } catch (error) {
      if (session.current === token) setState((value) => ({ ...value, storageError: message(error) }))
    } finally { inFlight.current = false; setBusy(false) }
  }, [actorId, state.actorId, state.entry, state.loading, state.mission])

  const retry = useCallback(() => { if (state.entry?.syncState === 'pending') void synchronize() }, [state.entry, synchronize])
  const discard = useCallback(async () => {
    if (!actorId || sessionActor.current !== actorId || state.actorId !== actorId || state.entry?.syncState !== 'failed' || inFlight.current) return
    const token = session.current
    inFlight.current = true
    setBusy(true)
    try {
      const latest = state.currentServerMission
      // Store reviewed authoritative state before unlocking new actions.
      const record = latest ? await writeMission(actorId, latest) : null
      if (!latest) await clearMission(actorId)
      await discardEvent(actorId, state.entry.localId)
      if (session.current === token) setState((value) => ({ ...value, mission: latest,
        lastSyncedAt: record?.last_synced_at ?? null,
        entry: null, currentServerMission: null, storageError: null, serverConfirmed: Boolean(latest) }))
    } catch (error) {
      if (session.current === token) setState((value) => ({ ...value, storageError: message(error) }))
    } finally { inFlight.current = false; setBusy(false) }
  }, [actorId, state.actorId, state.currentServerMission, state.entry])

  const ready = Boolean(actorId) && state.actorId === actorId
  return {
    ...state, loading: ready ? state.loading : actorId !== null,
    mission: ready ? state.mission : null, entry: ready ? state.entry : null,
    lastSyncedAt: ready ? state.lastSyncedAt : null,
    currentServerMission: ready ? state.currentServerMission : null,
    storageError: ready ? state.storageError : null, networkError: ready ? state.networkError : null,
    isOffline, isDemoOffline: demoOffline && online,
    isCached: ready && Boolean(state.lastSyncedAt),
    isStale: isOffline || !ready || !state.serverConfirmed,
    busy, advance, retry, discard, reload: load,
  }
}
