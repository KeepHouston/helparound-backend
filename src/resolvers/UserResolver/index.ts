import {
    Arg,
    Ctx,
    Field,
    Float,
    InputType,
    ObjectType,
    Query,
    Resolver,
    UseMiddleware,
} from 'type-graphql'
import { User } from '../../generated/type-graphql'
import { isAuthenticated } from '../../middlewares/isAuthenticated'
import { CustomContext } from '../../types/customContext'

export const toRadians = (v: number) => (v * Math.PI) / 180

//in meters
export const distanceCalculator = (
    lat1: number,
    long1: number,
    lat2: number,
    long2: number
): number => {
    return (
        6371 *
        2 *
        1000 *
        Math.asin(
            Math.sqrt(
                Math.pow(Math.sin((toRadians(lat1) - toRadians(lat2)) / 2), 2) +
                    Math.cos(toRadians(lat1)) *
                        Math.cos(toRadians(lat2)) *
                        Math.pow(
                            Math.sin((toRadians(long1) - toRadians(long2)) / 2),
                            2
                        )
            )
        )
    )
}
@ObjectType()
class UserResponse extends User {
    @Field((type) => Float, { nullable: true })
    distance?: Number
}

@ObjectType()
class UserUpdateResponse {
    @Field()
    id!: string

    @Field((type) => Float, { nullable: true })
    distance!: Number
}

@ObjectType()
class UserOnlineRequest {
    @Field()
    id!: string

    @Field()
    online!: boolean
}

@ObjectType()
class UserOnlineResponse extends UserResponse {
    @Field()
    online!: boolean
}

@InputType()
export class UserByIdArgs {
    @Field()
    id!: string
}

@InputType()
class TrackedUsersArgs {
    @Field(() => [String])
    ids!: string[]
}

@Resolver(User)
export class UserResolver {
    @UseMiddleware(isAuthenticated)
    @Query(() => User)
    async getUserById(
        @Ctx() ctx: CustomContext,
        @Arg('input') userArgs: UserByIdArgs
    ): Promise<User | null> {
        const { prisma } = ctx

        const { id } = userArgs
        return await prisma.user.findUnique({
            where: {
                id,
            },
        })
    }

    @Query(() => User)
    async me(@Ctx() ctx: CustomContext): Promise<User | null> {
        const { prisma, user } = ctx

        if (!user) {
            return { avatar: '', id: '', is_disabled: false, name: '' }
        }

        return await prisma.user.findUnique({
            where: { id: user.id },
        })
    }

    // @UseMiddleware(isAuthenticated)
    // @Query((returns) => [User])
    // async getRecentUsersRelations(@Ctx() ctx: CustomContext): Promise<User[]> {
    //     const {
    //         req: {
    //             claims: { id },
    //         },
    //         prisma,
    //     } = ctx

    //     //@ts-ignore
    //     return (
    //         await prisma.filerequest.findMany({
    //             where: {
    //                 senderid: id,
    //             },
    //             include: {
    //                 receiver: true,
    //             },
    //             distinct: ['receiverid'],
    //         })
    //     ).map(R.prop('receiver'))
    // }

    // @UseMiddleware(isAuthenticated)
    // @Query(returns => [UserResponse])
    // async getNearestUsers(@Ctx() ctx: CustomContext): Promise<[UserResponse]> {
    //     const { req: { claims: { id } }, prisma } = ctx

    //     const { latitude, longitude } = await prisma.userposition.findUnique({
    //         where: {
    //             userid: id
    //         }
    //     }) ?? {}

    //     return prisma.$queryRaw`SELECT u.name, u.email, u.image, u.id, 6371 * 2 * ASIN(SQRT(POWER(SIN((radians(up.latitude) - radians(${latitude})) / 2), 2) + COS(radians(${latitude}))* cos(radians(up.latitude)) * POWER(SIN((radians(up.longitude) - radians(${longitude})) / 2), 2))) as distance FROM "userposition" up join "user" u on up.userid=u.id and up.userid!=${id} and u.online=true order by distance;`
    // }

    // @Subscription(() => UserUpdateResponse, {
    //     topics: LOCATION_UPDATE,
    //     filter: ({ payload, args, context: { connection } }: any) => {
    //         const { input } = args

    //         const { id: userid } = connection.context.claims

    //         const { id } = payload

    //         return userid !== id && R.find(R.equals(id), input.ids)
    //     },
    // })
    // async updateNearestData(
    //     @Ctx() ctx: CustomContext,
    //     @Arg('input') trackedUsers: TrackedUsersArgs,
    //     @Root() newUserLocation: any
    // ): Promise<UserUpdateResponse> {
    //     const id = R.pathOr(
    //         null,
    //         ['connection', 'context', 'claims', 'id'],
    //         ctx
    //     )
    //     const prisma: any = R.path(['connection', 'context', 'prisma'], ctx)

    //     const {
    //         latitude: _latitude,
    //         longitude: _longitude,
    //         userid,
    //     } = newUserLocation

    //     const { latitude, longitude }: any =
    //         await prisma.userposition.findUnique({
    //             where: {
    //                 userid: id,
    //             },
    //         })

    //     const distance = distanceCalculator(
    //         _latitude,
    //         _longitude,
    //         latitude,
    //         longitude
    //     )

    //     return { id: userid, distance }
    // }

    // @Subscription(() => UserOnlineResponse, {
    //     topics: USER_ONLINE,
    //     filter: ({ payload, args, context: { connection } }: any) => {
    //         const { id: userid } = connection.context.claims

    //         const { id } = payload

    //         return userid !== id
    //     },
    // })
    // async updateUserOnline(
    //     @Root() userOnlineRequest: UserOnlineRequest,
    //     @Ctx() ctx: CustomContext
    // ): Promise<UserOnlineResponse> {
    //     const id = R.pathOr(
    //         null,
    //         ['connection', 'context', 'claims', 'id'],
    //         ctx
    //     )

    //     const prisma: any = R.path(['connection', 'context', 'prisma'], ctx)

    //     const user = await prisma.user.update({
    //         where: {
    //             id: userOnlineRequest.id,
    //         },
    //         data: {
    //             online: userOnlineRequest.online,
    //         },
    //     })

    //     if (!userOnlineRequest.online) {
    //         return { ...user, online: false }
    //     }

    //     const { latitude, longitude }: any =
    //         await prisma.userposition.findUnique({
    //             where: {
    //                 userid: id,
    //             },
    //         })

    //     const { latitude: _latitude, longitude: _longitude }: any =
    //         await prisma.userposition.findUnique({
    //             where: {
    //                 userid: userOnlineRequest.id,
    //             },
    //         })

    //     const distance = distanceCalculator(
    //         _latitude,
    //         _longitude,
    //         latitude,
    //         longitude
    //     )

    //     return { ...user, online: true, distance }
    // }
}
