import { cleanup,fireEvent,render,screen } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AccountWorkspace } from './AccountWorkspace'
const {updateProfile,logout}=vi.hoisted(()=>({updateProfile:vi.fn(),logout:vi.fn()}))
vi.mock('../auth/AuthContext',()=>({useAuth:()=>({user:{name:'Synthetic Citizen',email:'synthetic@example.test',role:'citizen'},updateProfile,logout})}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
const preview=()=>render(<MemoryRouter><AccountWorkspace/></MemoryRouter>)
it('keeps identity read-only and saves split names and address in the existing profile',()=>{
  preview()
  expect(screen.getByLabelText('Email identity')).toHaveAttribute('readonly')
  fireEvent.change(screen.getByLabelText('First name'),{target:{value:'Test'}})
  fireEvent.change(screen.getByLabelText('Last name'),{target:{value:'Citizen'}})
  fireEvent.change(screen.getByLabelText('Emergency contact name'),{target:{value:'Demo'}})
  fireEvent.change(screen.getByLabelText('Emergency contact last name'),{target:{value:'Contact'}})
  fireEvent.change(screen.getByLabelText('Address'),{target:{value:'Synthetic address'}})
  fireEvent.click(screen.getByRole('button',{name:'Save profile'}))
  expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({name:'Test Citizen',email:'synthetic@example.test',emergencyContact:expect.objectContaining({name:'Demo Contact',address:'Synthetic address'})}))
  expect(screen.getByRole('status')).toHaveTextContent('Profile saved in this tab.')
})
it('retains phone validation and rejects unsupported photo files',()=>{
  preview()
  fireEvent.change(screen.getByLabelText('Phone',{exact:true}),{target:{value:'abc'}})
  fireEvent.click(screen.getByRole('button',{name:'Save profile'}))
  expect(updateProfile).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent('valid Philippine mobile numbers')
  fireEvent.change(screen.getByLabelText('Profile photo (PNG/JPEG/WebP, up to 2 MB)'),{target:{files:[new File(['x'],'test.txt',{type:'text/plain'})]}})
  expect(screen.getByRole('alert')).toHaveTextContent('supported image smaller than 2 MB')
})
it('keeps sign-out separate from profile submission',()=>{
  preview();fireEvent.click(screen.getByRole('button',{name:'Sign out'}))
  expect(logout).toHaveBeenCalledOnce();expect(updateProfile).not.toHaveBeenCalled()
})
