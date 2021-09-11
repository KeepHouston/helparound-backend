import { AuthenticationError } from "apollo-server-express";
import { MiddlewareFn } from "type-graphql";
import { CustomContext } from "../context/types";
import { getClaims } from "../utils";

export const isAuthenticated: MiddlewareFn<CustomContext> = async ({ context }, next) => {

    const { req, res } = context
    const claims = await getClaims(req)

    if (claims === null) {

        throw new AuthenticationError('Not authenticated!')
    }

    req.claims = claims
    return next();
};
