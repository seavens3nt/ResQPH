# Automatic deployment checkpoint — 2026-10-13

The user authorized automatic deployments, retaining the free-only budget and
the recent UI/routing. This is a partial configuration checkpoint, not production
acceptance or a completed end-to-end deployment.

## Verified

- GitHub main is `765f46260499d460b565b50e1663c23289b77b33`; its CI and staging
  eligibility workflows succeeded.
- The existing Render staging service was configured for **After CI Checks Pass**
  on `main`. The staging Blueprint now records `checksPass` too.
- Google Weather daily limits: current conditions 100, daily forecast 100,
  hourly forecast 100. Unused daily endpoints remain disabled. These limits do
  not guarantee a zero bill across other services/projects on the billing account.
- That exact backend commit was rebuilt successfully to load saved environment
  settings. Render showed the new deployment Live. **After CI Checks Pass** was
  restored and verified after the manual specific-commit deployment.
- The signed-in staging dashboard rendered real current conditions and all six
  hourly forecast columns after the rebuild, at approximately 06:33 PHT.

## Not yet complete

- The owner approved the specific Vercel connection, and `resqph-staging` is now
  connected to `seavens3nt/ResQPH`. No other repository was connected.
- Seven GitHub checks are saved in Vercel for blocking domain promotion:
  frontend, backend, ml-evidence, routing, mongodb-transactions,
  production-browser and release-gate. Vercel confirmed they take effect on
  the next production-target deployment of this staging project.
- The configuration change enables Git builds only for staging `main` and
  continues to disable separate production Git releases. It needs normal PR
  review/merge, successful main CI and a verified automatic deployment before
  frontend automation is called complete.
- No GitHub deployment secrets are configured. Do not retrieve login tokens or
  print credentials; any needed secret must be entered directly by the user.
- Production resources, a separate production database credential, hosted
  acceptance and backup/restore verification are still outstanding.
- Preserve the existing uncommitted `.gitignore` and narrow-map CSS changes.
  They are not part of this checkpoint's deployment.

The database stays persistent; deployments must not seed, erase, or copy real
records automatically. ML remains disabled, and the service remains an academic
prototype rather than an operational emergency service.
