I'm building an offline-tolerant api real-time sync kind of thing for a web based application.

On the backend, we're using a tuple database backed by SQLite.

```ts
type Tuple = any[];
type JSONValue = any;

type WriteArgs<K, V> = { set?: { key: K; value: V }[]; delete?: K[] };

type ListOptions = {
  limit?: number;
  // offset?: number
  reverse?: boolean;
};

type Range<K> = { gt?: K; gte?: K; lt?: K; lte?: K };
type ListArgs<K> = Range<K> & ListOptions;

type TupleDb = {
  compare: (a: Tuple, b: Tuple) => number;
  list(args?: ListArgs<Tuple>): { key: Tuple; value: JSONValue }[];
  write: (tx: WriteArgs<Tuple, JSONValue>) => void;
  get: (key: Tuple) => JSONValue | undefined;
  has: (key: Tuple) => boolean;
  subspace: (prefix: Tuple) => TupleDb;
};
```

On the frontend, we're using a cache which allows us to subscribe to changes in the cache and optimistically write.

```ts
type OkvCache = {
	compare: (a: Tuple, b: Tuple) => number;
  list: (args: ListArgs<Tuple>) => { key: Tuple; value: JSONValue }[];
	/** optimistic write to the cache, returns function to finalize the write. */
  write: (args: WriteArgs<Tuple, JSONValue>) => () => void;
	/** insert */
  insert: (args: ListArgs<Tuple>, result: { key: Tuple; value: JSONValue }[]) => void;
  subscribe: (range: Range<Tuple>, fn: () => void) => () => void;
};
```

We have two simple hooks for data fetching from the backend api and writing it into the cache.

```ts
function useList(_args: ListArgs<Tuple>) {
	const { api, cache } = useClientEnvironment()

	const args = useDeepMemo(() => _args, [_args])

	const [_, rerender] = useCounter()
	const localResultRef = useRef<CacheListResult<Tuple, JSONValue>>({} as any)

	useMemo(() => {
		localResultRef.current = cache.list(args)
	}, [args])

	const [fetchCount, refetch] = useCounter()
	useEffect(() => {
		const unsub = cache.subscribe(args, () => {
			console.log("emitted", args)

			const newResult = cache.list(args)
			if (isEqual(newResult, localResultRef.current)) return
			localResultRef.current = newResult
			rerender()
			// If a use deletes a record leaving an incomplete list, then we need to refetch.
			if (!localResultRef.current.hit) refetch()
		})
		return () => {
			unsub()
		}
	}, [args])

	const requestId = useMemo(() => JSON.stringify([args, fetchCount]), [args, fetchCount])

	const remoteResult = useLoader("list:" + requestId, async () => {
		// TODO: this doesn't seem to be necessary.
		// await pendingWritesSubmitted(args)
		const response = await api.list(args)
		if (response.status !== 200) throw new Error("Request failed: " + response.status)
		cache.insert(args, response.body)
		// return response.body
	})

	const localResult = localResultRef.current
	return { localResult, remoteResult }
}

function useWrite() {
	const { api, cache } = useClientEnvironment()

	return async (args: WriteArgs<Tuple, JSONValue>) => {
		const cleanup = cache.write(args)
		const promise = api.write(args)

		promise.then(cleanup)

		return await promise
	}
}
```

However, none of this handles the realtime sync across clients. The backend api handler simply writes to the database.

```ts
export async function handler(
	environment: ServerEnvironment,
	args: WriteArgs<any[], any>, // t.Infer<typeof input>,
	req: Request,
	res: Response
) {
	const { db } = environment
	return db.write(args)
}
```

But we have a pubsub service we can use...

```ts
const {pubsub} = environment
pubsub.publish({key, value})
```

And on the client we can subscribe.

```ts
const {pubsub} = environment
pubsub.subscribe(listArgs)

pubsub.onMessage(({key, value}) => {
	// Update the cache? Refetch?
})
```

I'm having trouble thinking through the best way of implementing all of this.

1. Subscribing to pubsub after or at the same time as making the api request leaves the opportunity for a missed message in transit.
2. There needs to be some kind of interval tree so that clients subscribe with key ranges and the server publishes keys to the ranges that overlap.
3. I don't want to have to download everything to the client. For example, if I just want to see the latest 50 messages to a chatroom, that should be a fairly simple range query with limit: 50. But whats the best way to make sure I'm synced and up to date?

Help me understand the different options I have for architecting this application.

I want to think through this problem from a variety of perspectives from simplicity to scalability.

On the simple side, this will surely be implemented on top of tuple databases, even if there's queue-like structure in there that will later be some eventually-consistent kafka kind of thing.

I also want to consider how this architecture can be flexibly enough to adapt to other kinds of permission models and data models.

For example, if I have 1000 chatrooms to sync, then its not very convenient to have to sync every single one one-by-one at some point. Although at first, we should definitely consider just doing that!

Obviously we can aggregate things into workspaces so we only sync workspaces, but some kinds of apps cant work like that. Maybe some chatrooms are private and others are not. Chatrooms can have arbitrary permissions that need to be enforced not just at read, but within the sync model as well.

And yet I definitely am going to want to see edit history somewhere as part of the product. So how can we consider all of this?

Perhaps each user gets their own queue to subscribe to as we can out either to each user on the backend or the users fanout on the frontend. That seems like fundamentally the problem we need to solve. And yet, we still have to consider more ephemeral subscriptions that don't get persisted to the backend.

Sorry for the ramble. I'd like you to help me clarify my thinking and work through this problem step by step, considering the different trade-offs and acklowedging what assumptions are being made. The thing is, I'd like this architecture to support as many types of applications as possible so i want to know what we're excluding along the way. Whether its a chat application, a calendar, a wiki-style Notion application, or somethign more like Airtable, I want to be able to build it all with this general architecture without having to anything bespoke until we really have to consider scaling...


---


There's a changelog for rooms and potentially a changelog for users too.

When you fetch, you get a snapshot count which tells you version of that index. And you can subscribe to changes as well.


Let's get more concrete with a chatroom example.

type User = {
	id: string
	name: string
}

type Room = {
	id: string
	name: string
}

type Message = {
	id: string
	roomId: string
	userId: string
	createdAt: string
	text: string
}

function createMessage(db: TupleDb, message: Message) {
	db.set(["message.id", message.id], message)
	// So we can fetch messages
	db.set(["room.id/messages", message.roomId, message.createdAt, message.id], null)
	// So we can fetch user's current rooms
	db.set(["user.id/rooms", message.userId, message.roomId], null)

	// What changelogs are we keeping track of per-user and per-room?
}



TODO:
- the "room" repo has a list of records and a list of changes.

- the "user" repo has its own list of records and list of changes.