/** Short display alias based on the unfiltered server list; never an API ID. */
export function requestLabel(id:string,index:number) {
  return id.startsWith('RQ-') ? id : `RQ-${String(index+1).padStart(3,'0')}`
}
