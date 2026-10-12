// Project root must be the repository root: maps import ../data/samples.
// Production promotion is manual after main CI and staging acceptance, not Git auto-deploy.
const apiOrigin = process.env.RENDER_API_ORIGIN
const environment = process.env.RESQPH_DEPLOY_ENVIRONMENT
if (!['staging', 'production'].includes(environment)) {
  throw new Error('Set RESQPH_DEPLOY_ENVIRONMENT explicitly for this deployment')
}
if (!apiOrigin || !/^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(apiOrigin)) {
  throw new Error('Set RENDER_API_ORIGIN to the exact approved HTTPS Render origin')
}
if (environment === 'production' && process.env.VERCEL_ENV !== 'production') {
  throw new Error('Preview deployments cannot use production configuration')
}
if (process.env.VITE_API_URL !== '/api/v1') {
  throw new Error('Hosted VITE_API_URL must be /api/v1 for host-only session/CSRF cookies')
}

export const config = {
  framework: null,
  installCommand: 'npm ci --prefix frontend',
  buildCommand: 'npm run build --prefix frontend',
  outputDirectory: 'frontend/dist',
  git: { deploymentEnabled: false },
  rewrites: [
    { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },
    { source: '/((?!api(?:/|$)|assets/|offline-shell\\.js$).*)', destination: '/index.html' },
  ],
  headers: [
    { source: '/api/:path*', headers: [
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'CDN-Cache-Control', value: 'no-store' },
      { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
    ] },
    { source: '/offline-shell.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    { source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ] },
  ],
}
