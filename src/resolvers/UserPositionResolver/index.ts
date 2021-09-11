import { Field, Float, InputType } from 'type-graphql';

@InputType()
class PositionArgs {

    @Field((type) => Float)
    latitude!: number

    @Field((type) => Float)
    longitude!: number
}

// @Resolver(Userposition)
export class UserPositionResolver {

    // @UseMiddleware(isAuthenticated)
    // @Mutation(returns => Userposition)
    // async setCurrentPosition(
    //     @Arg("input") position: PositionArgs,
    //     @Ctx() ctx: CustomContext,
    //     @PubSub() pubSub: PubSubEngine
    // ): Promise<Userposition> {
    //     const { req: { claims: { id } }, prisma } = ctx

    //     const userPositionResponse = await prisma.userposition.upsert({
    //         where: {
    //             userid: id
    //         },
    //         update: {
    //             ...position
    //         },
    //         create: {
    //             user: { connect: { id } },
    //             ...position
    //         }
    //     })

    //     const payload = { ...userPositionResponse, userid: id, }

    //     await pubSub.publish(LOCATION_UPDATE, payload);

    //     return userPositionResponse;
    // }
}
