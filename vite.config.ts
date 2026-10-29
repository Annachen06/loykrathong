import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" keeps asset paths relative, so the build works on Netlify
// and from any sub-folder.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
