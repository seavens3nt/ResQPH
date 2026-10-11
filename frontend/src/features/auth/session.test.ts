import { describe, it, expect } from 'vitest'
import { actorId, readSession, writeSession } from './session'
import { validEmail, validPhone, validPassword } from './validation'
describe('legacy session cleanup and authenticated actor scope', () => {
  it('signs out a retired volunteer identity without touching unrelated stored data', () => {
    sessionStorage.setItem('unrelated', 'keep')
    sessionStorage.setItem('resqph.auth.user', JSON.stringify({name:'Old Volunteer',email:'old@example.test',role:'volunteer'}))
    expect(readSession()).toBeNull()
    expect(sessionStorage.getItem('resqph.auth.user')).toBeNull()
    expect(sessionStorage.getItem('unrelated')).toBe('keep')
  })
  it('discards persisted role state in normal mode and permits test fixture identity only in tests', () => {
    localStorage.setItem('resqph.auth.user', JSON.stringify({name:'Old',email:'old@example.test',role:'citizen'}))
    expect(readSession()).toBeNull()
    writeSession({name:'R',email:'r@example.test',role:'rescuer'})
    expect(readSession()).toBeNull()
  })
  it('uses the authenticated account id for actor scope and clears only session storage', () => {
    localStorage.setItem('unrelated', 'keep')
    writeSession({id:'account-42',name:'R',email:'r@example.test',role:'rescuer',teamId:'team-bravo'})
    expect(actorId(readSession()!)).toBe('account-42')
    writeSession(null)
    expect(readSession()).toBeNull()
    expect(localStorage.getItem('unrelated')).toBe('keep')
  })
  it.each(['bad','a@','a@b','a b@example.test'])('rejects malformed email %s', email => expect(validEmail(email)).toBe(false))
  it.each(['abc','09','091234567890','+639123'])('rejects malformed phone %s', phone => expect(validPhone(phone)).toBe(false))
  it('accepts trimmed synthetic identities and Philippine mobiles without claiming real authentication', () => {
    expect(validEmail(' ranee@example.test ')).toBe(true)
    expect(validPhone('0912 345 6789')).toBe(true)
    expect(validPhone('+639123456789')).toBe(true)
    expect(validPassword('      ')).toBe(false)
  })
})
