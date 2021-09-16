// # Deploy to Github Pages
// # https://guides.github.com/features/pages/
// #
// # For this script to work, first you must create a remote branch called gh-pages:
// #
// # git checkout -b gh-pages
// # git push origin gh-pages
// #

// rm -rf website
// cp -r build/static website
// git subtree push --prefix build/static origin gh-pages

import { execSync } from "child_process"
import { path } from "./path"

execSync(`rm -rf ${path("website")}`)
execSync(`cp -r ${path("build/static")} ${path("website")}`)

execSync(`git add .`, { cwd: path() })
// execSync(`git commit -m ""`)

// git add website
// execSync(`git subtree push --prefix ${path("website")} origin gh-pages`)
