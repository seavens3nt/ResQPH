/** Single source for existing brand placements; compact navigation uses the emblem. */
export const BRAND_WORDMARK_SRC = '/brand/resqph-wordmark.png'
export function BrandLogo({className = '', compact = false}: {className?:string; compact?:boolean}) {
  return <img src={compact ? '/brand/favicon-48.png' : BRAND_WORDMARK_SRC} alt="ResQPH" className={className}/>
}
