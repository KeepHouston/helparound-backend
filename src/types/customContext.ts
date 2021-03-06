import { PrismaClient } from '@prisma/client'
import { Request, Response } from 'express'
import { redisClient } from '../utils/redis'

export interface Claims {
    id: string
    name: string
    email: string
    picture: string
}

export interface CustomContext {
    req: Request
    res: Response
    user: Claims
    prisma: PrismaClient
    redis: ReturnType<typeof redisClient>
}
