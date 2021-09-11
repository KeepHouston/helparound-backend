import { PrismaClient } from '@prisma/client'
import { Request, Response } from 'express'

export interface Claims {
    id: string,
    name: string,
    email: string,
    picture: string,
}

export interface CustomContext {
    req: Request & { claims: Claims }
    res: Response
    prisma: PrismaClient,
}

