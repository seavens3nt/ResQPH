import type { CSSProperties } from 'react'

// Native export sizes stay intact. Scale the image inside its layout slot,
// rather than rewriting the supplied SVG's root width/height or paths.
const assets = {
  home: ['75c6e.svg', 26.0002, 26.704], requests: ['664c8.svg', 21.5, 27.0901],
  map: ['dcf72.svg', 23, 23], account: ['a08ea.svg', 22.8333, 26.125],
  help: ['dda2d.svg', 24, 27.792], star: ['50c36.svg', 48, 48],
  add: ['312e9.svg', 82.4615, 78], chevron: ['06203.svg', 32, 32],
  pin: ['627cc.svg', 20, 24.8778], people: ['d76d1.svg', 26.75, 21.125],
  rain: ['0308c.svg', 43, 43], warning: ['ced12.svg', 32, 32],
  sun: ['05ed4.svg', 30.8333, 30.8333], moon: ['574ee.svg', 61.5, 32],
  requestsTitle: ['../figma-requests/bbd9b.svg', 42, 42],
  mapTitle: ['../figma-map/map-title.svg', 48, 48],
} as const
const requestsNavigation = {
  home:['f2588.svg',25.5001,26.204], requests:['1de17.svg',21,26.59],
  map:['09d4d.svg',22.5,22.5], account:['61120.svg',22.3333,25.625],
  help:['e4dfc.svg',24,27.792],
} as const

export function FigmaHomeAsset({name,variant='home'}: {name:keyof typeof assets;variant?:'home'|'requests'|'map'}) {
  const requestAsset = variant === 'map' && name === 'map' ? ['../figma-map/nav-map.svg',22.5,22.5] as const
    : variant === 'map' && name === 'requests' ? ['../figma-map/nav-requests.svg',21,26.59] as const
    : variant !== 'home' && name in requestsNavigation
    ? requestsNavigation[name as keyof typeof requestsNavigation] : undefined
  const [file,width,height] = requestAsset ?? assets[name]
  const path = requestAsset ? `/figma-requests/${file}` : `/figma-home/${file}`
  return <span className={`figma-home-asset figma-home-asset--${name}`} aria-hidden="true"
    style={{'--asset-width':width,'--asset-height':height} as CSSProperties}>
    <img src={path} alt=""/>
  </span>
}
