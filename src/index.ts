import { PrismaClient } from '@prisma/client'
import { ApolloServer } from 'apollo-server-express'
import cookieParser from 'cookie-parser'
import express from 'express'
import { execute, subscribe } from 'graphql'
import { PubSub } from 'graphql-subscriptions'
import { createServer } from 'http'
import 'reflect-metadata'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { buildSchema } from 'type-graphql'
import { CustomContext } from './context/types'
import { resolvers } from './resolvers'
import { getClaims } from './utils'
import { redisClient } from './utils/redis'

require('dotenv').config()

async function bootstrap() {
    const app = express()

    app.use(cookieParser())

    const httpServer = createServer(app)

    const pubSub = new PubSub()

    const prisma = new PrismaClient()
    const redis = await redisClient()

    const schema = await buildSchema({
        resolvers,
        // pubSub
    })

    const server = new ApolloServer({
        schema,
        plugins: [
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            subscriptionServer.close()
                        },
                    }
                },
            },
        ],
        context: async ({ req, res, ...rest }: any): Promise<CustomContext> => {
            const claims = await getClaims(req)
            return {
                req,
                res,
                prisma,
                user: claims,
                redis,
                ...rest,
            }
        },
    })
    const subscriptionServer = SubscriptionServer.create(
        {
            schema,
            execute,
            subscribe,
        },
        {
            server: httpServer,
            path: server.graphqlPath,
        }
    )

    await server.start()

    server.applyMiddleware({ app })

    const PORT = process.env.SERVER_PORT || '3001'
    httpServer.listen(parseInt(PORT), () =>
        console.log(`Server is now running on http://localhost:${PORT}/graphql`)
    )
}

bootstrap()
