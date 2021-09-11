import { Arg, Ctx, Field, InputType, Int, Mutation, ObjectType, PubSub, PubSubEngine, Query, Resolver, Root, Subscription, UseMiddleware } from "type-graphql";
import { CustomContext } from "../../context/types";
import { Filerequest, User } from "../../generated/type-graphql";
import { isAuthenticated } from "../../middlewares/isAuthenticated";
import { FILE_REQUEST_ANSWER, FILE_REQUEST_QUERY } from "../SubscriptionTypes";
import { UserByIdArgs } from "../UserResolver";

@InputType()
class FileRequestArgs {

    @Field((type) => String)
    receiverid!: string

    @Field((type) => String)
    name!: string

    @Field((type) => Int)
    size!: number
}

@ObjectType()
class FileRequestWithSender extends Filerequest {

    @Field(_type => User, {nullable: true})
    sender!: User | null
}

@InputType()
class FileResponseArgs {

    @Field((type) => String)
    id!: string

    @Field((type) => Boolean)
    accepted!: boolean
}

@Resolver(Filerequest)
export class FileRequestResolver {

    @UseMiddleware(isAuthenticated)
    @Query(returns => [Filerequest])
    async getPendingFileRequests(
        @Ctx() ctx: CustomContext,
    ): Promise<Filerequest[]> {
        const { req: { claims: { id } }, prisma } = ctx

        return await prisma.filerequest.findMany({ where: { receiverid: id } })
    }

    @UseMiddleware(isAuthenticated)
    @Mutation(returns => Filerequest)
    async requestFileAccept(
        @Arg("input") fileRequestArgs: FileRequestArgs,
        @Ctx() ctx: CustomContext,
        @PubSub() pubSub: PubSubEngine
    ): Promise<Filerequest> {
        const { req: { claims: { id } }, prisma } = ctx

        const { receiverid, name, size } = fileRequestArgs

        const fileRequest = await prisma.filerequest.create({
            data: {
                senderid: id,
                receiverid,
                name,
                size
            },
            include: {
                sender: true
            }
        })

        pubSub.publish(FILE_REQUEST_QUERY, fileRequest)

        return fileRequest
    }

    @UseMiddleware(isAuthenticated)
    @Mutation(returns => Filerequest)
    async responseFileAccept(
        @Arg("input") fileResponseArgs: FileResponseArgs,
        @Ctx() ctx: CustomContext,
        @PubSub() pubSub: PubSubEngine
    ): Promise<Filerequest> {
        const { prisma } = ctx

        const { id: requestId, accepted } = fileResponseArgs

        const fileRequest = await prisma.filerequest.update({
            where: {
                id: requestId
            },
            data: {
                accepted
            }
        })

        pubSub.publish(FILE_REQUEST_ANSWER, fileRequest)


        return fileRequest
    }

    @Subscription(() => FileRequestWithSender, {
        topics: FILE_REQUEST_QUERY,
        filter: ({ payload, args, context: { connection } }: { payload: Filerequest, args: any, context: any }) => {

            const { id } = connection.context.claims

            const { receiverid } = payload

            return receiverid === id
        },
    }
    )
    subscribeToFileRequest(
        @Root() filerequest: FileRequestWithSender,
    ): FileRequestWithSender {
        return filerequest
    }


    @Subscription(() => Filerequest, {
        topics: FILE_REQUEST_ANSWER,
        filter: ({ payload, args, context: { connection } }: { payload: Filerequest, args: any, context: any }) => {

            const { id } = connection.context.claims

            const { senderid } = payload

            return senderid === id
        },
    }
    )
    subscribeToFileResponse(
        @Root() fileResponse: Filerequest,
    ): Filerequest {
        return fileResponse
    }

    @UseMiddleware(isAuthenticated)
    @Query(returns => [Filerequest])
    async getRecentFileRequests(
        @Ctx() ctx: CustomContext,
        @Arg("input") userArgs: UserByIdArgs,
    ): Promise<Filerequest[]> {
        const { req: { claims: { id } }, prisma } = ctx

        const { id: userid } = userArgs

        return await prisma.filerequest.findMany({
            where: {
                OR: [
                    {
                        senderid: id,
                        receiverid: userid
                    },
                    {
                        senderid: userid,
                        receiverid: id
                    }
                ]
            }
        })
    }
}
