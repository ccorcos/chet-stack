import { indexgen } from "./indexgen"

indexgen({ dirPath: ".", watchMode: process.argv.includes("--watch") })
