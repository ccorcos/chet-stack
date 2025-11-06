
## Apple Contacts

select all, export vcard

## Insights

### No Workspaces

Npm workspaces hoists your packages and node_modules all at the top level. Dependencies leak, and you can use pnpm to fix this. But this all just becomes overhead to deal with. You need to set up package json to point either to built assets or to your typescript files. At the end of the day, this is only really useful if you want to deploy these packages independently to npm. But for convenience, you widdle away at that until eventually, you just have a bunch of top-level projects that all share dependencies and are just typescript source code, not all this intermediate building. It's just a pain and kind of stupid for what I need. I can also use tsconfig baseUrl to import them directly without relative urls. So we get it all without all the pain.