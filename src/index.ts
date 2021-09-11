import { PrismaClient } from '@prisma/client';
import { ApolloServer } from "apollo-server-express";
import cookieParser from 'cookie-parser';
import express from "express";
import { execute, subscribe } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { createServer } from 'http';
import "reflect-metadata";
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { buildSchema } from 'type-graphql';
import { resolvers } from './resolvers';


require('dotenv').config()

async function bootstrap() {

  const app = express()

  app.use(cookieParser())

  const httpServer = createServer(app);

  const pubSub = new PubSub();

  const prisma = new PrismaClient()

  const schema = await buildSchema({
    resolvers,
    // pubSub
  });

  const server = new ApolloServer({
    schema,plugins: [{
    async serverWillStart() {
      return {
        async drainServer() {
          subscriptionServer.close();
        }
      };
    }
  }],

    // subscriptions: {
    //   path: "/",
    //   onConnect: async (params, wsocket, wscontext) => {
    //     console.log(`Client connected for subscriptions`);

    //     const claims: Claims | null = await getClaims(parseCookies(<Request>wscontext.request))

    //     claims && await pubSub.publish(USER_ONLINE, { id: claims.id, online: true });

    //     return { claims, prisma }

    //   },
    //   onDisconnect: async (wsocket, wscontext) => {
    //     const { claims } = await wscontext.initPromise;

    //     const { id } = claims ?? {}

    //     id && await pubSub.publish(USER_ONLINE, { id, online: false });

    //     console.log("Client disconnected from subscriptions");
    //   },
    // },

    context: async ({ req, res, ...rest }: any) => ({
      req,
      res,
      prisma,
      ...rest
    }),
  });
const subscriptionServer = SubscriptionServer.create({
   // This is the `schema` we just created.
   schema,
   // These are imported from `graphql`.
   execute,
   subscribe,
}, {
   // This is the `httpServer` we created in a previous step.
   server: httpServer,
   // This `server` is the instance returned from `new ApolloServer`.
   path: server.graphqlPath,
});


  await server.start();

  server.applyMiddleware({ app })

  const PORT = process.env.SERVER_PORT || '3001'
  httpServer.listen(
    parseInt(PORT),
    () => console.log(`Server is now running on http://localhost:${PORT}/graphql`)
  )
}

bootstrap();
