/* eslint-disable @typescript-eslint/no-unused-vars */

import Koa from "koa"
import Router from "koa-router"
import bodyParser from "koa-bodyparser"
import websocket from "koa-easy-ws"

import WebSocket from "ws"
import { PongWS, filterPingPongMessages } from "@cs125/pingpongws"

import { ConnectionQuery, Versions, JoinMessage } from "../types"

import { String } from "runtypes"
const VERSIONS = {
  commit: String.check(process.env.GIT_COMMIT),
  server: String.check(process.env.npm_package_version),
}

// Set up Koa instance and router
const app = new Koa()
const router = new Router<Record<string, unknown>, { ws: () => Promise<WebSocket> }>()

// Possible useful type aliases, just to make our mappings and function declarations more clear
type ClientID = string
type RoomID = string

// Different mappings we need to maintain, so that we can:
//
// 1. Figure out what websockets should receive a message sent to a room
// 2. Figure out what rooms a particular websocket has joined

const clientIDtoWebsocket: Record<ClientID, WebSocket> = {}
const roomToClientIDs: Record<RoomID, ClientID[]> = {}
const clientIDtoRooms: Record<ClientID, RoomID[]> = {}

router.get("/", async (ctx) => {
  const connectionQuery = ConnectionQuery.check(ctx.request.query)
  // clientID is a distinct UUID but stable for each tab, generated by the client
  const { clientID, version, commit } = connectionQuery

  // Should be saved with messages for auditing purposes
  const versions = Versions.check({
    version: {
      server: VERSIONS.server,
      client: version,
    },
    commit: {
      server: VERSIONS.commit,
      client: commit,
    },
  })

  // TODO: eventually require login, since we'll need this to determine who can join various rooms,
  // but for now just set the email to a debugging value
  const email = "student@illinois.edu"

  const ws = PongWS(await ctx.ws())
  // TODO: Update various mappings appropriately

  ws.addEventListener(
    "message",
    filterPingPongMessages(async ({ data }) => {
      // Handle incoming messages here
      const message = JSON.parse(data.toString())
      if (JoinMessage.guard(message)) {
        // TODO: handle join message by updating client and room mappings
        // For now, just automatically create the room if it doesn't exist, although we'll
        // fix this later
        // Reply with a RoomMessage
      } else {
        // As long as the if-else above is exhaustive over all possible client messages,
        // this is a good sanity check
        console.error(`Bad message: ${JSON.stringify(message, null, 2)}`)
      }
    })
  )
  ws.addEventListener("close", () => {
    try {
      ws.terminate()
    } catch (err) {}
    // TODO: Update various mappings appropriately
  })
})

// Eventually we'll need to add a MongoDB connection and CORS, but we can keep this simple for now
const port = process.env.BACKEND_PORT ? parseInt(process.env.BACKEND_PORT) : 8888
app.use(bodyParser()).use(websocket()).use(router.routes()).use(router.allowedMethods()).listen(port)

process.on("uncaughtException", (err) => {
  console.error(err)
})