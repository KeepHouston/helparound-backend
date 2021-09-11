import {AuthResolver} from './AuthResolver'
import { FileRequestResolver } from './FileRequestResolver'
import { UserPositionResolver } from './UserPositionResolver'
import { UserResolver } from './UserResolver'

export const resolvers: any = [AuthResolver, UserResolver, UserPositionResolver, FileRequestResolver]