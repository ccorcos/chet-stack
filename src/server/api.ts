import { ApiHandlers } from "api/types"
import * as authApis from "auth/apis"
import { Assert } from "shared/typeHelpers"
import * as uploadApis from "upload/apis"
import * as apis from "./apis"
import { ServerEnvironment } from "./ServerEnvironment"

const api = { ...apis, ...authApis, ...uploadApis }
export type ApiType = typeof api

// Assert proper types.
type A1 = Assert<typeof api, ApiHandlers<ServerEnvironment>>

export { api }
