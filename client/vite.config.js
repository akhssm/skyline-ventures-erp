import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [react()],

    server: {
        port: 5173,
        // Keeps API calls same-origin in development, so no CORS and no need
        // for VITE_API_URL locally.
        proxy: {
            "/api": {
                target: "http://localhost:9000",
                changeOrigin: true,
            },
        },
    },

    build: {
        outDir: "dist",
        sourcemap: false,
        rollupOptions: {
            output: {
                // Charts and the framework change far less often than app
                // code, so they are split into long-lived chunks.
                manualChunks(id) {
                    if (!id.includes("node_modules")) return undefined;

                    if (id.includes("recharts") || id.includes("d3-")) return "charts";
                    if (id.includes("react-router")) return "router";
                    if (id.includes("/react/") || id.includes("/react-dom/")) return "react";
                    if (id.includes("lucide-react")) return "icons";

                    return "vendor";
                },
            },
        },
    },
});
