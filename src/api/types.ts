import type { Request, Response } from "express"
import type * as t from "shared/DataType"

export type ApiHandler<E> = (environment: E, args: any, req: Request, res: Response) => Promise<any>

export type ApiHandlers<E> = {
	[name: string]: {
		input: t.DataType
		handler: ApiHandler<E>
	}
}
