import { AuthenticationError } from 'apollo-server-express'
import {
    Arg,
    Ctx,
    Field,
    InputType,
    Mutation,
    ObjectType,
    Resolver,
    UseMiddleware,
} from 'type-graphql'
import { isAuthenticated } from '../../middlewares/isAuthenticated'
import { CustomContext } from '../../types/customContext'
import { SuccessResponse } from '../../types/SuccessResponse'
import { setCookies } from '../../utils'
import { getUserProfile, refreshTokens, validateToken } from '../../utils/auth'

@InputType()
class AuthArgs {
    @Field()
    idToken!: string
    @Field()
    accessToken!: string
    @Field()
    refreshToken!: string
}

@Resolver(SuccessResponse)
export class AuthResolver {
    @Mutation(() => SuccessResponse)
    async refreshTokens(
        @Ctx() ctx: CustomContext
    ): Promise<SuccessResponse | Error> {
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
                return new SuccessResponse(false)
            })

        return new SuccessResponse(true)
    }

    @UseMiddleware(isAuthenticated)
    @Mutation(() => SuccessResponse)
    async logout(
        @Ctx() ctx: CustomContext
        // @PubSub() pubSub: PubSubEngine
    ): Promise<SuccessResponse | Error> {
        const { res } = ctx

        // await pubSub.publish(USER_ONLINE, { id, online: false })

        res.clearCookie('accessToken')
        res.clearCookie('refreshToken')
        res.clearCookie('idToken')

        return new SuccessResponse(true)
    }

    @Mutation(() => SuccessResponse)
    async login(
        @Arg('input') authArgs: AuthArgs,
        @Ctx() ctx: CustomContext
    ): Promise<SuccessResponse | Error> {
        const { res, prisma } = ctx

        const { accessToken, idToken, refreshToken } = authArgs

        const [validAccessToken, validIdToken, userProfile] = await Promise.all(
            [
                await validateToken(accessToken, 'accessToken'),
                await validateToken(idToken, 'idToken'),
                await getUserProfile(accessToken),
            ]
        )

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
            return new SuccessResponse(true)
        }
        return new SuccessResponse(false)
    }
}
