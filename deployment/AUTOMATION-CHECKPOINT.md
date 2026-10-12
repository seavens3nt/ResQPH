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

- PR #94 merged as `a08f6ef` after all seven PR checks passed, using the owner's
  one-time missing-review override. Branch review requirements were not changed.
  Its Git-triggered Vercel build then failed: `rewrites[0]` lacked `destination`
  in the statically extracted configuration. The existing live staging build
  was not replaced. The follow-up defers the entire environment-dependent
  `rewrites` assignment to build-time, keeping the exported Git settings static.
  Regression tests enforce a fully literal exported configuration as well
  as runtime checks for distinct staging/production destinations. Hosted success
  and normal review/merge of this follow-up are still required.

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
- Follow-up: Vercel rejected dynamic `git.deploymentEnabled`. Git branch rules
  are now static, with an ignored-build command allowing only staging/main at
  the production target; production/unknown environments skip automatic builds.
  The owner explicitly authorized bypassing the missing PR review, not failed CI
  or production acceptance. Re-run CI on the corrected head before any override.
- No GitHub deployment secrets are configured. Do not retrieve login tokens or
  print credentials; any needed secret must be entered directly by the user.
- Production resources, a separate production database credential, hosted
  acceptance and backup/restore verification are still outstanding.
- Preserve the existing uncommitted `.gitignore` and narrow-map CSS changes.
  They are not part of this checkpoint's deployment.

The database stays persistent; deployments must not seed, erase, or copy real
records automatically. ML remains disabled, and the service remains an academic
prototype rather than an operational emergency service.
