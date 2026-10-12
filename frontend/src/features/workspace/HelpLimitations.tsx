import { Link } from 'react-router-dom'
import { WorkspaceCard, WorkspaceSectionHeading } from './WorkspaceUI'

export function HelpLimitations() {
  return <div className="workspace-stack citizen-information-page">
    <WorkspaceSectionHeading icon="shield">Help &amp; Limitations</WorkspaceSectionHeading>
    <WorkspaceCard><h3>Request help at a pinned location</h3>
      <p>Choose Request rescue, then click the map or drag a pin. Browser location is optional. Add the number of people; an address or nearby landmark is optional and does not move the pin.</p>
      <p>Confirm the location so the request refers to the point you reviewed. Moving the pin or replacing it with GPS requires confirmation again. Review your details, then submit.</p>
      <h3>Assignment and progress</h3>
      <p>The app automatically considers available stations and admissible routes through the stored road graph. Assignment reserves a station; simulated travel begins when the station accepts the mission. My Requests shows the station response and server-confirmed progress.</p>
      <p>If your request remains pending, refresh its status and check your connection. An eligible station or route may not be available. The app cannot guarantee a response time. Avoid duplicate submissions.</p>
      <h3>Cancellation</h3>
      <p>You can cancel while a request is pending. Assigned and later requests cannot be cancelled through the citizen interface. A cancellation takes effect only after the server confirms it; refresh if the request changed before your action.</p>
    </WorkspaceCard>
    <WorkspaceCard><h3>Coverage, routes and movement</h3>
      <p>Coverage is the project-defined U-Belt pilot polygon in the City of Manila, shown on the map. It is not all of Sampaloc or an official service boundary.</p>
      <p>Road and flood conditions are controlled prototype inputs. The visibility toggle only hides their display; route constraints still apply. Routes do not establish that a road is safe.</p>
      <p>The response vehicle moves in a backend simulation along the stored route. Its heading and estimated travel time are derived simulated guidance, not device GPS, live traffic or a guaranteed arrival time.</p>
      <h3>Internet and offline use</h3>
      <p>Submitting requests and refreshing shared progress require internet access. Limited rescuer offline support stores one authorized mission and one next-valid status update for later synchronization. A queued action is pending until accepted by the server. Google map tiles are not cached; stale tracking positions freeze.</p>
    </WorkspaceCard>
    <WorkspaceCard><h3>Weather and suggestions</h3>
      <p>Home and Advisory use Google Weather for a fixed study-area location. Check the provider timestamp: cached conditions may be outdated. Hourly intervals and daily high/low values are forecasts. Missing measurements are not replaced with demonstration values.</p>
      <p>Advisory offers practical suggestions from available conditions, not official alerts, flood-depth estimates, evacuation orders or rescue urgency. Weather is separate from controlled flood routing.</p>
      <h3>Account access</h3>
      <p>Citizens can <Link to="/signup">create an account</Link>. Station rescuer accounts are provisioned by the project administrator, and the backend verifies station membership during login.</p>
      <p>ResQPH is an academic prototype with simulated rescue coordination. It is not affiliated with an official emergency service and is not a certified dispatch or navigation system.</p>
    </WorkspaceCard>
  </div>
}
