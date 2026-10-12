import {expect,it} from 'vitest'
import {ApiError} from './missions'
import {readFailure,recordRefreshInterval,sessionReadBlocked} from './queryRecovery'
it('stops expired, forbidden and switched session polling without labeling them offline',()=>{
 for (const error of [new ApiError(401,'authentication_required','Sign in'),new ApiError(403,'forbidden','Wrong station'),new ApiError(409,'session_identity_changed','Account switched')]) {
  expect(sessionReadBlocked(error)).toBe(true)
  expect(recordRefreshInterval(error,5000)).toBe(false)
  expect(readFailure(error).status).toBeGreaterThan(0)
 }
})
it('honors server rate-limit delay and distinguishes transport from client processing failures',()=>{
 expect(recordRefreshInterval(new ApiError(429,'rate_limit_exceeded','Wait',[],undefined,120),5000)).toBe(120000)
 expect(readFailure(new Error('Invalid response')).code).toBe('client_error')
 expect(recordRefreshInterval(new ApiError(503,'unavailable','API unavailable'),5000)).toBe(15000)
})
