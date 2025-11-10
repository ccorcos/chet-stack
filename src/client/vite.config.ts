import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
	plugins: [react(), tsConfigPaths()],
	build: {
		emptyOutDir: true,
		outDir: "../../build/client",
	},
})

// LATER
// publicDir: path.resolve(__dirname, 'src/client/public'), // optional

// LATER
// import { VitePWA } from "vite-plugin-pwa"; // TODO: add later
// VitePWA({
//   registerType: "autoUpdate",
//   workbox: { globPatterns: ["**/*.{js,css,html,ico,png,svg}"] },
// }),
