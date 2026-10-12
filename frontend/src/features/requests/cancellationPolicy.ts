export const citizenCanCancel = (request: {status:string;can_cancel?:boolean} | null | undefined) =>
  Boolean(request && (request.can_cancel ?? ['pending','assigned'].includes(request.status)))
