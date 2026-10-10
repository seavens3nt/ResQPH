import { useId, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { validPhone } from '../auth/validation'
import { WorkspaceCard } from './WorkspaceUI'
import { useNavigate } from 'react-router-dom'
import './accountWorkspace.css'

const splitName = (name:string) => { const [first='',...last]=name.trim().split(/\s+/); return [first,last.join(' ')] }
export function AccountWorkspace() {
  const {user,updateProfile,logout}=useAuth()
  const navigate=useNavigate(), photoId=useId()
  const [firstName,setFirstName]=useState(()=>splitName(user?.name??'')[0])
  const [lastName,setLastName]=useState(()=>splitName(user?.name??'')[1])
  const [phone,setPhone]=useState(user?.phone??'')
  const [contactFirst,setContactFirst]=useState(()=>splitName(user?.emergencyContact?.name??'')[0])
  const [contactLast,setContactLast]=useState(()=>splitName(user?.emergencyContact?.name??'')[1])
  const [contactPhone,setContactPhone]=useState(user?.emergencyContact?.phone??'')
  const [relationship,setRelationship]=useState(user?.emergencyContact?.relationship??'')
  const [address,setAddress]=useState(user?.emergencyContact?.address??'')
  const [conditions,setConditions]=useState(user?.medicalInfo?.conditions??'')
  const [allergies,setAllergies]=useState(user?.medicalInfo?.allergies??'')
  const [assistance,setAssistance]=useState(user?.medicalInfo?.specialAssistance??'')
  const [avatar,setAvatar]=useState(user?.avatarUrl)
  const [message,setMessage]=useState(''),[invalid,setInvalid]=useState(false)
  return <section className="account-page" aria-labelledby="account-page-title">
    <h2 id="account-page-title"><span className="account-heading-icon" aria-hidden="true"><img src="/figma-account/profile.svg" alt=""/></span>Profile &amp; Account</h2>
    <WorkspaceCard className="account-profile"><form className="workspace-form account-form" onSubmit={e=>{
      e.preventDefault()
      const name=[firstName.trim(),lastName.trim()].filter(Boolean).join(' ')
      if(!name||name.length>100||(phone.trim()&&!validPhone(phone))||(contactPhone.trim()&&!validPhone(contactPhone))){setMessage('Enter a name and valid Philippine mobile numbers, or leave phone fields blank.');setInvalid(true);return}
      const contactName=[contactFirst.trim(),contactLast.trim()].filter(Boolean).join(' ')
      if(contactName.length>100){setMessage('Emergency contact name must be 100 characters or fewer.');setInvalid(true);return}
      updateProfile({name,email:user!.email,phone:phone.trim()||undefined,avatarUrl:avatar,emergencyContact:{name:contactName,phone:contactPhone.trim(),relationship:relationship.trim(),address:address.trim()},medicalInfo:{conditions:conditions.trim(),allergies:allergies.trim(),specialAssistance:assistance.trim()}})
      setMessage('Profile saved in this tab.');setInvalid(false)
    }}>
      <fieldset className="account-personal"><legend>Personal details</legend><div className="account-personal-layout">
        <div className="account-avatar">{avatar?<img className="account-uploaded-avatar" src={avatar} alt="Profile preview"/>:<span className="account-avatar-art"><img src="/figma-account/avatar.svg" alt="Default profile avatar"/></span>}</div>
        <div className="account-personal-inputs">
          <label><span className="account-sr-only">First name</span><input placeholder="First name" maxLength={100} value={firstName} onChange={e=>setFirstName(e.target.value)}/></label>
          <label><span className="account-sr-only">Last name</span><input placeholder="Last name" maxLength={100} value={lastName} onChange={e=>setLastName(e.target.value)}/></label>
          <label className="account-email"><span className="account-sr-only">Email identity</span><input placeholder="Email" value={user?.email} readOnly title="Email identity cannot be changed here"/></label>
          <label className="account-photo" htmlFor={photoId}>Profile photo<span className="account-photo-icon" aria-hidden="true"><img src="/figma-account/photo-add.svg" alt=""/></span><input id={photoId} className="account-sr-only" aria-label="Profile photo (PNG/JPEG/WebP, up to 2 MB)" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{
            const file=e.target.files?.[0];if(!file)return
            if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){setMessage('Choose a supported image smaller than 2 MB.');setInvalid(true);return}
            const reader=new FileReader();reader.onload=()=>setAvatar(String(reader.result));reader.readAsDataURL(file)
          }}/></label>
          <label><span className="account-sr-only">Phone</span><input placeholder="Phone" type="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
        </div>
      </div></fieldset>
      <fieldset className="account-medical"><legend>Medical &amp; assistance information</legend>
        <label>Medical conditions<textarea rows={1} placeholder="Example: Asthma, Hypertension, etc." maxLength={500} value={conditions} onChange={e=>setConditions(e.target.value)}/></label>
        <label>Allergies<textarea rows={1} placeholder="Example: • Peanuts, Shellfish, etc." maxLength={500} value={allergies} onChange={e=>setAllergies(e.target.value)}/></label>
        <label>Special Assistance<textarea rows={1} placeholder="Example: Asthma, Hypertension, etc." maxLength={500} value={assistance} onChange={e=>setAssistance(e.target.value)}/></label>
      </fieldset>
      <fieldset className="account-emergency"><legend>Emergency contact</legend>
        <div className="account-contact-name"><label>Emergency contact name<input placeholder="First name" maxLength={100} value={contactFirst} onChange={e=>setContactFirst(e.target.value)}/></label><label><span className="account-sr-only">Emergency contact last name</span><input placeholder="Last name" maxLength={100} value={contactLast} onChange={e=>setContactLast(e.target.value)}/></label></div>
        <label>Relationship<input placeholder="Example: Mother, Father, etc." maxLength={100} value={relationship} onChange={e=>setRelationship(e.target.value)}/></label>
        <label>Address<input placeholder="Street Address, City" maxLength={250} value={address} onChange={e=>setAddress(e.target.value)}/></label>
        <label>Contact number<input aria-label="Emergency contact phone" placeholder="+(63) 9XX XXX XXXX" type="tel" value={contactPhone} onChange={e=>setContactPhone(e.target.value)}/></label>
      </fieldset>
      <div className="workspace-actions account-actions"><button type="button" onClick={()=>{logout();navigate('/login',{replace:true})}}>Sign out</button><button type="submit" className="workspace-primary">Save profile</button></div>
      {message&&<p className="account-feedback" role={invalid?'alert':'status'}>{message}</p>}
    </form></WorkspaceCard>
    <p className="account-prototype-note">Tab-scoped prototype profile. Identity and rescue team cannot be changed here; sign out to enter a separate workspace. Use synthetic profile and medical details for this academic prototype.</p>
  </section>
}
