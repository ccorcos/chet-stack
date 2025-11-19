import * as authApis from "auth/apis"
import type { Request, Response } from "express"
import * as t from "shared/DataType"
import { Assert } from "shared/typeHelpers"
import * as apis from "./apis"
import { ServerEnvironment } from "./services/ServerEnvironment"

// Assert proper types.
type ApiHandler = (
	environment: ServerEnvironment,
	args: any,
	req: Request,
	res: Response
) => Promise<any>

const api = { ...apis, ...authApis }
export type ApiType = typeof api

type A1 = Assert<typeof api, { [K: string]: { handler: ApiHandler; input: t.DataType } }>

export { api }
