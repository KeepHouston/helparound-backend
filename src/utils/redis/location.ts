import { redisClient } from '.'

export type Location = {
    latitude: number
    longtitude: number
}

export class UserLocation {
    storageKey = `user:${this.userId}`

    constructor(private userId: string) {}

    async set(location: Location | null) {
        if (!location) {
            return
        }
        const redis = await redisClient()

        return redis.set(this.storageKey, JSON.stringify(location))
    }

    async get(): Promise<Location | null> {
        const redis = await redisClient()

        const stringLocation = await redis.get(this.storageKey)

        if (!stringLocation) {
            return null
        }

        return JSON.parse(stringLocation) as Location
    }

    async update(updater: (data: Location | null) => Location | null) {
        return this.set(updater(await this.get()))
    }
}
