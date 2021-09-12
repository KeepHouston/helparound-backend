# SENDer-server ⚙️

# Share files seamlessly with people around you using webrtc connection!

Available on [sndr.club](https://sndr.club)

## Technical stack

-   **Typescript, Node.js, Express**
-   **[Prisma](https://github.com/prisma/prisma), Postgres**
-   **Apollo-server, TypeGraphql**
-   **[Peerjs-server](https://github.com/peers/peerjs-server)** (WebRTC signaling server)

## Authentication 🔒

-   **[Google OpenID](https://developers.google.com/identity/protocols/oauth2)** ([Code flow](https://openid.net/connect/) with Google OpenID specification with httpOnly cookies as transport)

## How to Build

-   go to `./sndr-server`
-   create your own `.env` file from `.env.example`
-   run `npx prisma generate` and `npx prisma migrate`
-   connect your own or start predefined `peerjs-server` and `postgres` with `docker-compose up`
-   to start the server run `yarn start`
