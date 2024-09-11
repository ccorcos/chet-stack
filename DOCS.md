# Overview

## Organization

This is a monorepo, client is for the web frontend, server is the backend, shared are used by both, and tools are for commandline scripts and stuff.

The code is organized such that no files produce any side-effects when they are imported except the entry files: `server/server.ts` and `client/index.ts`. All side-effects (which includes state) begins from one of these entry files and gets bundled up into an `environment` variable that gets plumbed throughout the application for dependency injection.

## Build system

`npm start` will start everything up for development and serve on `http://localhost:8080`.

`src/tools/build.ts` will move files into the `build` directory and uses estrella (which uses esbuild) to bundle everything together.

We are using the `autoindex` package to generate `autoindex.ts` files which make it as simple as creating a file to create and wire up a new API endpoint.

## Backend Overview

The `server.ts` currently does everything in a single process. We're using some common off the shelf libraries here:
- `express` for http requests
- `helmet` for CORS and other security related defaults
- `morgan` for request logging
- `livereload` for development

Then we start booting up our different services.
- `services/ServerConfig.ts` is a set of configurations and secrets for the server, some of which come from the environment variables or cli arguments.
- `services/Database.ts` is currently just a JSON file.
- `services/QueueDatabase.ts` handles state for batch jobs, currently using `tuple-database`.
- `services/PubsubServer.ts` is a simple websocket server for realtime updates.

We bundle all of that up into something called the `environment` which can get passed around throughout the application. This is a really simple pattern dependency injection and avoids the nightmare of circular importants that happens when you can import a database connection directly from a file.

Next, we start booting up the rest of the server.
- `FileServer.ts` is for uploading and serving files, similar to S3.
- `QueueServer.ts` is for executing batch jobs.
- `ApiServer.ts` is for serving the website assets and serving the api.

The currently implementations here are meant to be illustrative. You can totally use a JSON file as a database especially at the beginning! And running your entire application in a single process immensly simplifies the process of developing and deploying your application. But there are obvious improvements to be made as the project matures. Here are some things to consider:
- [ ] server config should not have secrets inlined – they should be loaded from a gitignored file.
- [ ] use SQLite or Postgres for the Database and QueueDatabase.
- [ ] swap out the PubsubServer for Redis.
- [ ] swap out the FileServer for S3.
- [ ] added Memcached in front of the database.

## Data model

All record types can be found in `shared/schema.ts`. Every record has an id and a version property that are crucial for how realtime sync works.

`apis/getRecords.ts` is the simplest read path. The client can request records using a `RecordPointer` which is the `{table, id}` of a record.

When we fetch a record from the database, we also want to fetch any other records necessesary to compute whether the user has permission to read the record. These are called an "permission records" and `loadRecordsWithPermissionRecords` does that for us.

When we gather all of these records and their permission records, we collect them in a structure called a `RecordMap`. We're going to use record maps all over the place so get used to it. It's just a nested map of `{table: {id: record}}`.

Once we've gathered all the records and permission records into a recordMap, we use `filterRecordMapForPermission` from `validateRead.ts` to make sure we aren't sending users any data that they don't have access to.

On the write side of things, everything happens through `apis/write.ts`. The client works offline and has optimistic updates, so all writes are represented as a set of operations in a transaction. You can read more about the different operation types in `shared/transaction.ts` but basically, you can set nested keys on an object, and you can add/remove elements from a list. As with most systems, a request can happen more than once, so one thing we enforce is that every element in a list must be unique. That way we don't have problems with inserting something twice.

Before we write anything, we fetch all the records that are being written to along with their ancestors. Then we clone the recordMap and apply all of the operations which mutates the record. Then we validate the user's write permission by comparing the recordMaps.

Every time you apply an operation, it increments the version number of the record by one. Before applying the new operations, we record the version of the record and assert that version is in the database transactionally on write. This ensures that there were no concurrent writes! If there was a concurrent write to the same record, then the transaction will get rejected and retried. The convergence strategy here is called last-write-wins (LWW).

Lastly, we will publish version updates for any records that were updated. When a client received an update, they only fetch the record if their local version is less than the published version number. We also publish updates on some other channels that complement queries other than getRecords.

## Authentication

Auth is really simple. Passwords are hashed using `scrypt`, an auth token is just a random uuid that we drop as a cookie in the browser. It's important to use a secure http-only token to offer protection from a cross-site scripting attack. We also set a userId cookie so that the user knows they're logged in with the given userId. Check out the `apis/login`, `logout`, and `signup`.

## Client

The client starts at `src/client/index.html` which references `index.css` and `index.ts`.

The CSS strategy is really simple – inline styles with some CSS variables for dark mode and utility classes.

Similar to the server, the `ClientEnvironment` is a dependency injection pattern so that no files have an side-effects when you import them other than `index.tsx`. There's a bit more going on in the ClientEnvironment.

`Router` manages client-side HTML5 routing. It's important to call `environment.router.navigate` rather than setting `location.url` so the page doesn't reload every time you navigate.

The `environment.api` uses a proxy along with the api argument types so that you can call api endpoints as if they're just an async function. For example `api.getRecords(...)`.

The `RecordCache`, `RecordStorage`, and `LoaderCache` are all closely related. The `RecordCache` is an in-memory client-side database. For the most part, it's just a recordMap of all the records along with the ability to listen for changes. Additionally, you might index those records in order to get the results of more complex queries.

RecordStorage is very similar to the RecordCache but persists records for offline use, currently using IndexedDb. The LoaderCache is only really necessary because we're using React Suspense. The LoaderCache keeps track of what requests are loaded / currently being loaded.

`src/client/loaders/loadRecord.ts` is where we call `api.getRecords` but there's a bit more going on. First we check the LoaderCache if we're already loading a given record. Otherwise, we create a new loader. We attempt to find the record the RecordCache, if its not there we'll fetch the record both from RecordStorage and from `api.getRecords` and load those records into the RecordCache. Note that we'll only keep the record with the highest version between the results from RecordStorage and the api. It's possible for RecordStorage to have a much higher version if you're coming online and haven't sync your offline changes yet. This strategy is called stale-while-revalidate (SWR) is is a pragmatic way to create an offline experience without having to download the entire dataset to the client.

The `useRecord` hook is how you get a record from within a React component. This is what calls loadRecord and sets up the appropriate listeners. This is also where we subscribe for updates from the pubsub service.

Back to `index.tsx` and going through the environment stuff...

The `SubscriptionCache` is a reference counter on what records React is currently subscribed to. We also have a delay when a component unmounts and unsubscribes so that we keep the records around a bit longer in case we need them again soon. Currently, that delay is 10s but it would be reasonable to bump that up to around 2 minutes. This way the user can bounce around and things will be snappy when they return to where they were because everything is still loaded in memory. Through the SubscriptionCache, we will subscribe to version changes through `environment.pubsub`, and when a record is finally unsubscribed after a delay, we'll unload that record from the RecordCache and the LoaderCache freeing up memory.

The `environment.pubsub` is a websocket client where we primarily subscribe to record versions. When the connection starts, we get all of the records we're listening to from the SubscriptionCache and subscribe. When we recieve an update from the server, if the version is larger than the one we have in the recordCache, then we'll fetch the new record and put it in the cache and store. This is how realtime updates works!

The `transactionQueue` is a simple queue of transactions that need to be submitted to the server. When the user is offline, these transactions are saved to localStorage until the user is back online. The transactionQueue also handles retrying transacitons when there's a concurrent write conflict. You shouldn't touch the transactionQueue much though – you should use `client/actions/write` whenever you want to submit a transaction.

Write does just a couple basic things. It will invert all of the operations and push them onto the `environment.undoRedo` stack enabled undo/redo support. It also applies the operations to the local records to optimisically write the change. This way, edits appear immediately to the user. If you want to display is a record has a pending write, you can use the `useIsPendingWrite` hook.

For offline mode, we have a service worker that caches assets offline. This service worker implementation is not typical though and has some trade-offs. Most service workers will always serve the cached version while it loads the new version. This means that the user ALWAYS sees an app one version ago and that's annoying, especially for development or when you deploy a bug that needs to get reverted as quickly as possible. This implementation will always attempt to fetch the latest assets over the network and fallback to the old assets when offline. This means that the user will always get the latest version of the app when online. The downside is that if you have slow internet, the app will load slowly which can be really frustrating and not a final solution.
- [ ] one option is to add a timeout so that we serve the cached version if the networking is taking too long to load.
- [ ] eventually, as the codebase stabilized, it would make sense to move to a typical implementation that always uses the cached assets.

All that's left in `index.ts` is to render the React app by rendering the appropriate routes.

The `<App/>` component is where most of the app lives. We're using React Suspense for loading data.

The `/design` route and the `<Design/>` component are meant to be a playground for prototyping things. In `components/Design.tsx` you'll see examples of how to use a `<Popup/>`, `<ListBox/>`, `<Combobox/>`, etc.

ListBox and Combobox are good examples of how to manage browser focus and keyboard shortcuts. `useShortcut` is a tool for creating global keyboard shortcuts, but when you only want to enable those shortcuts in specific circumstances, then this hook can get unwieldy. Instead, you should try to rely as much as possible on browser focus and event propagation.

## Testing

There are two kinds of tests.

`npm run test:unit` will run unit tests – any file that ends in `.test.ts` – using Mocha. Check out `base.test.ts` to see what a simple unit test looks like. You can copy this file to make new test in another file. Note that you actually need to import from `mocha` which prevents test types from polluting the rest of the project.

`npm run test:e2e` will run end-to-end browser tests – any file that ends in `.e2e.ts` – using Playwright. Check out `base.e2e.ts` to see how end-to-end tests work.

# Philosophy & Trade-offs

> A good architecture is one that can accomodate changes in requirements easily.
> – Uncle Bob's Clean Code Lectures

## Why a boilerplate instead of a framework?

There are many different ways of answering this.

Frameworks are good at coupling everything together. They hide complexity from the developer making it easy to get started. They have powerful and concise abstractions and are often easily deployable to platform-as-a-service companies.

The downside of using a framework is that all of your problems are coupled together too. When you find that you want to do something that the framework can't do, you'll have to work around the issue, creating an ever bigger mess that only locks you in more.

This boilerplate is designed to be as decoupled as possible. All of these abstractions can change and evolve to suit your needs. Simple, lean, and powerful. The downside to using a boilerplate is that you need to understand how everything works to use it productively. But using a boilerplate like this means that your betting on your own capabilities to understand everything and build whatever you need. You get to solve problems in terms of big-O instead of "does the framework let me do this?".

It's a lot like the difference between GarageBand and Abelton – you really need to read the manual in order to use Ableton, but it's so much more powerful and if you want to be a pro, you'd better start learning Ableton.

I also hope to demonstrate with this project that creating an application from scratch with all of the bells and whistles of *[name your favorite framework]* is not as hard as you might expect.

## Why TypeScript, Node.js, Express.js, React, Mocha...

Building with a single language is so nice. You can write the same code that runs on both the client and the server! Building on web technologies means you can deploy to every major platform: browser, desktop, and mobile.

Whenever you build something, think about how you build it in terms of a "technology budget". You shouldn't spend that budget on things that aren't that important to your end goal. All of these tools are simple and battle tested which means you can spend your technology budget elsewhere.

## Code Style

Pure functional programming as much as possible. Avoid mutating data in place.

Use the language features as much as possible. `for (const item in array)` is better than `array.forEach` is better than `_.forEach`

## Why not use CRDT?

CRDTs are a very special-purpose kind of solution. It is certainly possible to modify this repo to accomodate CRDTs but it doesn't seem like the best place to start for most applications.

An application built on CRDTs cannot any transactional writes or a single source of truth. That means you can't build a bank or a multiplayer videogame, for example. You can't even have a constraint like "all usernames must be unique".

In collaborative apps, permissions get really tricky, especially revoking permission. In large worksapces, you'll want to sync only the parts of the data you care about as opposed to all of the data in an entire organization. And if you want to support the web in addition to native apps, you'll have to figure out how to deal with the causality vector clock growing.

I'm very interested to see how the tools develop for building with CRDTs, but I would definitely consider this to be using one of your innovation tokens.

# Scaling

The architecture in this boilerplate is very similar to the one I built at Notion. It's designed so it can run in a single process, but easily be broken up into scalable independent services.

The ApiServer serves the static assets for the app along with the API. This server is stateless so it can scale horizontally behind a load balancer without any problem.

The Database can easily be spun out into its own server, probably just use SQLite to start and move on to Postgres.

The QueueDatabase can be modified to use Postgres, or if you throughput is really high, then you can use Redis using a Lua script.

You'll want to have a separate QueueServer for processing tasks from the QueueDatabase so that you ApiServer doesn't slow down.

The PubsubServer can run on it's own to manage websocket connections and use Redis as a message queue for broadcasting updates.

At this point, you can horizontally scale things out up until you need to start sharding. For context, Notion didn't need to shard until we had millions of users so you probably don't need to worry about sharding for a while.

You can shard Redis arbitrarily by booting up several instances and hashing the update key to select which instance to broadcast/subscribe to.

For Postgres, the simplest way to shard is probably the best. You need to have a property on every object that allows you to partition data into different tables / databases.

# Developer Tools

I'm using VSCode with the Prettier plugin to format my code whenever I save it.

# Walkthroughs

A walkthrough the codebase could help give another perspective on how things work.

## Authentication

Start at `server/apis/login.ts`.

We're using `scrypt` to hash the password. This hashing algorithm is designed to be computationally expensive to make it hard to brute-force passwords if the hashes are ever leaked.

We're using secure-compare to check if the hashes match to prevent timing attacks.

Then we generate an authToken, save it to the database, and set some cookies.

`Login.tsx` is the login form that calls the login api. When we navigate back to the root url after logging in the `Root.tsx` component calls `client/helpers/getCurrentUserId` which parses the userId from the cookie. Whenever we make api requests `client/services/api.ts` we use `credentials: "same-origin"` to make sure we send the cookies to the backend.

Then in an api like `apis/getRecords.ts` we call `server/helpers/getCurrentUserId` to get the authToken from the cookie and look up the authToken record from the database to get the corresponding userId.

## Loading Data & Realtime Updates

One of the first things we do in `<App/>` is load the current user record `const user = useRecord({ ... })`.

`useRecord` starts by calling `loadRecord` which checks to see if there's already a loader for this record. If there is an existing loader, then we'll reuse it, otherwise we'll make a new loader which will check the RecordCache. It's possible that the record is in the RecordCache without a loader already existing — for example, `api.login` returns a recordMap with the user record which we put into storage and the cache. If the record isn't in the RecordCache, then we'll load it from RecordStorage and fetch from `api.getRecords`.

Back in `useRecord`, if the loader hasn't resolved yet, we'll throw a promise which will invoke React Suspense. We subscribe to the `SubscriptionCache` to reference count that we're using this record in the app and prevent it from being garbage collected. In `client/index.tsx`, you'll see that when we subscribe to the `SubscriptionCache`, we'll also subscribe to the server over the websocket connection in `environment.pubsub`.

Then we query and subscribe to the record from the RecordCache.

When we want to update a record, we use `client/actions/write` which will apply the operations to the record in the RecordCache and RecordStorage and enqueue the transaction to the TransactionQueue. The TransactionQueue will call `server/apis/write` which will write to the database as well as broadcast version numbers for any updates records using `pubsub.publish`.

In `client/index.tsx` the `WebsocketPubsubClient` will call the `onChange` handler with the version update. We'll check to see if its a larger version than the record in the RecordCache and if it is, we'll fetch the new Record and write it to the RecordCache and RecordStorage.

When a component unmounts and useRecord unsubscribes to the SubscriptionCache, then after a delay the SubscriptionCache will call the `onUnsubscribe` handler which will unsubscribe over the websocket and free up memory in the LoaderCache and RecordCache.

## Offline

The service worker caches the website assets and falls back on the cache only when there is no internet connection.

On the client, loaders will pull data from `RecordStorage` and the api requests will fail with `status: 0` for offline.

The TransactionQueue saves transactions to localStorage and attempts to write to the server when we're online.

## Creating a new API

- Create a file in `server/apis`
	- You may need to run `npm run autoindex` unless your server is already running from `npm start`
- On the client use `environment.api` to call the api.
- Add the records to the recordCache and recordStorage as necessary.

## Creating a new realtime query

- Create the api...
- Add an index and getter in RecordStorage.
- Add an index and getter to RecordCache.
- Add loader for querying, and remember to lazily evaluate / cache due to useSyncExternalStore
	- create loader cache methods
		- create a subscription key
- create the hook
- publish to subscription in `server/apis/write.ts`
- handle the subscription change on the client to refetch.

Admittedly, this is a little tedious. Certainly there are some ergonomic improvements to be made here. Alas.

## Deploying

### Setup

- Get a server with a static IP address.

	You can use whatever service you want – I signed up for Linode, I know Digital Ocean is pretty simple to.

- SSH into the server so we can start setting things up.

	```sh
	apt-get update
	apt-get install -y git nodejs npm
	```

- Setup an ssh key on the server so you can pull changes from Github.

	```sh
	ssh-keygen -t ed25519 -C "YOUR_EMAIL"
	cat ~/.ssh/id_ed25519.pub
	# Add to Github https://github.com/settings/keys
	```

- Boot up your app.

	```sh
	git clone ...
	npm install
	npm run boostrap
	NODE_ENV=production npm start
	```

Now if you go to your server's IP address, port 8080, you should see your app running!

- Buy a domain and point it to your server.

	I use Cloudflare for my DNS.

	You'll want to set the `A HOST` DNS record to the IP address of your server.

- Install Caddy web server.

	Caddy is great because it handles SSL/HTTPS and also makes it easy to host many different websites on the same machine, even across different domains!

	```
	sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
	sudo apt update
	sudo apt install caddy
	```

- Installing Caddy creates a systemd service that will boot up the server on startup.

	You can start and stop Caddy and look at logs all through systemd commands.

	```sh
	systemctl start caddy
	systemctl status caddy

	# show more logs
	systemctl status caddy -n 100

	# print all logs
	journalctl -u caddy
	# print all logs in reverse order
	journalctl -u caddy -r
	```

- Edit your Caddyfile at `/etc/caddy/Caddyfile` to point your domain to the port the app is running on.

	```
	example.com {
		reverse_proxy localhost:8080
	}

	www.example.com {
		redir https://example.com{uri}
	}
	```

	Any time you edit your Caddyfile, you'll need to reload Caddy.

	```sh
	caddy reload
	```

You'll want to go into `ServerConfig.ts` too and update the domain from `example.com` to whatever you're domain is.

You'll also want to make sure your app starts whenever the server restarts – we can do this using systemd.

- To run your app on startup with systemd.

	```sh
	npm install -g add-to-systemd
	add-to-systemd example-app --env "NODE_ENV=production" "$(which npm) start"

	systemctl start example-app
	systemctl status example-app

	# check that it is serving
	curl https://localhost:8080
	```

Cool. Now when you restart your server, you should notice that everything boots up.

If you check your Caddy logs, you should see that an SSL certificate was issued from LetsEncrypt.

Go to your domain and you should see your app running!

### Updating

Deploying an update is really simple – you just need to stop the app, pull changes, and boot it back up!

```sh
systemctl stop example-app
git pull origin master
npm install
# Run a migration script if you need to.
systemctl start example-app
```

It's not a zero-downtime deploy, but it's only a couple seconds of downtime. And since the app works offline, users should hardly notice. You can worry about zero-downtime deploys once you scale up.

# What's next?

There's always more to build so this project is always going to be in some state of "incomplete". I hesitated to release this for a long time because I had higher expectations. But it is what it is, and it's certainly be helpful to people I've privately shared it with, so it's time to see the light.

In terms of improvements I'd like to see to this project:
- SQLite backend database with some migration tools.
- Improve tuple-database so that we can conslidate logic between RecordStorage and RecordCache.
- Build more UI components and polish the `/design` playground.
- Refactor the config from `production: boolean` to `env: "production" | "staging" | "local"` so we can have more than one build target.
- Create a simple build system for web assets like icons and images.
- CLI tools for deploying
- More compresentive tests
- Write secrets to a gitignored file that ServerConfig reads from.
- Caching layer using memcached
- Ratelimiting
- Datadog analytics
- Health check / status page

If requested by popular demand, I would consider making some video walkthroughs as well.

## Contribution

Feel free to help out!
