# Api

A simple way to all APIs as typed functions.


## Server API Handlers

We're using DataType to validate arguments. The request and response objects are there for managing cookies and authentication. The returned object will be JSON serialized.

The `environment` argument is used specifically for dependency injection. Put interfaces to your database, configurations, and other infrastructure on this environment.

```ts
// Example

import * as t from "shared/DataType"
import { ServerEnvironment } from "server/ServerEnvironment"

// Request validation
export const input = t.object({ name: t.string })

// JSON Http Handler
export async function handler(
	environment: ServerEnvironment,
	args: t.InferType<typeof input>,
	req: Request,
	res: Response
) {
	return {reply: `Hello ${args.name}`}
}
```

## API Server

You need to gather all your handlers into an object to boot the ApiServer. The key of the object will be the route accepting json post requests and returning json.

```ts
import express from "express"
import * as hello from "./apis/hello"
import {ApiServer} from "api/ApiServer"

const environment = { db: ..., queue: ..., config: ...}

const app = express()
const apis = { hello, ... }

ApiServer(environment, app, apis)
```

Example usage with `curl`:

```sh
curl -X POST http://localhost:8080/api/hello -H "Content-Type: application/json" -d '{"name": "Chet"}'
```

### API Client

The client give a typed interface for making these api requests. To do this, you need access to the api types without importing the server api code itself.

```ts
import type * as hello from "server/apis/hello"
import {clientApi, formatResponseError} from "api/client"

type ApiType = { hello }
type Api = ClientApi<ApiType>

const api: Api = clientApi()

// Using the API.
const response = api.hello()
if (response.status === 200) {
	const result = response.body
	console.log(result.reply)
} else {
	console.error(formatResponseError(response))
}
```

