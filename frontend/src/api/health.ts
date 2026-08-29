import { apiClient } from './client'

export interface HealthResponse {
  service: string
  status: 'ok'
  version: string
}

export async function getApiHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/health')
  return response.data
}
