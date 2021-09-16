// Deploy to Github Pages
// https://guides.github.com/features/pages/

import { execSync } from "child_process"
import { path } from "./path"

const sh = (cmd: string) => execSync(cmd, { cwd: path() })

const rm = (p: string) => sh(`rm -rf ${p}`)
const cp = (a: string, b: string) => sh(`cp -r ${a} ${b}`)

rm("website")
cp("build/static", "website")
sh(`git add .`)

// This will increment the package.json version and commit it all together.
sh(`npm version patch --force`)

sh(`git subtree push --prefix website origin gh-pages`)
