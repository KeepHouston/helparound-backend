import { AuthResolver } from './AuthResolver'
import { UserActionResolver } from './UserActionResolver'
import { UserPositionResolver } from './UserPositionResolver'
import { UserResolver } from './UserResolver'

export const resolvers: any = [AuthResolver, UserResolver, UserPositionResolver, UserActionResolver]