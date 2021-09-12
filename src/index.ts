import { PrismaClient } from '@prisma/client'
import { ApolloServer } from 'apollo-server-express'
import cookieParser from 'cookie-parser'
import express, { Request } from 'express'
import { execute, subscribe } from 'graphql'
import { PubSub } from 'graphql-subscriptions'
import { createServer } from 'http'
import 'reflect-metadata'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { buildSchema } from 'type-graphql'
import { resolvers } from './resolvers'
import { Claims, CustomContext } from './types/customContext'
import { getClaims, parseCookies } from './utils'
import { redisClient } from './utils/redis'
import { UserLocation } from './utils/redis/location'

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
        pubSub,
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
            let claims
            try {
                claims = await getClaims(req)
            } catch {
                claims = null
            }
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
            //@ts-ignore
            onConnect: async (params, wsocket, wscontext) => {
                const user: Claims | null = await getClaims(
                    parseCookies(<Request>wscontext.request)
                )

                return { user, prisma, redis }
            },
            //@ts-ignore
            // onDisconnect: async (wsocket, wscontext) => {
            //   const { user } = await wscontext.initPromise;

            //   await new UserLocation(user.id).delete()
            // },
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
