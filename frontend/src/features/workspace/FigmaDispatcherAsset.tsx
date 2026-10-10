import type { CSSProperties } from 'react'

const assets = {
  home: ['75c6e.svg', 26.0002, 26.704], requests: ['664c8.svg', 21.5, 27.0901],
  missions: ['533c3.svg', 32, 26], teams: ['8986b.svg', 25, 27],
  map: ['dcf72.svg', 23, 23], account: ['a08ea.svg', 22.8333, 26.125],
  help: ['dda2d.svg', 24, 27.792], star: ['05ba5.svg', 43.4286, 43.4286],
  info: ['53f0f.svg', 34.2985, 33.8125], responder: ['6ddae.svg', 32, 36],
  sun: ['05ed4.svg', 30.8333, 30.8333], moon: ['574ee.svg', 61.5, 32],
} as const

/** Preserve exported SVG geometry; only scale its surrounding layout slot. */
export function FigmaDispatcherAsset({name}: {name: keyof typeof assets}) {
  const [file, width, height] = assets[name]
  return <span className={`dispatcher-asset dispatcher-asset--${name}`} aria-hidden="true"
    style={{'--asset-width': width, '--asset-height': height} as CSSProperties}>
    <img src={`/figma-dispatcher/${file}`} alt=""/>
  </span>
}
