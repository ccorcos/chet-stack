import type { Request, Response } from "express"
import * as t from "../shared/dataTypes"
import { Assert } from "../shared/typeHelpers"
import * as api from "./apis/autoindex"
import { ServerEnvironment } from "./services/ServerEnvironment"

// Assert proper types.
type ApiHandler = (
	environment: ServerEnvironment,
	args: any,
	req: Request,
	res: Response
) => Promise<any>

type A1 = Assert<typeof api, { [K: string]: { handler: ApiHandler; input: t.Validator<any> } }>

export { api }
