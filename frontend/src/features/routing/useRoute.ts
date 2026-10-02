import { useMutation } from '@tanstack/react-query'
import { evaluateRoute, RouteApiError } from './routeApi'
import type { RouteRequest, RouteResult, RouteState } from './types'

export function useRoute() {
  const mutation = useMutation<RouteResult, Error, RouteRequest>({
    mutationFn: evaluateRoute,
  })

  let routeState: RouteState = { status: 'idle' }

  if (mutation.isPending) {
    routeState = { status: 'loading' }
  } else if (mutation.isError) {
    const error = mutation.error
    routeState = error instanceof RouteApiError
      ? {
          status: 'error',
          kind: error.kind,
          message: error.message,
          retryable: error.retryable,
        }
      : {
          status: 'error',
          kind: 'api',
          message: 'The route request failed. No route was drawn.',
          retryable: false,
        }
  } else if (mutation.data?.status === 'route-found') {
    routeState = { status: 'route-found', result: mutation.data }
  } else if (mutation.data?.status === 'no-route') {
    routeState = { status: 'no-route', result: mutation.data }
  }

  return {
    ...mutation,
    routeState,
    requestRoute: mutation.mutate,
    requestRouteAsync: mutation.mutateAsync,
  }
}
