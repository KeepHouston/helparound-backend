import { Claims } from "../../context/types";
import GoogleAuthCodeStrategy from "./passport/authcode_strategy";

const { OAuth2Client } = require('google-auth-library');

const passport = require('passport');

const axios = require('axios');

export const validateToken = async (token: any, clientId: string) => {
    const tokenPayload = await loadTokenPayload(token);

    const { aud, exp } = tokenPayload
    if (aud === clientId && exp < Date.now()) {
        return tokenPayload
    }

    return null
}

export const getUserProfile = async (accessToken: string): Promise<Claims> => {
    const url = `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${accessToken}`

    try {
        const { data } = await axios.get(url);
        return data
    } catch (error: any) {
        return error;
    }
}

const loadTokenPayload = async (token: any) => {
    const [tokenName, tokenValue] = Object.entries(token)[0]
    const url = `https://oauth2.googleapis.com/tokeninfo?${tokenName}=${tokenValue}`

    try {
        const { data } = await axios.get(url);
        return data
    } catch (error: any) {
        return error;
    }

}

// GOOGLE STRATEGY
const GoogleTokenStrategyCallback = (
    resultsJson: any,
    accessToken: any,
    refreshToken: any,
    profile: any,
    done: (arg0: null, arg1: { accessToken: any; refreshToken: any; profile: any; idToken: any }) => any
) => {

    const { id_token: idToken } = resultsJson

    return done(null, {
        accessToken,
        refreshToken,
        idToken,
        profile,
    })
};

const GoogleStrategy = new GoogleAuthCodeStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'postmessage'
}, GoogleTokenStrategyCallback)

passport.use(GoogleStrategy);

export const refreshTokens = async (tokens: any) => {
    const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'postmessage'
    );

    oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        id_token: tokens.idToken
    });

    return await oauth2Client.refreshAccessToken()
};


export const authenticateGoogle = (req: any, res: any) => new Promise((resolve, reject) => {
    passport.authenticate('google-authcode', { session: false, accessType: 'offline', prompt: 'consent' }, (err: any, data: any, info: any) => {
        if (err) reject(err);

        resolve({ data, info });
    })(req, res);
});

