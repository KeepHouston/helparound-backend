import { PrismaClient } from '@prisma/client';
import { ApolloServer } from "apollo-server-express";
import cookieParser from 'cookie-parser';
import express, { Request } from "express";
import { PubSub } from 'graphql-subscriptions';
import { createServer } from "http";
import "reflect-metadata";
import { buildSchema } from 'type-graphql';
import { Claims } from "./context/types";
import { resolvers } from './resolvers';
import { USER_ONLINE } from "./resolvers/SubscriptionTypes";
import { getClaims, parseCookies } from './utils';

require('dotenv').config()




async function bootstrap() {

  const app = express()

  app.use(cookieParser())

  const httpServer = createServer(app);

  const pubSub = new PubSub();

  const prisma = new PrismaClient()

  const schema = await buildSchema({
    resolvers,
    pubSub
  });


  const server = new ApolloServer({
    schema,
    //@ts-ignore
    subscriptions: {
      path: "/",
      onConnect: async (params, wsocket, wscontext) => {
        console.log(`Client connected for subscriptions`);

        const claims: Claims | null = await getClaims(parseCookies(<Request>wscontext.request))

        claims && await pubSub.publish(USER_ONLINE, { id: claims.id, online: true });

        return { claims, prisma }

      },
      onDisconnect: async (wsocket, wscontext) => {
        const { claims } = await wscontext.initPromise;

        const { id } = claims ?? {}

        id && await pubSub.publish(USER_ONLINE, { id, online: false });

        console.log("Client disconnected from subscriptions");
      },
    },

    context: async ({ req, res, ...rest }: any) => ({
      req,
      res,
      prisma,
      ...rest
    }),
  });

  server.applyMiddleware({ app })

  server.installSubscriptionHandlers(httpServer);

  httpServer.listen(
    parseInt(process.env.SERVER_PORT || ''),
    () => console.log("server started on ", process.env.SERVER_PORT)
  )
}

bootstrap();
