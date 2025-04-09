import { codec } from "./Codec"
import { tupleSugar } from "./OKV"
import { rangeContains } from "./Range"
import { BaseOKV, ListArgs, OKV, TupleDb, WriteArgs } from "./types"

export type Index<K = any[], V = any> = {
	id: string
	order: number // secondary indexes are 0, tertiary indexes are 1.
	range: ListArgs<K>
	set: (db: OKV<K, V>, key: K, value: V) => void
	delete: (db: OKV<K, V>, key: K) => void
}

export type SerializedIndex<K = any, V = any> = {
	id: string
	order: number // secondary indexes are 0, tertiary indexes are 1.
	range: ListArgs<K>
	set: string
	delete: string
}

export type IndexableBaseOKV<K, V> = BaseOKV<K, V> & {
	createIndex(index: Index<any, any>): void
	deleteIndex(id: string): void
}

function reifyFn(fn: string) {
	return new Function("return " + fn)()
}

export function Indexable(base: TupleDb) {
	const db = tupleSugar(base)

	const write = (args: WriteArgs<any, any>) => {
		const indexes = db
			.prefix(["_index"])
			.map(({ value }) => value as SerializedIndex)
			.map((index) => {
				return {
					...index,
					set: reifyFn(index.set),
					delete: reifyFn(index.delete),
				} as Index
			})
		indexes.sort((a, b) => a.order - b.order)

		// Remove from top down.
		indexes.reverse()
		for (const index of indexes) {
			for (const { key } of args.delete ?? []) {
				if (rangeContains(index.range, key, codec.compare)) index.delete(db, key)
			}
		}
		for (const { key } of args.delete ?? []) {
			db.delete(key)
		}

		// Add from bottom up.
		for (const { key, value } of args.set ?? []) {
			db.set(key, value)
		}
		for (const index of indexes) {
			for (const { key, value } of args.set ?? []) {
				// TODO: need the codec for Max symbol, etc.
				if (rangeContains(index.range, key, codec.compare)) index.set(db, key, value)
			}
		}
	}

	const idb: IndexableBaseOKV<any, any> = {
		compare: db.compare,
		list: db.list,
		write: write,

		createIndex(index: Index<any, any>) {
			for (const { key, value } of db.list(index.range)) index.set(db, key, value)
			db.set(["_index", index.id], {
				id: index.id,
				order: index.order,
				range: index.range,
				set: index.set.toString(),
				delete: index.delete.toString(),
			})
		},

		deleteIndex(id: string) {
			const index = db.get(["_index", id])
			db.delete(["_index", id])
			for (const { key, value } of db.list(index.range)) index.delete(db, key, value)
		},
	}
	return idb
}

/*

Goals:
1. Generate indexes
2. Query more than one object at a time.


JSON indexing style...
examples...
- contacts
- chat app
- twitter
- airtable filters.


[$.last, $.first, $.id]
[-$.age, $.id]
[$.location, $.id]


For now, there's no filtering - you achieve that with a scan...

$message.thread_id = $thread.id
[$thread.id, -$message.created_at, $message.id]

We can start by supporting equality first.

We can use that for simple "tables" like you get with SQL.

$.table = "person"
[$.id]

And for twitter...
Set includes comparator.

$me.follows[*] = $y.id
$post.author_id = $y.id
[$me.id, -$post.created_at, $post.id]

Now, what if in a more general larger example, the follows are tracked in a separate table where the primary key is compound [from, to]

$follow.id[0] = $from
$follow.id[1] = $to
$post.author_id = $to.id
[$from.id, -$post.created_at, $post.id]

The syntax here is getting strained now... If we wanted to do a second order list.
$follow.id[0] = $from
$follow.id[1] = $follow2.id[0]
$follow2.id[1] = $to

$from and $to are themselves ids. Maybe we need to $($from) to get the object from the id.

$follow.id[0] = $from_id
$follow.id[1] = $to_id
$post.author_id = $to_id
[$from_id, -$post.created_at, $post.id]

Lets find an example where we need to do this.
Maybe a list of my friends by name

$follow.id[0] = $me_id
$follow.id[1] = $to_id
$to.location = "San Francisco"
[$me_id, $to_id.name, $to_id]

We need a better way of resolving this syntactically. Maybe an $variable is just assumed to be an id when we ask for a property from it.

Can we use this for permissions as well?


The other thing to consider here is just fetching a set of objects in one network request.

list[*] = $item
[list, $item.id]

Example:
[$.last, $.first, $]

gets normalized to:

filter:
	$a.last = $b
	$a.first = $c
sort:
	[$b, $c, $a]

gets parsed as:
{
	filter: [
		[{var: "a"}, ["last"], {var: "b"}],
		[{var: "a"}, ["first"], {var: "c"}],
	],
	sort: [
		{dir: "asc", {var: "b"}},
		{dir: "asc", {var: "c"}},
		{dir: "asc", {var: "a"}},
	]
}


=====================================================================

Example: descending sort

[-$.age, $]

gets normalized to:

filter:
	$a.age = $b
sort:
	[-$b, $a]

gets parsed as:
{
	filter: [
		[{var: "a"}, ["age"], {var: "b"}],
	],
	sort: [
		{dir: "desc", {var: "b"}},
		{dir: "asc", {var: "a"}},
	]
}

=====================================================================

Example: deeper path
[$.profile.name, $]

gets normalized to:

filter:
	$a.profile.name = $b
sort:
	[$b, $a]

gets parsed as:
{
	filter: [
		[{var: "a"}, ["profile", "name"], {var: "b"}],
	],
	sort: [
		{dir: "asc", {var: "b"}},
		{dir: "asc", {var: "a"}},
	]
}


=====================================================================

Example: array indexing
[$.color_preference[0], $]

gets normalized to:

filter:
	$a.color_preference[0] = $b
sort:
	[$b, $a]

gets parsed as:
{
	filter: [
		[{var: "a"}, ["color_preference", 0], {var: "b"}],
	],
	sort: [
		{dir: "asc", {var: "b"}},
		{dir: "asc", {var: "a"}},
	]
}


=====================================================================

Example: star index

[$.tags[*], $]

gets normalized to:

filter:
	$a.tags[*] = $b
sort:
	[$b, $a]

gets parsed as:
{
	filter: [
		[{var: "a"}, ["tags", {star: true}], {var: "b"}],
	],
	sort: [
		{dir: "asc", {var: "b"}},
		{dir: "asc", {var: "a"}},
	]
}

=====================================================================

Example: filter and sort.

$message.thread_id = $thread
[-$thread.replied_at, $thread, -$message.created_at, $message.id]

gets normalized to:

filter:
	$message.thread_id = $thread
	$thread.replied_at = $replied_at
	$message.created_at = $created_at
sort:
	[-$replied_at, $thread, -$created_at, $message.id]

gets parsed as:
{
	filter: [
		[{var: "message"}, ["thread_id"], {var: "thread"}],
		[{var: "thread"}, ["replied_at"], {var: "replied_at"}],
		[{var: "message"}, ["created_at"], {var: "created_at"}],
	],
	sort: [
		{dir: "desc", {var: "replied_at"}},
		{dir: "asc", {var: "thread"}},
		{dir: "desc", {var: "created_at"}},
		{dir: "asc", {var: "message.id"}},
	]
}

=====================================================================

Example: twitter timeline, follows array

$me.follows[*] = $y
$post.author_id = $y
[$me, -$post.created_at, $post]

gets normalized to:

filter:
	$me.follows[*] = $y
	$post.author_id = $y
	$post.created_at = $created_at
sort:
	[$me, -$created_at, $post]

gets parsed as:
{
	filter: [
		[{var: "me"}, ["follows", {star: true}], {var: "y"}],
		[{var: "post"}, ["author_id"], {var: "y"}],
		[{var: "post"}, ["created_at"], {var: "created_at"}],
	],
	sort: [
		{dir: "desc", {var: "created_at"}},
		{dir: "asc", {var: "me"}},
		{dir: "asc", {var: "post"}},
	]
}

=====================================================================

Example: twitter timeline, follows key

$follow.id[0] = $from
$follow.id[1] = $to
$post.author_id = $to
[$from, -$post.created_at, $post]

gets normalized to:

filter:
	$follow.id[0] = $from
	$follow.id[1] = $to
	$post.author_id = $to
	$post.created_at = $created_at
sort:
	[$from, -$created_at, $post]

gets parsed as:
{
	filter: [
		[{var: "follow"}, ["id", 0], {var: "from"}],
		[{var: "follow"}, ["id", 1], {var: "to"}],
		[{var: "post"}, ["author_id"], {var: "to"}],
		[{var: "post"}, ["created_at"], {var: "created_at"}],
	],
	sort: [
		{dir: "asc", {var: "from"}},
		{dir: "desc", {var: "created_at"}},
		{dir: "asc", {var: "post"}},
	]
}

=====================================================================

Example: variable in path.

$view.group_by = $c
$object[$c] = $value
[$view, $value, $object]

gets normalized to:

filter:
	$view.group_by = $c
	$object[$c] = $value
sort:
	[$view, $value, $object]

gets parsed as:
{
	filter: [
		[{var: "view"}, ["group_by"], {var: "c"}],
		[{var: "object"}, [{var: "c"}], {var: "value"}],
	],
	sort: [
		{dir: "asc", {var: "view"}},
		{dir: "asc", {var: "value"}},
		{dir: "asc", {var: "object"}},
	]
}

=====================================================================




*/
