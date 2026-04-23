import posthog from 'posthog-js'

const apiKey = import.meta.env.VITE_POSTHOG_KEY
const apiHost = import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com'

let initialized = false

export function initAnalytics(): void {
  if (initialized || !apiKey) return
  posthog.init(apiKey, {
    api_host: apiHost,
    capture_pageview: true,
    persistence: 'localStorage',
  })
  initialized = true
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!initialized) return
  posthog.identify(userId, traits)
}

export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (!initialized) return
  posthog.capture(name, props)
}

export function resetAnalytics(): void {
  if (!initialized) return
  posthog.reset()
}
