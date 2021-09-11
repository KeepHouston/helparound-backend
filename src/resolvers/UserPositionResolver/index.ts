import { Resolver, Query, Ctx, InputType, Field, Float, Arg, Mutation, PubSub, PubSubEngine, UseMiddleware } from 'type-graphql';

import { CustomContext } from '../../context/types';
import { Userposition } from '../../generated/type-graphql';
import { isAuthenticated } from '../../middlewares/isAuthenticated';
import { LOCATION_UPDATE } from '../SubscriptionTypes';
@InputType()
class PositionArgs {

    @Field((type) => Float)
    latitude!: number

    @Field((type) => Float)
    longitude!: number
}

@Resolver(Userposition)
export class UserPositionResolver {

    @UseMiddleware(isAuthenticated)
    @Mutation(returns => Userposition)
    async setCurrentPosition(
        @Arg("input") position: PositionArgs,
        @Ctx() ctx: CustomContext,
        @PubSub() pubSub: PubSubEngine
    ): Promise<Userposition> {
        const { req: { claims: { id } }, prisma } = ctx

        const userPositionResponse = await prisma.userposition.upsert({
            where: {
                userid: id
            },
            update: {
                ...position
            },
            create: {
                user: { connect: { id } },
                ...position
            }
        })

        const payload = { ...userPositionResponse, userid: id, }

        await pubSub.publish(LOCATION_UPDATE, payload);

        return userPositionResponse;
    }
}
