# Local bundled brand assets

The PNG favicons (16, 32, 48 pixels) are size exports from one white/red edit of
ResQPH's existing `public/logo.png` rescue emblem. Imagegen made the color variant;
macOS sips exported the three sizes. Alpha transparency and transparent corners
were checked; actual browser tab appearance remains pending. No maskable icon
or service-worker behavior is changed. Favicon caches may require a fresh tab
or clearing the site's cached favicon.

The user's supplied white ResQ / blue P / red H wordmark is the authoritative
full-logo reference. On 2026-10-12 the user explicitly selected the 2170 × 725
transparent PNG shown in their latest message. `resqph-wordmark.png` is an unchanged
copy of that selected local image; no further generation or cleanup was performed.
`BrandLogo.tsx` uses it for full placements and keeps the approved compact emblem.

2026-10-12 landing alignment supersedes static full placements: `landing-wordmark.webp`
is extracted byte-for-byte from the active LandingPage embedded image. Shared SVG
uses the original landing viewBox/clipping and adapts only ResQ to theme. The older
selected PNG is retained. `sidebar-emblem.png` is an unchanged copy of favicon-48
for independent sidebar theme treatment; approved favicon files/references unchanged.
