---

where's my coding practices doc?
UI package guidance. Reusable, minimal assumptions about the rest of the application.
Idea: future of AI is going to be ui's that have stateless transition model that's inspectable, replayable, automatable, etc.
CommandPrompt is a piece of that, but not the whole thing. Need dynamic args. Elm actions, really.

---


Your work with SyncClient and Cache seems to be running in circles a bit. I'd like you to clearly articulate the roles of both the Cache and the SyncClient. Be specific about the degree to which they are generic or task-specific. Ideally the Cache is more general purpose and works for any kind of OKV, not just a tuple OKV.

Lets discuss how this API is used from the client. In think it's important that on the client we don't hide the fact that we're working with a cache. The list() return and history() should return hit, miss OR prefix so that the application can handle those situations appropriately.

Be clear about where the reference counting happens too for subscriptions. Is that in the cache or the sync client? And where does the data fetching happen? For now, you can model all of this with React hooks.

I also want to make srue that we're being tolerant of the network. If requests fail, they should automatically retry. And we shouldn't be duplicating requests either.

So please outline this architecture in plans/sync-plan.md. Make sure to use Gemini 3 Pro to think about this.










a client syncable db should maintain the cache api with prefix partial responses.

review the previous git commit.
cleanup cache test logging.




Add the necessary apis to `src/server/server.ts` as plain express handlers. And then implement a demonstration in `src/client/App.tsx`



Files...
- QueryCache
- syncDb2
- App
- api.listAtom

Where are we now?
- There's still a lingering question of how pubsub and sync work with the cache from the client.

How does it work? Phase 1: entire db is a single transactional store.
- The server db has clock, history, and value.
- The client cache has the value.
	- keeps track of what clock version the data is on.
	- pubsub to clock, recieves history updates or refetches ranges.
	todo
	- cache writes should turn into history and be aware of the clock.

Whats after that? Phase 2: multiple stores but a single unified cache.
- client cache keeps track of stores / subscriptions as a first class concept.
	- pubsub listeners sync the specific stores
	- reference count and unsubscribe once its unused
	not sure
	- how do we subscribe to history?
	- how do we exclude indexes from sync?
		Y: its possible that we don't want to shuttle index writes around.
		N: its simple and general purpose to pass indexes around.
		N: we don't want to define an indexing language do we? Or maybe we do.
		N: we need some way for the cache to know that we have the full set of data for a specific index range.

---

Phase 1 then...

Play with gemini in making this!









// Goals... Range Tree
// - reuse this in cache.ranged
// - compute overlaps in various ways.

- lets just back up and create some demos... build the database as you go.
	- todomvc
	- chatroom
	- social app



- v1: single record with version and history. no partial sync of the record
- v2: the record is a list and you can infinite load it.
- v3: the record is an okv and you have loaded some arbitrary set of ranges.

What was that whole diversion this afternoon?
- we need to dig deep on the cache

- cache ranges could use a helper. but its actually quite specific with prefix output
- cache could use a transaction for insert... transaction uses cache... transaction can be simpler, oh wait, not really with limits.





TODO:
- cache range tree, ranges: OrderedList<Range<K>>
- cache batch insert
- cache, keep writes separate without overwriting the remote cache







- What if we model pubsub as writing to a specific subspace.
	- We can have a queue pull those off reliably and durably.
	- Or we can carve them out of the write and yolo it.



- how do we subscribe to a subset of the CRDT document (tupledb)


Help me prototype an idea...

On the server environment, we already have tupleDb `db` and pubsub.

In `sync.ts` we've prototyped a way that we can use clock, history, and value within a subspace to model a syncable CRDT. And in `syncDb.ts` I started to demonstrate how you can construct a wrapper on the server that will publish clock values...

The solution I'm looking for is going to involve a little bit of both worlds. I want to be able to specify a schema for what paths actually have this CRDT clock and which dont and handle all that logic under the hood.

For example, something like the following to tell syncDb which paths should use the crdt syncing mechanism.

const db = syncDb(baseDb, pubsub, [
	["room", _],
	["user", _]
])

There might be a better way using "collection" kinds of concepts instead. But I still want to keep things pretty unified and composable using tupledb concepts.

For example, if this were a social app, I could imagine something like

function createPost(tx, post) {
	const userDb = syncDb(tx.subspace(["user", post.authorId]))
	userDb.set(["post", post.id], post)
	userDb.set(["profile", post.createAt, post.id], post)

	for (const {key: [userId]} of userDb.subspace(["followedBy"]).list()) {
		const personDb = syncDb(tx.subspace(["user", userId]))
		personDb.set(["timeline", post.createdAt, post.id], post)
	}
}

In this model, the backend is storing all data in a single tupleDb, but we're representing users as separate syncable subspaces and fanning out writes accordingly. We still need to weave pubsub into this though, and we should only be publishing the clock values.

It's also worth noting that we may have chosen to put posts as their own independently syncable objects. All of these abstractions need to be supported.

function createPost(tx, post) {
	const userDb = syncDb(tx.subspace(["user", post.authorId]))
	userDb.set(["profile", post.createAt, post.id], null)

	const postDb = syncDb(tx.subspace(["post", post.id]))
	postDb.set([], post)

	for (const {key: [userId]} of userDb.subspace(["followedBy"]).list()) {
		const personDb = syncDb(tx.subspace(["user", userId]))
		personDb.set(["timeline", post.createdAt, post.id], null)
	}
}

On the client, things get a little trickier, but we've covered some of the basics already in `Cache.ts` and `RangeEmitter.ts`.

The client needs to keep track of what data is in the cache, what data is currently being subscribed to along with reference counting, and it needs to understand how to sync and subscribe to the clock. The entire client can have a unified sync approach though.










- Create p2p sync method with epoch counter.
- Create a full stack demo using it for a chat room.

- Toy around with some other CRDT objects/operation types.
	- Editing a message.

- Permission logic.

Renegade.Chat
Media Feed











`sync1`: When dealing with a server, a logical clock is all you need and the server will determine order. Additional benefit is you can throw away the common history because you can rely on the server history being immutable.
`sync2`: When dealing p2p, you need the entire history in order to sync because someone else can always rebase you after coming online after a few years. To sync, you need a to pass a vector clock because A might get B's edits from C if B is offline. The downside of ordering just [clock, id] is that you can end up with interleaved edits.
`sync3`: To prevent interleaving, we can represent operations as a DAG pointing to previous heads which merged them together over time.

A couple directions we can go.
-> how make sync3 more efficient using tupleDb and [number, string] for the op.key.

-> how to efficiently update so that we aren't doing a full replay. seems we should be able to inspect history.
		-> I don't love how many O(n) scans through history that we do. Seems like we can be more much incremental and thoughtful about all this. Can you analyse the performance and suggest some ways to streamline this?
-> how to expand this logic into map, array, chatroom, okv



- sync1-json.
	operations to create {} and []?




Perhaps I like the idea of having a central authority for some piece of data. If I'm sharing with someone else, then I could just be the authority and others just sync with me. That's p2p still, but don't need to deal with third-party edits syncing out of band. And it simplifies things so much, and means we don't need full history. Maybe we need some way of transfering ownership or something... but this seems fine to me.

When we use logical clocks and all that, things start to get messy. And then when it comes to applying operations during a rebase, that can also get tricky.







- how can a cycle arise from a malicious actor? can we prevent that?

Use claude code to do this experimenting. Thorough comments and explanations. Concise implementations and TESTS.
- sync1.
	- expand to [id, user] clock
	- expand to work p2p
	- expand to work as a DAG
	- expand to work with y.map, y.array, chatroom, and okv


- data layer...
	- publish/subscribe reactivity.
	- useDatabase -> tupledb package








---

time to build
- renegade chat
- feed reader app.

next up
- cleanup this code and publish it.
	- delete some things we're clearly not going to use. move stuff into gists if you want for later.
	- notes on the different branches and whats currently in there
		- create a v1 tag.
		branches
		- table -- old build system, infinite scrolling, useList
		- vite -- new build system, multi-package. heavy refactor.
		- yield-tupledb -- generator version for running sync and async with same queries. big abstraction overhead though.
	- what are some things that ought to have some unit tests? rank by highest value.
- how to actuall query the database in the README.

deploy
- how to make it really easy to deploy, docker? docker compose? subdomains.
- security updates?
- backups, monitor downtime, analytics




- after that...
	- html-editor command prompt
	- html-editor prosemirror editor + tests

- tupledb
	- nested transactions
	- lmdb implementation
	- indexeddb
	- types from tuple-database
	- recorddb/mongodb thing with lazy index generation from queries.
	- complex examples...
		- follower network
		- airtable database
	- lazy indexing, ivm... https://chatgpt.com/c/6913726e-952c-832f-8c2f-d5d1aa46c140



later
- Database things...
	- lets stick with sync for now and run with it.
	- lmdb implementation later.
	- querying with helper functions from the frontend.
	- permissions.
- client dependency injection.
	- separate the services into different contexts

- documentation and code conventions for AI agents.
- run ui with vite dev server entirely separately.

merge vite back into `table`.

- clean up a bunch of crap and merge it into `master`, revert back in `table`.
- build an rss feed reader app.


- Fix draggable list? items aren't offsetting perfectly. scroll fucks things up.


- src/command
	- client environment should separate service contexts so they'are more composable. useCommand can assume a command context but not an entire client environment.


https://www.npmjs.com/package/ai
https://github.com/samrolken/nokode/blob/main/src/tools/database.js

""" read the document at https://blog.sshh.io/p/how-i-use-every-claude-code-feature and tell me how to improve my Claude code setup


---



Codex:

To get started, describe a task or try one of these commands:

/init - create an AGENTS.md file with instructions for Codex
/status - show current session configuration
/approvals - choose what Codex can do without approval
/model - choose what model and reasoning effort to use
/review - review any changes and find issues



I want to move to using npm workspaces to manage a set of packages that can be reused elsewhere and draw definitive architecture boundaries.
None of the workspaces stuff is setup yet though so I want to start by creating packages/utils package and moving src/shares/dateHelper.ts into the utils package, and depending on that utils package elsewhere in the application.


Make sure date-fns imported elsewhere and date-fns dependencies if moved over to the other package.
Make sure the main library always dependes on whatever the workspace version is and doesn't need to be kept in sync manually. I cant remember, but its something like workspace:*


import "@utils/dateHelpers"





multi-package support. lets stick with npm for now.

ui
tupledb
packages/client
packages/shared
packages/server

Maybe later we can break things down more...

packages/schema
packages/api-server
packages/file-server
packages/pubsub-server
packages/queue-server

Some goals here...
- packages/ui can be reused elsewhere. it contains useful components, style, and toolkit demos
- packages/tupledb can become tuple-database v2 one day, extracting it from shared.
- We no longer need to check for dependency issues between client and server, its explicit in package.json
- We can create parallel websites / desktop app / projects without polluting everything else.


Use Vite for build system? Seems fast and slick




---
branch: table	x

AirtableDemo
- RecordDb tableless

if we have resizable columns, then rows may as well be flex so i can select a row easier.


prosemirror-examples#editor


Make an editor now... Mobile UX.
Database editor thing...








Email: https://www.notion.so/chetcorcos/Email-App-Comms-Design-Doc-1c88d4136624801083dfc1cd0c9d0465?pvs=4



Need to figure out the command prompt for integrating keyboard shortcuts.

Prosemirror editor?
popper with scroll vs my custom popup solution.

update prosemirror
update react

dragAndDrop.e2e-test.ts
test harness stuff
context menu


- [ ]  Command Prompt
- [ ]  Prosemirror Editor
- [ ]  Context Menu
- [ ]  Popup
- [ ]  E2E test + test harness
- [ ]  Email



Email demo
More general recordDb with table indexes.




- ContentEditableInput demo page.
- DateTimeInput doesnt work.




- prosemirror better contenteditable input that can stretch.

- RecordDbDemo, create and modify schemas, create and modify records.
- load up the email schema... migration files

- better prompt spreadsheeet thing.
- email demo
- recorddb with more generalize listeners -- table is an index.
-

- t.is(dataTyep) is annoying recursion inference.
- parseDate coersion
- fuzzy match allow camelCase matching in the middle.



- how to modify schema from the client?
	writeSchema api.

- LocalDb api which wraps both the cache and the api. That way we can explicily subspace and pass
  the localDb to hooks like useList(db.subspace(["blah"])).

New React -> no more passthroughRef
LeftPanelLayout show -> optional

- Better convention for index names?
- commit -> finalize/rollback
- dataType recursive serialization.



- Continute the EmailDemo and make it work...
-




Prompt demo with recordDb...
OKVDatabaseDemo -- call it tupleDbDemo -- truncate the value and popup a larger editor when clicking on it. Make it a JSON editor?

- What to do about `transact` for recordDb
- RecordCache.
	- needs to expose the whole list for optimistic indexing
	- separate listCached function for rendering
	Previous thinking...
		- write vs finalize
		- list vs listCached
		- useWrite -> useTransact
			Async commit commit?
- Schema for the cache is defined locally
	- validation mode: "strict", "optional", "none"
- what was that blog post asking for this kind of database?
	https://buttondown.com/jaffray/archive/its-time-to-stop-building-kv-databases/





Fun in the meantime:
- rich editor
- notebook app
- airtable app

Solve later:
- clearing the cache
- realtime sync
- offline mode/sync
- change log history


Sowell...
The real goal right now -- collect a list of thing to listen to.
- simple cli tool for looking at a tupledb.
- better prefix search syntax.
- util.inspect OKVDatabaseDemo for showing the value because it could be huge!
- qustions / tools -- can I pluck out certain variables
- use AI to fetch more data and populate new columns
- categorize links based on their subheading.


---


Back to the frontend?
- EmailDemo
- TableViewDemo


Sometime
- Datalist - drag and drop multiselect
- how does backend reactivity work (one day).


- "To:" input. Multi-select without the popup.
- schema and indexing tools for frontend and backend.
	- frontend, we want json and tuples, for indexing no less.
	- transmitting serialized queries means we don't have to worry about min/max symbol issues
	- backend, we want json and tuples for verifying permissions and stuff mostly.


- Move old apis to list2, write2, etc...






- database layers...
	- backend `Base<string, string>`
		We can use low-level tools to list and write here, but that's just for debugging and stuff.
		- `OKV<any[], any>` is the tuple database with convenient functions.

	- frontend cache
		handles prefix ranges, inserting, etc.
		has conveniences for subspace, prefix, etc, as well
		handles indexing primary records.
		has reactivity model for frontend stuff.

	- backend reactivity.
		this system can be separated so that we can eventually use something more scalable later.



- start with UI stuff.
	brutal design to start. layers, generic stuff.
- database model to make it work.
- later: auth



Branches
- table: raw database stuff, grid, etc.
- comms: going full email demo and ripping things down.






- email demo. spreadsheet demo. airtable demo. master detail...
- airtable, contacts, ai spreadsheet, chat app, Notion 3.0


Email records -> email indexes.

I need to think harder about constraints and what this database is not.
You can't build all of these abstractions while maintaining all of the behavior for a general system.

I can always return to some of these previous things. But lets move forward with more conviction.

Assumptions:
- Tuple keys and json values
- Use ranges for schema enforcement
- Use ranges for indexing

- when fetching data, we need to think about primary vs secondary indexes...
	- the cache doesn't really need to know that though. we can't be confident what index ranges currently exist without fetching it.
	- the real benefit is just that we have optimistic updates hitting the index.




TODO: query for batch fetching from the client
TODO: indexing for the client
TODO: basic schema enforcement.




SOMETIME: Pull the sugar out of the api, and put it back in with something else...
- `list` and `write` are the only methods.
- `get`, `set`, `delete` and `prefix` are all just sugar.





Challenge: I want to encode / decode at the boundary of the api. I think the database needs to carry that encoding around.


- `query` and `index` functions get all the sugar so that they don't have to import anything.
	- transaction so that we can batch up reads for query, and writes for index.

- better concept for `cache` / `transaction` that can abort.
	- local cache is separate concept from transaction. need a transparent cache abstraction as well
	- reactivity should also be independent of caching




We need a better understanding of where we're going to bail on text-based and jump to tuple/json.
Indexing seems to require tuple layer...
And for indexing to persist, we need the codec on the data side too.

TODO: Can we have different encodings for different subspaces? we should!
NEXT: lets consider some optional schema enforcement.



Think about where to go next with the database to make it actually usable in an app, but don't get carried away.

what are we working towards?
- database, caching, reactivity, indexing
	Don't get too carried away... right now, we just want some indexing and batch query capability for the frontend.


- notebook, calendar, notion 3.0




- integrated automatic indexing.


Email demo UI polish
Email demo -> just create the email and let the indexers work.
Reactivity across browsers



- Database things...
	indexing frontend and backend... with javascript? Not tht



- UI library
- [ ]  ai spreadsheet. All in memory. Just make the UX good.


- Obsidian demo. Flat list of docs, property values
- Email / comms demo.

What do I actually need right now though? Nothing really, right?

Maybe we just play around with prosemirror in the meantime. Infinite notebook...

- [ ]  Vm for querying with JS
- [ ]  Secondary indexes can be JS too. They don’t need to be algebraic
- [ ]  SQL interpreter. YOLO style. When trying to just answer a question. Doesn’t use indexes though because indexes aren’t algebraic (yet?)
- [ ]  Build a contacts app as an example. Without imports
- [ ]  Build comms as an example
- [ ]  Build blog / social network
- [ ]  Build Notion 3.0 / aortable


Work in progress
- PrompMap -- needs good UX
- TableViewDemo2 -- proper structure of one database table for all


# Thinking





Keep going on PromptMap spreadsheet.
Make the UX better. Persist it somewhere.
Import raw data and extract it into structure -> Contacts,

WebWorker for frontend query: https://chatgpt.com/c/67c8d23d-8880-800b-942b-a4af1d4d2e0c







query vm on the backend...
now we need to execute that query on the frontend against the cache

Move forward with creating the Airtable AI example...
Filter/sort on the frontend.

Importers
Indexing




Near term goal - AI auto-complete for tables! Plants, calendars, etc. -> Airtable again.


https://www.notion.so/chetcorcos/Airtable-Data-Model-1988d413662480b09c01d38f101942a2?pvs=4


- Import Apple Contacts, Twitter, Instagram, LinkedIn, Facebook, Google
- Use AI to deduplicate it all.
- Create custom schemas and indexes
- JSON vs TXT debate!

- What is the minimal amount of work to replace SQL...
	- Need to think about query language for specifying indexes.

TXT is for raw data
Use AI to convert into a JSON schema.

JSON indexing style...
examples...
- contacts
- chat app
- twitter
- airtable filters.




# Todo

- database improvements
	- JSON value assumption?
	- tuple key assumption?
	- indexing logic




- schemas themselves are records, the list is just a preferential order.
	- creating new schemas should not have to be added to the list directly, so fetch both and merge.
	- eventually, we want to be able to query and fetch nested queries to avoid the waterfall.

- datalist drag multiple selection to move around.

TableView...
- list of schemas
- configure schemas
- select rows
- select cells
- copy paste
- import
- export
- AI autofill

...

- complex indexing
- prosemirror document editor
- ...

---

examples:
- messaging app
- contacts app
- comms app
- photo app
- social network
- music player




- context menu?


Experiment with different kinds of lists.
1. Fractional indexing
2. Linked list
3. JSON array in a single object



Start simple... Airtable schemas, isolated databases, AI autofill.
Later... generalize data types, complex indexing, querying the whole global database.



Game plan...
We need to do some designing...
Primary records vs indexes
Airtable demo
AI autofill
schema editor. VCard -> property, lenses?





- What to build next?
	- Airtable-like database
		- Start with a simple table view and a fixed schema
		- AI autofill for plant database
		- Build new schemas that map onto views
		- Import JSON data from Twitter
		- Import Contacts data
	- Notion 3.0
		- prosemirror document
		- link to other pages
		- property values for pages
		- embed a view that queries pages





- Create a better list component that abstracts things away.
- Use ProseMirror to start messing with property value stuff.


- More filing cabinet examples...
	- Main docs
	- Indexes, triplestores

- Notion-like demo with plain text properties
- Contacts app
- Contacts syncing? Import other data?
- Some basic weather station graphs

- Airtable thing...
	- Plant database.







- Later...
	- cache eviction on unsubscribe
	- how to prevent remote updates from clobbering optimistic writes
	- realtime sync between clients.


- Clean things up
	- CustomDatabaseDemo
	- MasterDetailDemo
	- OKVDatabaseDemo
	- OKVListDemo
	- PlantDatabaseDemo
	- RawDatabaseDemo
	- TableViewDemo


- useDatabase / Cache









- backend is an ACID OKV
- raw database layer
	- key: value
	- "views" for key
	- "views" for json object
	- prefix search
	- every client edit does a round trip to the server
	- client cache does not persist
	- pub/sub for every key, but it doesnt assume anything about the data (no version key, etc.)
	- should work just fine for local / online apps.

- using lexicodec as a tuple layer
	- helpers for key subspaces, keyspaces

- using some transaction helper functions to..
	- maintain aggregations (e.g. count)
	- build interval trees for subscriptions
	- build prolly trees or other potential sync ideas

- application database layer
	- this is the `app` subspace. lots of other stuff is tucked away from the user.
	- app records are json, {id, version, ...}

- collaboration / consistency assumptions
	- every record gets an incrementing version
	- clients submit write operations, simplest are get/set.
	- operations are submitted transactionally on the server and optimistically on the client
	- last-write-wins, record version increments
	- pub/sub key version

open questions
- is global transaction counter useful?
	it could be nice for client-side writes. but this probably isn't fundamental to the database.




## To Do - TableDemo


- database things...

high level idea...
objects can be anything.
properties are parsers of those objects / json paths.
filters / queries are indexes


- getting started

lets not invent anything new from scratch.
build a notion database

- alternatively

lets dig into the filing cabinets system more.
how do we create rules for querying?




What do we build next?
- ai features for plants
- text editor Notion 3.0 style
- filters
- local caching, subscriptions, realtime
- activity updates menu

What to do with it?
- contacts orm. apple, google, twitter, linkedin
- social posts, feed, inbox. twitter, instagram, RSS
- smart home. basic controls
	- sprinkler controller
	- view weather station data
- Notion 3.0 notes and stuff.
- Plant guild designer.
	- data generator








- CustomDatabaseDemo -> MasterDertail
- primary key vs indexing
- list reordering



- custom database view...
	- define schemas
	- object forms based on schemas
	- rules / indexers
	- somehow map vcards into my custom format


- import more data
	- google contacts
	- twitter followers
	- liked tweets
	- my tweets


- value views...
	- vcard view
	- link view
	- json data view
	- document view





- RawDatabase that just shows `<string, string>`. Resize columns. Virtual rendering. Edit, save, and refetch. Custom views (tuple keys, json data)
- LocalDatabase that incorporates local caching and reactivity
- Maybe... Interval tree / aggregation / merkle / linked list abstractions. Airtable style view.



- Improve RawDatabase. It's all `string,string` key values with plain text editing. Lets use flexbox and layout.



TableDemo subscription stuff... with useKeyValue
- need to think about encoders for key-values now. server and api are all `<string, string>`. But locally is... anything. Could use tuple keyspace, could use json value. lets not make assumptions though.
- Think about how to do TableDemo api.list query and reactivity
- Think a little bit about suspense and how to make it less annoying




- need a local database with loader subscription caching stuff.
- need interval tree for local subscriptions?
	- or can we do it all with just key-values?

- edit schema name
- edit a cell
- select cells only once dragging

- edit cells in the table
- edit the property types
- edit column widths
- edit row heights


- better suspense flickering
- remove selection when clicking away
- context menu
- re-order columns
- rename each schema



- plant database schema and customization.
	- schema
	- view
		- custom column sizes


- import data on the backend and render it on the frontend
- customize schema
- ai cell completion
- guild designer



- custom row/column sizes?
	- cell measurer, https://github.com/bvaughn/react-virtualized/blob/master/source/CellMeasurer/CellMeasurerCache.js

No offline. No realtime.


- import a bunch of data.
	- plant database data.
	- voter file with lots of rows and columns...
	- apple, google, twitter, facebook

- node.js lmdb -> https://www.npmjs.com/package/lmdb












- cleanup
	- query fnCall stuff could be a bit more streamlined.





- modify json value objects etc.


- drag to re-order rows and columns
- click cell to edit
- click header to edit
- copy / paste





Transaction ids are an incrementing number and are stored in a log.

Ideas and assumptions:
- tuple keys and json values
- an object is just {[key: string]: string | number | boolean}
- transaction operations set and delete keys on the the json objects.
- transactions ids are just an incrementing number.
- missing data will throw a promise like suspense.

We can easily extend this to file storage or localstorage...


- Table editor
- data-type-ts needs to have a serializable format.







- Design components
	- form
	- input


	- calendar
	- tokeninput

	- date format
	- json editor
	- table

- sidebar search should let you arrow around to select and item.
- Shortcut to search / jump to a different design file.
- Shortcut to show / hide the sidebar.
- Various demos...
- Infinite loading list from the server.




- plant database with guild designer!


```ts

type Property =
	{type: "string"} | {type: "number"} | {type: "boolean"} | {type: "select", options: string[]}

type Schema = {[key: string]: Property}

type Row = {id: string, [key: string]: string | number | boolean | undefined}

// The view needs a sort, use fractional indexing.

type Db =
	{key: ["database", string], value: Schema}
	{key: ["database", string, string], value: Row}



```





## Plants
Snap peas
Kale
Persian Cucumber
Peppers
Squash
Watermelon
Strawberry
Bird of paradise (giant and small)
Fan palm
Giant fishtail palm
Tree fern
Fern
Sunshine Mimosa
Banana
Date palm
Inca berry
Lemon grass
Guomi Berry
Jerusalem Artichoke
Yerba Mate
Persimmon
Common Lippia
Coyote Brush
Narrowleaf Milkweed
Showy Milkweed
Island Bush Snapdragon
California Lilac
Chuparosa
Cardinal Flower
Tulip tree
Ponytail palm
Chinese Pistache
Yoshino Cherry
Jacaranda
Li Jujube
Spice zee nectaplum
Aloe
Silver Bush Lupine
Mexican sunflower (not nitrogen fixing though)
Chinese pistache
Saucer (tulip) magnolia
Southern Magnolia
Western Redbud
Ornamental purple-leaf plum
White Dogwood
Maximillian’s sunflower — native, drought tolerant
Tibouchina urvilleans - Princess Flower
Saucer magnolia
Desert Museum Palo Verde (no spines)

## Presidents

George Washington
John Adams
Thomas Jefferson
James Madison
James Monroe
John Quincy Adams
Andrew Jackson
Martin Van Buren
William Henry Harrison
John Tyler
James K. Polk
Zachary Taylor
Millard Fillmore
Franklin Pierce
James Buchanan
Abraham Lincoln
Andrew Johnson
Ulysses S. Grant
Rutherford B. Hayes
James A. Garfield
Chester A. Arthur
Grover Cleveland
Benjamin Harrison
Grover Cleveland
William McKinley
Theodore Roosevelt
William Howard Taft
Woodrow Wilson
Warren G. Harding
Calvin Coolidge
Herbert Hoover
Franklin D. Roosevelt
Harry S. Truman
Dwight D. Eisenhower
John F. Kennedy
Lyndon B. Johnson
Richard Nixon
Gerald Ford
Jimmy Carter
Ronald Reagan
George H. W. Bush
Bill Clinton
George W. Bush
Barack Obama
Donald Trump
Joe Biden
Donald Trump

## Philosophers

Socrates
Plato
Aristotle
Confucius
Laozi
Buddha (Siddhartha Gautama)
Zhuangzi
Mencius
Epicurus
Seneca
Cicero
Augustine of Hippo
Thomas Aquinas
Avicenna (Ibn Sina)
Averroes (Ibn Rushd)
Maimonides
Niccolò Machiavelli
René Descartes
Thomas Hobbes
Baruch Spinoza
John Locke
Gottfried Wilhelm Leibniz
George Berkeley
David Hume
Jean-Jacques Rousseau
Immanuel Kant
Georg Wilhelm Friedrich Hegel
Arthur Schopenhauer
Søren Kierkegaard
John Stuart Mill
Karl Marx
Friedrich Nietzsche
William James
Bertrand Russell
Ludwig Wittgenstein
Martin Heidegger
Jean-Paul Sartre
Simone de Beauvoir
Michel Foucault
Noam Chomsky

## Minivans

Toyota Sienna
Honda Odyssey
Chrysler Pacifica
Kia Carnival
Chrysler Pacifica Hybrid

##