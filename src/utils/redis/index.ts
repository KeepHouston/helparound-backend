import { createClient } from 'redis'
import { RedisClientType } from 'redis/dist/lib/client'
import { RedisModules } from 'redis/dist/lib/commands'
import { RedisLuaScripts } from 'redis/dist/lib/lua-script'

export async function redisClient() {
    const client = createClient()

    client.on('error', (err) => console.log('Redis Client Error', err))

    await client.connect()

    return client
}

export async function redisIterate(
    redis: Promise<RedisClientType<RedisModules, RedisLuaScripts>>,
    iterateCallback: (key: string, value: string) => any
) {
    const client = await redis
    for await (const key of client.scanIterator()) {
        iterateCallback(key, await client.get(key))
    }
}
