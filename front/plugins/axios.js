import axios from 'axios'
import { get } from 'lodash-es'

axios.interceptors.request.use(
  (config) => {
    const appStore = useAppStore()

    const controller = new AbortController()

    if (!appStore.hasAuthToken) {
      const router = useRouter()
      UIUtils.showToastError('No personal access token...')
      controller.abort()
    }

    config.timeout = appStore.queryTimeout
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

const MAX_RETRIES = 2

const retryRequest = async (error) => {
  let errorMessage = get(error, 'response.data.message') ?? get(error, 'message') ?? ''

  const isTimeout = error.code === 'ECONNABORTED' || errorMessage.includes('timeout') || errorMessage.includes('Failed to connect to')
  if (!isTimeout) {
    return
  }

  const config = error.config
  if (!config?.retry) {
    config.retry = 0
  }

  // Check if we should retry (timeout or network error)
  // console.log('isTimeout', { isTimeout, error })

  if (config.retry >= MAX_RETRIES) {
    return
  }

  config.retry += 1
  const delay = 1000 * Math.pow(2, config.retry - 1)
  // console.log(`Retrying request (${config.retry}/${MAX_RETRIES}) after ${delay}ms`)

  // Wait before retrying
  await sleep(delay)

  // Return the new axios request
  return axios(config)
}

// femto: the reverse proxy answers 401 when the login session is gone, and a reload lets it
// redirect to its login page. Firefly also answers 401 for a rejected token, so reload at most
// once per interval to avoid a loop.
const RELOAD_ON_401_KEY = 'reloadOn401At'
const RELOAD_ON_401_INTERVAL_MS = 30 * 1000
let isReloading = false

// Returns true if the page is reloading.
const reloadOn401 = () => {
  if (isReloading) {
    return true
  }
  try {
    const lastReloadAt = Number(window.sessionStorage.getItem(RELOAD_ON_401_KEY))
    if (Date.now() - lastReloadAt < RELOAD_ON_401_INTERVAL_MS) {
      return false
    }
    window.sessionStorage.setItem(RELOAD_ON_401_KEY, String(Date.now()))
  } catch {
    return false
  }
  isReloading = true
  window.location.reload()
  return true
}

axios.interceptors.response.use(
  function (response) {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Do something with response data
    return response
  },
  async function (error) {
    if (error.response?.status === 401 && reloadOn401()) {
      // Never settles, so callers don't handle an error while the page unloads
      return new Promise(() => {})
    }

    let errorMessage = get(error, 'response.data.message') ?? get(error, 'message')

    if (errorMessage) {
      UIUtils.showToastError(`Error: ${errorMessage}`, 4000)
    }

    await retryRequest(error)

    return Promise.resolve(error.response)
  },
)

export default defineNuxtPlugin((nuxtApp) => {})
