import { Arg, Ctx, Field, Float, InputType, Mutation, PubSub, PubSubEngine, Resolver, UseMiddleware } from 'type-graphql';
import { isAuthenticated } from '../../middlewares/isAuthenticated';
import { CustomContext } from '../../types/customContext';
import { SuccessResponse } from '../../types/SuccessResponse';
import { PositionArgs, UserLocation } from '../../utils/redis/location';

@Resolver(SuccessResponse)
export class UserPositionResolver {

    @UseMiddleware(isAuthenticated)
    @Mutation(() => SuccessResponse)
    async updatePosition(
        @Arg("input") position: PositionArgs,
        @Ctx() ctx: CustomContext,
        @PubSub() pubSub: PubSubEngine
    ): Promise<SuccessResponse> {
        const { user } = ctx

        const location = new UserLocation(user.id)

        location.set(position)
        // await pubSub.publish(LOCATION_UPDATE, payload);

        return { success: true };
    }
}
