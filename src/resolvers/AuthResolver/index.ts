import { AuthenticationError } from 'apollo-server-express';
import { Arg, Field, Mutation, Resolver, ObjectType, Query, InputType, Ctx, PubSub, PubSubEngine, UseMiddleware } from 'type-graphql';
import { CustomContext } from '../../context/types';
import { isAuthenticated } from '../../middlewares/isAuthenticated';

import { setCookies } from '../../utils'
import { authenticateGoogle, refreshTokens } from '../../utils/auth'
import { USER_ONLINE } from '../SubscriptionTypes';

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
    code!: string
}

@Resolver(AuthResponse)
export class AuthResolver {

    @Query(returns => String)
    hello(@Ctx() ctx: CustomContext): string {

        return 'world'
    }

    @Mutation(returns => AuthResponse)
    async refreshTokens(
        @Ctx() ctx: CustomContext
    ): Promise<AuthResponse | Error> {
        const { req: { cookies: { accessToken, idToken, refreshToken } }, res } = ctx

        if(!refreshToken) {
            throw new AuthenticationError('Invalid refresh token')
        }

        await refreshTokens({ accessToken, idToken, refreshToken }).then(setCookies(res)).catch(err => { throw err })

        return new AuthResponse(true)
    }

    @UseMiddleware(isAuthenticated)
    @Mutation(returns => AuthResponse)
    async signOut(
        @Ctx() ctx: any,
        @PubSub() pubSub: PubSubEngine
    ): Promise<AuthResponse | Error> {
        const { req: { claims: { id } }, res } = ctx

        await pubSub.publish(USER_ONLINE, { id, online: false });

        res.clearCookie('accessToken')
        res.clearCookie('refreshToken')
        res.clearCookie('idToken')

        return new AuthResponse(true)
    }

    @Mutation(returns => AuthResponse)
    async authGoogle(
        @Arg("input") authArgs: AuthArgs,
        @Ctx() ctx: CustomContext
    ): Promise<AuthResponse | Error> {

        const { req, res } = ctx

        const { code } = authArgs;
        req.body = {
            ...req.body,
            code,
        };

        try {
            // data contains the accessToken, refreshToken and profile from passport
            //@ts-ignore
            const { data, info } = await authenticateGoogle(req, res);

            // console.log(data);

            if (data) {
                const { accessToken, refreshToken, idToken } = data;

                setCookies(res)({
                    credentials: {
                        access_token: accessToken,
                        refresh_token: refreshToken,
                        id_token: idToken
                    }
                })

                return new AuthResponse(true)
            }

            if (info) {

                console.log(info);

                switch (info.code) {
                    case 'ETIMEDOUT':
                        return (new Error('Failed to reach Google: Try Again'));
                    default:
                        return (new Error('something went wrong'));
                }
            }
            return (Error('server error'));
        } catch (error) {
            return error;
        }
    }
}
