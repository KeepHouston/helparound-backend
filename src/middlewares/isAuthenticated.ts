import { AuthenticationError } from 'apollo-server-express'
import { MiddlewareFn } from 'type-graphql'
import { CustomContext } from '../types/customContext'

export const isAuthenticated: MiddlewareFn<CustomContext> = async (
    { context },
    next
) => {
    const { user } = context

    if (user === null) {
        throw new AuthenticationError('Not authenticated!')
    }

    return next()
}
