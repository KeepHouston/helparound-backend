import {
    Arg,
    Ctx,
    Field,
    InputType,
    Mutation,
    ObjectType,
    PubSub,
    PubSubEngine,
    Resolver,
    Root,
    Subscription,
    UseMiddleware,
} from 'type-graphql'
import { User } from '../../generated/type-graphql'
import { isAuthenticated } from '../../middlewares/isAuthenticated'
import { CustomContext } from '../../types/customContext'
import { RequestStatus } from '../../types/enums'
import { SuccessResponse } from '../../types/SuccessResponse'
import { redisIterate } from '../../utils/redis'
import { PositionArgs, UserLocation } from '../../utils/redis/location'
import { NEED_HELP_REQUEST } from '../SubscriptionTypes'
import { distanceCalculator } from '../UserResolver'
import * as R from 'rambda'
@InputType()
class HelpMeActionArgs {
    @Field(() => String)
    description!: string

    @Field(() => Boolean)
    inplace!: boolean
}

@ObjectType()
class HelpMeAction {
    @Field(() => String)
    description!: string

    @Field(() => Boolean)
    inplace!: boolean
}

@InputType()
class AcceptRequestArgs {
    @Field(() => String)
    requestId!: string
}
@ObjectType()
class RequestNearby {
    @Field(() => HelpMeAction)
    request!: HelpMeAction

    @Field(() => User)
    requestor!: User
}

@ObjectType()
class CreateRequestResult {
    @Field(() => String)
    requestId!: string
}

@Resolver()
export class UserActionResolver {
    @UseMiddleware(isAuthenticated)
    @Mutation(() => CreateRequestResult)
    async createRequest(
        @Ctx() ctx: CustomContext,
        @Arg('input') requestArgs: HelpMeActionArgs,
        @PubSub() pubSub: PubSubEngine
    ): Promise<CreateRequestResult | null> {
        const { prisma, redis, user } = ctx
        
        const {id: requestId} = await prisma.request.create({
            data: {
                description: requestArgs.description,
                customer_id: user.id,
                is_in_place: requestArgs.inplace,
            },
        })

        const location = await new UserLocation(user.id).get()

        const requestor = await prisma.user.findUnique({ where: { id: user.id } })

        const under300meters: string[] = []
        const firstTen: string[] = []

        location && redisIterate(redis, (key, value) => {

            const _user = (<PositionArgs>JSON.parse(value))

            const distance = distanceCalculator(
                location.latitude,
                location.longitude,
                _user.latitude,
                _user.longitude
            )

            const splittedKey = key.split(":")[1]

            if (distance <= 300) {

                under300meters.push(splittedKey)

                if (under300meters.length === 5) {
                    pubSub.publish(NEED_HELP_REQUEST, { users: under300meters, request: requestArgs, requestor })
                    return

                }
            }

            firstTen.push(splittedKey)

            if (firstTen.length === 10) {
                pubSub.publish(NEED_HELP_REQUEST, { users: firstTen, request: requestArgs, requestor })
                return
            }
        })

        return { requestId }
    }

    @UseMiddleware(isAuthenticated)
    @Mutation(() => SuccessResponse)
    async approveRequest(
        @Ctx() ctx: CustomContext,
        @Arg('input') acceptRequestArgs: AcceptRequestArgs,
    ): Promise<SuccessResponse | null> {
        const { prisma, user } = ctx

        await prisma.request.update({
            where: {
                id: acceptRequestArgs.requestId,
            },
            data: {
                status: RequestStatus.COMPLETED,
            }
        })

        return { success: true }
    }

    @UseMiddleware(isAuthenticated)
    @Mutation(() => SuccessResponse)
    async acceptRequest(
        @Ctx() ctx: CustomContext,
        @Arg('input') acceptRequestArgs: AcceptRequestArgs,
    ): Promise<SuccessResponse | null> {
        const { prisma, user } = ctx

        await prisma.request.update({
            where: {
                id: acceptRequestArgs.requestId,
            },
            data: {
                status: RequestStatus.ONGOING,
                supplier_id: user.id
            }
        })


        return { success: true }
    }

    @Subscription(() => RequestNearby, {
        topics: NEED_HELP_REQUEST,
        filter: ({ payload, context: { connection } }: any) => {
            const { id } = connection.context.user

            return R.find(R.equals(id), payload.users)
        },
    })
    async requestNearby(
        @Ctx() ctx: CustomContext,
        @Root() requestNearby: RequestNearby & { users: string[] }
    ): Promise<RequestNearby> {
        return R.omit(['users'], requestNearby)
    }

}
