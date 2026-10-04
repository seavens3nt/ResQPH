import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ApiError, getMission, listMyMissions, nextValidStatus, updateMissionStatus,
} from '../../api/missions'
import type { MissionDetail, OfflineQueueEntry, StatusEventBody } from '../../api/missions'
import {
  acknowledgeEvent, discardEvent, enqueueEvent, readMission, readQueue,
  updateQueue, writeMission,
} from './offlineStore'

interface OfflineMissionState {
  actorId: string | null
  mission: MissionDetail | null
  lastSyncedAt: string | null
  entry: OfflineQueueEntry | null
  storageError: string | null
  currentServerMission: MissionDetail | null
  serverConfirmed: boolean
  loading: boolean
}

const emptyState: OfflineMissionState = {
  actorId: null, mission: null, lastSyncedAt: null, entry: null, storageError: null, currentServerMission: null, serverConfirmed: false, loading: true,
}

export function useOfflineMission(actorId: string | null, demoOffline: boolean) {
  const [state, setState] = useState(emptyState)
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const autoSyncEvent = useRef<string | null>(null)
  const currentActor = useRef(actorId)
  const isOffline = demoOffline || !online

  useEffect(() => { currentActor.current = actorId }, [actorId])

  const reportStorageError = useCallback((error: unknown) => {
    setState((current) => ({ ...current, storageError: error instanceof Error ? error.message : 'Offline storage is unavailable.' }))
  }, [])

  const load = useCallback(async () => {
    if (!actorId) return
    let cachedMission: MissionDetail | null = null
    let cachedAt: string | null = null
    let queued: OfflineQueueEntry | null = null
    try {
      const [cached, entry] = await Promise.all([readMission(actorId), readQueue(actorId)])
      cachedMission = cached?.mission ?? null
      cachedAt = cached?.last_synced_at ?? null
      queued = entry
    } catch (error) {
      reportStorageError(error)
    }
    if (currentActor.current !== actorId) return
    setState({ ...emptyState, actorId, mission: cachedMission, lastSyncedAt: cachedAt, entry: queued, loading: true })
    try {
      if (!isOffline) {
        const [serverMission] = await listMyMissions()
        if (currentActor.current !== actorId) return
        if (serverMission) {
          setState((current) => ({ ...current, actorId, mission: serverMission, currentServerMission: null, serverConfirmed: true }))
          try {
            const record = await writeMission(actorId, serverMission)
            if (currentActor.current !== actorId) return
            setState((current) => ({ ...current, mission: record.mission, lastSyncedAt: record.last_synced_at, storageError: null }))
          } catch (error) {
            reportStorageError(error)
          }
        }
      }
    } catch (error) {
      if (!(error instanceof ApiError)) reportStorageError(error)
    } finally {
      if (currentActor.current === actorId) setState((current) => ({ ...current, loading: false }))
    }
  }, [actorId, isOffline, reportStorageError])

  useEffect(() => {
    const onlineHandler = () => setOnline(true)
    const offlineHandler = () => setOnline(false)
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
    return () => { window.removeEventListener('online', onlineHandler); window.removeEventListener('offline', offlineHandler) }
  }, [])

  useEffect(() => { void load() }, [load])

  const synchronize = useCallback(async () => {
    if (!actorId || state.actorId !== actorId || !online || demoOffline || inFlight.current || !state.entry || state.entry.syncState === 'failed') return
    inFlight.current = true
    setBusy(true)
    const syncing = { ...state.entry, syncState: 'syncing' as const }
    try {
      await updateQueue(actorId, syncing)
      if (currentActor.current !== actorId) return
      setState((current) => ({ ...current, entry: syncing, storageError: null }))
      const accepted = await updateMissionStatus(syncing.missionId, syncing.body)
      if (currentActor.current !== actorId) return
      const record = await acknowledgeEvent(actorId, syncing.localId, accepted)
      setState((current) => ({ ...current, mission: record.mission, lastSyncedAt: record.last_synced_at, entry: null, currentServerMission: null, serverConfirmed: true }))
    } catch (error) {
      const statusError = error instanceof ApiError ? error : new ApiError(503, 'network_unavailable', 'The server could not be reached. Retry when connected.')
      let failed = statusError.isConflict || statusError.isForbidden
      let currentServerMission: MissionDetail | null = null
      if (statusError.isConflict) {
        try { currentServerMission = await getMission(syncing.missionId) } catch { /* Keep the attempted event; authorization may have changed. */ }
      }
      const retained = { ...syncing, syncState: failed ? 'failed' as const : 'pending' as const, failureReason: statusError.message }
      try { await updateQueue(actorId, retained) } catch (storageError) { reportStorageError(storageError) }
      setState((current) => ({ ...current, entry: retained, currentServerMission, serverConfirmed: false }))
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }, [actorId, demoOffline, online, reportStorageError, state.actorId, state.entry])

  useEffect(() => {
    if (isOffline) { autoSyncEvent.current = null; return }
    const eventId = state.entry?.localId
    if (!eventId || state.entry?.syncState === 'failed' || autoSyncEvent.current === eventId) return
    autoSyncEvent.current = eventId
    void synchronize()
  }, [isOffline, state.entry, synchronize])

  const advance = useCallback(async () => {
    if (!actorId || state.actorId !== actorId || !state.mission || state.entry || busy) return
    const next = nextValidStatus(state.mission.status)
    if (!next) return
    const recordedAt = new Date().toISOString()
    const eventId = crypto.randomUUID()
    const body: StatusEventBody = {
      event_id: eventId, new_status: next, expected_mission_version: state.mission.version,
      client_recorded_at: recordedAt, source: 'offline-sync',
    }
    if (isOffline) {
      const entry: OfflineQueueEntry = { localId: eventId, missionId: state.mission.id, body, syncState: 'pending', enqueuedAt: recordedAt }
      try { await enqueueEvent(actorId, entry); setState((current) => ({ ...current, entry, storageError: null })) }
      catch (error) { reportStorageError(error) }
      return
    }
    setBusy(true)
    try {
      const accepted = await updateMissionStatus(state.mission.id, { ...body, source: 'online' })
      if (currentActor.current !== actorId) return
      const record = await writeMission(actorId, accepted)
      setState((current) => ({ ...current, mission: record.mission, lastSyncedAt: record.last_synced_at, storageError: null, serverConfirmed: true }))
    } catch (error) {
      if (error instanceof ApiError && (error.isConflict || error.isForbidden)) {
        const attempted = { localId: eventId, missionId: state.mission.id, body, syncState: 'failed' as const, failureReason: error.message, enqueuedAt: recordedAt }
        try { await enqueueEvent(actorId, attempted); setState((current) => ({ ...current, entry: attempted })) }
        catch (storageError) { reportStorageError(storageError) }
        if (error.isConflict) {
          try { const currentServerMission = await getMission(state.mission.id); setState((current) => ({ ...current, currentServerMission })) } catch { /* Preserve attempt if refresh is unavailable. */ }
        }
      }
    } finally { setBusy(false) }
  }, [actorId, busy, isOffline, reportStorageError, state.actorId, state.entry, state.mission])

  const retry = useCallback(() => { if (state.entry?.syncState === 'pending') void synchronize() }, [state.entry, synchronize])
  const discard = useCallback(async () => {
    if (!actorId || state.entry?.syncState !== 'failed') return
    try { await discardEvent(actorId, state.entry.localId); setState((current) => ({ ...current, entry: null, currentServerMission: null, storageError: null })) }
    catch (error) { reportStorageError(error) }
  }, [actorId, reportStorageError, state.entry])

  const ready = state.actorId === actorId
  return {
    ...state,
    loading: ready ? state.loading : actorId !== null,
    mission: ready ? state.mission : null,
    entry: ready ? state.entry : null,
    lastSyncedAt: ready ? state.lastSyncedAt : null,
    currentServerMission: ready ? state.currentServerMission : null,
    storageError: ready ? state.storageError : null,
    isOffline,
    isDemoOffline: demoOffline && online,
    isCached: ready && Boolean(state.lastSyncedAt),
    isStale: isOffline || !ready || !state.serverConfirmed,
    busy,
    advance,
    retry,
    discard,
    reload: load,
  }
}
