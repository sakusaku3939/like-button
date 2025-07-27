import { getApp } from 'firebase/app'
import { getRemoteConfig, fetchAndActivate, getBoolean } from 'firebase/remote-config'

let remoteConfig = null
let configPromise = null

export function useRemoteConfig() {
    const initRemoteConfig = () => {
        if (!remoteConfig) {
            const app = getApp()
            remoteConfig = getRemoteConfig(app)

            remoteConfig.defaultConfig = {
                streaming: false
            }

            remoteConfig.settings.minimumFetchIntervalMillis = 10000
        }
        return remoteConfig
    }

    const fetchConfig = async () => {
        if (configPromise) {
            return configPromise
        }

        configPromise = (async () => {
            try {
                const config = initRemoteConfig()
                await fetchAndActivate(config)
                console.log('Remote Config loaded')
                return true
            } catch (err) {
                console.error('Remote Config error:', err)
                configPromise = null
                throw err
            }
        })()

        return configPromise
    }

    const getStreaming = async () => {
        try {
            await fetchConfig()
            const config = initRemoteConfig()
            return getBoolean(config, 'streaming')
        } catch (err) {
            console.warn('Failed to get streaming:', err)
            return false
        }
    }

    return {
        fetchConfig,
        getStreaming,
    }
}