import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
	plugins: [react(), tsConfigPaths()],
	server: {
		port: 8081,
	},
	build: {
		emptyOutDir: true,
		outDir: "../../build/ui",
	},
})
