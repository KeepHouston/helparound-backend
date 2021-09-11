import { AuthenticationError } from 'apollo-server-express'
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
    UseMiddleware,
} from 'type-graphql'
import { isAuthenticated } from '../../middlewares/isAuthenticated'
import { CustomContext } from '../../types/customContext'
import { setCookies } from '../../utils'
import { getUserProfile, refreshTokens, validateToken } from '../../utils/auth'
import { USER_ONLINE } from '../SubscriptionTypes'

@ObjectType()
class AuthResponse {
    constructor(success: boolean) {
        this.success = success
    }

    @Field()
    success!: boolean
}

@InputType()
class AuthArgs {
    @Field()
    idToken!: string
    @Field()
    accessToken!: string
    @Field()
    refreshToken!: string
}

@Resolver(AuthResponse)
export class AuthResolver {
    @Mutation(() => AuthResponse)
    async refreshTokens(
        @Ctx() ctx: CustomContext
    ): Promise<AuthResponse | Error> {
        const {
            req: {
                cookies: { accessToken, idToken, refreshToken },
            },
            res,
        } = ctx

        if (!refreshToken) {
            throw new AuthenticationError('Invalid refresh token')
        }

        await refreshTokens({ accessToken, idToken, refreshToken })
            .then(setCookies(res))
            .catch(() => {
                return new AuthResponse(false)
            })

        return new AuthResponse(true)
    }

    @UseMiddleware(isAuthenticated)
    @Mutation(() => AuthResponse)
    async signout(
        @Ctx() ctx: any,
        @PubSub() pubSub: PubSubEngine
    ): Promise<AuthResponse | Error> {
        const {
            req: {
                claims: { id },
            },
            res,
        } = ctx

        await pubSub.publish(USER_ONLINE, { id, online: false })

        res.clearCookie('accessToken')
        res.clearCookie('refreshToken')
        res.clearCookie('idToken')

        return new AuthResponse(true)
    }

    @Mutation(() => AuthResponse)
    async login(
        @Arg('input') authArgs: AuthArgs,
        @Ctx() ctx: CustomContext
    ): Promise<AuthResponse | Error> {
        const { res, prisma } = ctx

        const { accessToken, idToken, refreshToken } = authArgs

        const validAccessToken = await validateToken(accessToken, 'accessToken')
        const validIdToken = await validateToken(idToken, 'idToken')
        const userProfile = await getUserProfile(accessToken)

        if (validAccessToken && validIdToken && userProfile) {
            await prisma.user.upsert({
                create: {
                    avatar: userProfile.picture,
                    name: userProfile.name,
                    id: userProfile.id,
                    is_disabled: false,
                },
                update: {
                    avatar: userProfile.picture,
                    name: userProfile.name,
                },
                where: { id: userProfile.id },
            })

            setCookies(res)({
                credentials: {
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    id_token: idToken,
                },
            })
            return new AuthResponse(true)
        }
        return new AuthResponse(false)
    }
}
