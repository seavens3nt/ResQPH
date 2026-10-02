import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '../../../../components/ui/Button'
import { useAuth } from '../../../../features/auth/AuthContext'
import { useMissions } from '../../../../features/missions/MissionContext'
import type { RescueTeam } from '../../../../features/missions/types'
import { Section } from '../shared'
import './CreateRescueTeamTab.css'

type TeamUnitType = RescueTeam['unitType']

export function CreateRescueTeamTab() {
  const { rescuers } = useAuth()
  const { teams, createRescueTeam, updateRescueTeam, deleteRescueTeam } = useMissions()
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [unitType, setUnitType] = useState<TeamUnitType>('Rubber Boat')
  const [memberEmails, setMemberEmails] = useState<string[]>([])
  const [leaderEmail, setLeaderEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedRescuers = useMemo(
    () => rescuers.filter((rescuer) => memberEmails.includes(rescuer.email)),
    [rescuers, memberEmails],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSuccess('')
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Enter a team name.')
      return
    }
    if (teams.some((team) => team.id !== editingTeamId && team.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      setError('A team with this name already exists.')
      return
    }
    if (selectedRescuers.length === 0) {
      setError('Select at least one rescuer who has logged in.')
      return
    }
    const leader = selectedRescuers.find((rescuer) => rescuer.email === leaderEmail)
    if (!leader) {
      setError('Choose a team leader from the selected members.')
      return
    }

    const teamData: Omit<RescueTeam, 'id'> = {
      name: trimmedName,
      unitType,
      membersCount: selectedRescuers.length,
      members: selectedRescuers.map((rescuer) => rescuer.name),
      leadRescuer: leader.name,
      hasMedicalUnit: false,
      specializations: ['general'],
      equipment: [],
      status: 'available',
      contactPhone: leader.phone || 'Not provided',
    }
    if (editingTeamId) {
      const currentTeam = teams.find((team) => team.id === editingTeamId)
      updateRescueTeam(editingTeamId, { ...teamData, status: currentTeam?.status ?? 'available' })
      setSuccess(`${trimmedName} updated.`)
    } else {
      createRescueTeam(teamData)
      setSuccess(`${trimmedName} created.`)
    }
    setEditingTeamId(null)
    setName('')
    setMemberEmails([])
    setLeaderEmail('')
    setError('')
  }

  function toggleMember(email: string) {
    const removing = memberEmails.includes(email)
    setMemberEmails((current) => removing ? current.filter((item) => item !== email) : [...current, email])
    if (removing && leaderEmail === email) setLeaderEmail('')
  }

  function editTeam(team: RescueTeam) {
    setEditingTeamId(team.id)
    setName(team.name)
    setUnitType(team.unitType)
    setMemberEmails(rescuers.filter((rescuer) => team.members?.includes(rescuer.name)).map((rescuer) => rescuer.email))
    setLeaderEmail(rescuers.find((rescuer) => rescuer.name === team.leadRescuer)?.email ?? '')
    setError('')
    setSuccess('')
  }

  return (
    <Section
      title="Create Rescue Team"
      subtitle="Create teams and manage their rescuer roster using profiles that have logged in to this prototype."
    >
      <form className="create-team-form" onSubmit={handleSubmit}>
        <label className="create-team-field">
          <span>Team name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Team Delta" />
        </label>

        <label className="create-team-field">
          <span>Rescue unit type</span>
          <select value={unitType} onChange={(event) => setUnitType(event.target.value as TeamUnitType)}>
            <option value="Rubber Boat">Boat</option>
            <option value="High-Clearance Truck">Rescue Truck</option>
            <option value="Amphibious Unit">Amphibious Vehicle</option>
          </select>
        </label>

        <fieldset className="create-team-roster">
          <legend>Rescuer members</legend>
          {rescuers.length ? rescuers.map((rescuer) => (
            <label className="create-team-member" key={rescuer.email}>
              <input
                type="checkbox"
                checked={memberEmails.includes(rescuer.email)}
                onChange={() => toggleMember(rescuer.email)}
              />
              <span><strong>{rescuer.name}</strong><small>{rescuer.email}</small></span>
            </label>
          )) : (
            <p className="create-team-empty">No rescuer profiles have logged in on this browser yet. Rescuers appear here after they sign in using the Rescuer role.</p>
          )}
        </fieldset>

        <label className="create-team-field">
          <span>Team leader</span>
          <select value={leaderEmail} onChange={(event) => setLeaderEmail(event.target.value)} disabled={!selectedRescuers.length}>
            <option value="">Select a selected team member</option>
            {selectedRescuers.map((rescuer) => <option key={rescuer.email} value={rescuer.email}>{rescuer.name}</option>)}
          </select>
        </label>

        {error && <p className="create-team-message create-team-message--error" role="alert">{error}</p>}
        {success && <p className="create-team-message create-team-message--success" role="status">{success}</p>}

        <div className="create-team-actions">
          <span>{selectedRescuers.length} member{selectedRescuers.length === 1 ? '' : 's'} selected</span>
          <Button type="submit" variant="primary" disabled={!rescuers.length}>{editingTeamId ? 'Save Team Changes' : 'Create Rescue Team'}</Button>
        </div>
      </form>
      <div className="managed-teams" aria-label="Created rescue teams">
        <h3>Created Teams</h3>
        {teams.map((team) => (
          <article className="managed-team" key={team.id}>
            <div className="managed-team__info">
              <strong>{team.name}</strong>
              <span>{team.unitType} · {team.status}</span>
              <ul className="managed-team__members" aria-label={`${team.name} members`}>
                {(team.members?.length ? team.members : Array.from({ length: team.membersCount }, (_, index) => `Member ${index + 1} (placeholder)`)).map((member) => (
                  <li key={member}>{member}</li>
                ))}
              </ul>
            </div>
            <div className="managed-team__actions">
              <Button type="button" size="sm" variant="outline" onClick={() => editTeam(team)}>Edit members</Button>
              <Button type="button" size="sm" variant="danger" disabled={team.status !== 'available'} title={team.status !== 'available' ? 'Only available teams can be deleted.' : undefined} onClick={() => { deleteRescueTeam(team.id); if (editingTeamId === team.id) { setEditingTeamId(null); setName(''); setMemberEmails([]); setLeaderEmail('') } }}>Delete team</Button>
            </div>
          </article>
        ))}
      </div>
    </Section>
  )
}
