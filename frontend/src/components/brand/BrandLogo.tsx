/** Single source for existing brand placements; compact navigation uses the emblem. */
import { useId } from 'react'
import { useTheme } from '../../features/theme/useTheme'
export const BRAND_WORDMARK_SRC = '/brand/landing-wordmark.webp'
export function BrandLogo({className = '', compact = false, theme}: {className?:string; compact?:boolean; theme?:'dark'|'light'}) {
  const id = useId().replace(/:/g, '')
  const [selectedDark] = useTheme()
  const dark = theme ? theme === 'dark' : selectedDark
  return <svg role="img" aria-label="ResQPH" className={className} viewBox={compact ? '0 0 48 48' : '55 65 920 215'} data-theme={dark ? 'dark' : 'light'}>
    <defs>
      <filter id={`${id}-ink`} colorInterpolationFilters="sRGB">
        {compact ? <>
          {/* Separate the white emblem from the original red accent; keep source alpha. */}
          <feColorMatrix in="SourceGraphic" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 1 0 0 0"/>
          <feComponentTransfer result="whiteMask"><feFuncA type="discrete" tableValues="0 0 0 1"/></feComponentTransfer>
          <feComposite in="SourceGraphic" in2="whiteMask" operator="out" result="accents"/>
          <feFlood floodColor="#1f2633"/>
          <feComposite in2="SourceAlpha" operator="in"/>
          <feComposite in2="whiteMask" operator="in" result="emblem"/>
          <feMerge><feMergeNode in="accents"/><feMergeNode in="emblem"/></feMerge>
        </> : <feColorMatrix type="matrix" values=".12 0 0 0 0 0 .15 0 0 0 0 0 .2 0 0 0 0 0 1 0"/>}
      </filter>
      <clipPath id={`${id}-resq`}><rect width="650" height="342"/></clipPath>
      <clipPath id={`${id}-ph`}><rect x="650" width="374" height="342"/></clipPath>
    </defs>
    {compact ? <image href="/brand/sidebar-emblem.png" width="48" height="48" filter={dark ? undefined : `url(#${id}-ink)`}/> : <>
      <image href={BRAND_WORDMARK_SRC} width="1024" height="342" clipPath={`url(#${id}-resq)`} filter={dark ? undefined : `url(#${id}-ink)`}/>
      <image href={BRAND_WORDMARK_SRC} width="1024" height="342" clipPath={`url(#${id}-ph)`}/>
    </>}
  </svg>
}
