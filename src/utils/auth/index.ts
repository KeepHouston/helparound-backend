import axios from 'axios'
import { OAuth2Client } from 'google-auth-library'
import { Claims } from '../../types/customContext'

export const validateToken = async (token: any, clientId: string) => {
    const tokenPayload = await loadTokenPayload(token)

    const { aud, exp } = tokenPayload
    if (aud === clientId && exp < Date.now()) {
        return tokenPayload
    }

    return null
}

export const getUserProfile = async (accessToken: string): Promise<Claims> => {
    const url = `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${accessToken}`

    try {
        const { data } = await axios.get(url)
        return data
    } catch (error: any) {
        return error
    }
}

const loadTokenPayload = async (token: any) => {
    const [tokenName, tokenValue] = Object.entries(token)[0]
    const url = `https://oauth2.googleapis.com/tokeninfo?${tokenName}=${tokenValue}`

    try {
        const { data } = await axios.get(url)
        return data
    } catch (error: any) {
        return error
    }
}

export const refreshTokens = async (tokens: any) => {
    const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'postmessage'
    )

    oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        id_token: tokens.idToken,
    })

    return await oauth2Client.refreshAccessToken()
}
