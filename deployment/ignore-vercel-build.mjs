// Vercel ignored-build convention: 0 skips, 1 builds. No credentials are read.
// Only the existing staging project's main production-target build is automatic.
const allowed = process.env.RESQPH_DEPLOY_ENVIRONMENT === 'staging'
  && process.env.VERCEL_GIT_COMMIT_REF === 'main'
  && process.env.VERCEL_ENV === 'production'
console.log(allowed ? 'Build staging main' : 'Skip automatic non-staging/non-main build')
process.exit(allowed ? 1 : 0)
