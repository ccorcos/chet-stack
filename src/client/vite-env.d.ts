/// <reference types="vite/client" />

// The vite-env.d.ts file is needed because it provides TypeScript type definitions for Vite-specific features.
// Specifically:

// 1. Import type support - It enables TypeScript to understand Vite's special import features like:
// 	- import.meta.env - Access to environment variables
// 	- import.meta.hot - Hot Module Replacement (HMR) API
// 	- Asset imports (CSS, images, JSON, etc.)
// 2. Module resolution - It tells TypeScript how to handle non-JavaScript imports that Vite processes, such as:
// 	- .css files
// 	- .svg files
// 	- .png/.jpg image files
// 	- Other asset types
