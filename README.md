# TypeScript Boilerplate [Live Demo](https://ccorcos.github.io/typescript-boilerplate/)

A minimal boilerplate for building and deploying websites to Github Pages.

**Features**
- React
- [Estrella](https://github.com/rsms/estrella) (combines ESBuild with TypeScript)
- Livereload (development server)
- Deploy to Github Pages
- Environment and StateMachine architecture (if you want)

## Development

```sh
git clone git@github.com:ccorcos/typescript-boilerplate.git project
cd project
git remote remove origin
npm install
npm start
```

## Deploy

```sh
# Note: this will build and commit changes to your local branch.
npm run release
```

## Architecture

- No side-effects at the top level except for index.tsx.
- External effects interface through services defined on the Environment.
- The Environment is plumbed around everywhere.
- StateMachine is a Redux-style state management abstraction with less boilerplate.
