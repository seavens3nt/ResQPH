import { extractApiError } from '../../api/rescueRequests'
import { isAxiosError } from 'axios'

export function errorMessage(error: unknown) {
  if (isAxiosError(error) && !error.response) {
    return 'Could not reach the service. Check your connection and retry. Browser online does not mean the API is available.'
  }
  return extractApiError(error).error.message
}
