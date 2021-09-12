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
import { PositionArgs, PositionObject, UserLocation } from '../../utils/redis/location'
import { NEED_HELP_REQUEST, OUTCOMING_REQUEST_ACCEPTED } from '../SubscriptionTypes'
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
    id!: string

    @Field(() => String)
    description!: string

    @Field(() => Boolean)
    inplace!: boolean
}

@ObjectType()
class OutcomingRequestAcceptedAction {

    @Field(() => String)
    requestId!: string

    @Field(() => PositionObject)
    acceptorLocation!: PositionObject
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

    @Field(() => PositionObject)
    location!: PositionObject
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

        const { id: requestId } = await prisma.request.create({
            data: {
                description: requestArgs.description,
                customer_id: user.id,
                is_in_place: requestArgs.inplace,
            },
        })

        const location = await new UserLocation(user.id).get()

        const requestor = await prisma.user.findUnique({ where: { id: user.id } })

        const unsortedUsers: { userId: string, distance: number }[] = []

        location && await redisIterate(redis, (key, value) => {

            const _user = (<PositionArgs>JSON.parse(value))

            const distance = distanceCalculator(
                location.latitude,
                location.longitude,
                _user.latitude,
                _user.longitude
            )

            const splittedKey = key.split(":")[1]


            unsortedUsers.push({ userId: splittedKey, distance })

        })

        pubSub.publish(NEED_HELP_REQUEST, { users: unsortedUsers.sort((a, b) => a.distance - b.distance).slice(0, Math.min(15, unsortedUsers.length)), request: { ...requestArgs, id: requestId }, requestor, location })


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
        @PubSub() pubSub: PubSubEngine
    ): Promise<SuccessResponse | null> {
        const { prisma, user } = ctx

        const { requestId } = acceptRequestArgs

        const location = await new UserLocation(user.id).get()
        
        await prisma.request.update({
            where: {
                id: requestId,
            },
            data: {
                status: RequestStatus.ONGOING,
                supplier_id: user.id
            }
        })

        pubSub.publish(OUTCOMING_REQUEST_ACCEPTED, { requestId, acceptorLocation: location})

        return { success: true }
    }

    @UseMiddleware(isAuthenticated)
    @Mutation(() => SuccessResponse)
    async declineRequest(
        @Ctx() ctx: CustomContext,
        @Arg('input') acceptRequestArgs: AcceptRequestArgs,
    ): Promise<SuccessResponse | null> {
        const { prisma } = ctx

        await prisma.request.update({
            where: {
                id: acceptRequestArgs.requestId,
            },
            data: {
                status: RequestStatus.CANCELLED,
            }
        })


        return { success: true }
    }

    @Subscription(() => RequestNearby, {
        topics: NEED_HELP_REQUEST,
        filter: ({ context, payload }: any) => {
            const { id } = context.user

            return !!R.find(R.propEq('userId', id), payload.users)
        },
    })
    async incomingRequest(
        @Ctx() ctx: CustomContext,
        @Root() requestNearby: RequestNearby & { users: { userId: string, distance: number }[] }
    ): Promise<RequestNearby> {
        return R.omit(['users'], requestNearby)
    }

    @Subscription(() => RequestNearby, {
        topics: OUTCOMING_REQUEST_ACCEPTED,
        filter: async ({ context, payload }: any) => {
            const { prisma, user } = context
            const { id } = user

            const resp = await prisma.request.findUnique({ where: { id: payload.requestId }, include: { customer: true } })

            return resp.customer_id === id
        },
    })
    async outcomingRequestAccepted(
        @Ctx() ctx: CustomContext,
        @Root() outcomingRequestAcceptedAction: OutcomingRequestAcceptedAction
    ): Promise<OutcomingRequestAcceptedAction> {
        return outcomingRequestAcceptedAction
    }

}
