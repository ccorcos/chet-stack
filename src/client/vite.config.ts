import react from "@vitejs/plugin-react"
import { path } from "tools/path"
import { defineConfig } from "vite"

export default defineConfig({
	plugins: [react()],
	build: {
		emptyOutDir: true,
		outDir: path("build/client"),
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
