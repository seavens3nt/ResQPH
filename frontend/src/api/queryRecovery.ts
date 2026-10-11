import { isAxiosError } from 'axios'
import { ApiError } from './missions'
import { retryAfterDelay } from './retryAfter'
export function readFailure(error: unknown) {
  if (error instanceof ApiError) return {status:error.httpStatus,code:error.code,message:error.message}
  if (isAxiosError(error)) return {status:error.response?.status ?? 0,code:error.response?.data?.error?.code ?? 'network_error',message:error.response?.data?.error?.message ?? 'The API could not be reached. Check the API address, server and connection.'}
  return {status:0,code:'client_error',message:error instanceof Error ? error.message : 'The response could not be processed.'}
}
export function sessionReadBlocked(error: unknown): boolean {
  if (!error) return false
  const failure=readFailure(error)
  return failure.status===401 || failure.status===403 || failure.code==='session_identity_changed'
}
export function recordRefreshInterval(error: unknown, interval: number): number | false {
  if (sessionReadBlocked(error)) return false
  return error ? retryAfterDelay(error,Math.max(interval,15_000)) : interval
}
