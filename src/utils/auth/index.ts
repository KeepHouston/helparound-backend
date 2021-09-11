import axios from 'axios'
import { OAuth2Client } from 'google-auth-library'
import { Claims } from '../../types/customContext'

const clientId = process.env.GOOGLE_CLIENT_ID || ''

export const validateToken = async (
    token: string,
    type: 'accessToken' | 'idToken' | 'refreshToken'
) => {
    const url = `https://oauth2.googleapis.com/tokeninfo?${type}=${token}`

    try {
        const { data } = await axios.get(url)
        if (!data) {
            return null
        }
        const { aud, exp } = data
        if (aud === clientId && exp < Date.now()) {
            return data
        }
        return null
    } catch {
        return null
    }
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
