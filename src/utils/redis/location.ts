import { Field, Float, InputType } from 'type-graphql'
import { redisClient } from '.'


@InputType()
export class PositionArgs {

    @Field((type) => Float)
    latitude!: number

    @Field((type) => Float)
    longitude!: number
}

export class UserLocation {
    storageKey = `user:${this.userId}`

    constructor(private userId: string) {}

    async set(location: PositionArgs | null) {
        if (!location) {
            return
        }
        const redis = await redisClient()

        return redis.set(this.storageKey, JSON.stringify(location))
    }

    async get(): Promise<PositionArgs | null> {
        const redis = await redisClient()

        const stringLocation = await redis.get(this.storageKey)

        if (!stringLocation) {
            return null
        }

        return JSON.parse(stringLocation) as PositionArgs
    }

    async update(updater: (data: PositionArgs | null) => PositionArgs | null) {
        return this.set(updater(await this.get()))
    }
}
