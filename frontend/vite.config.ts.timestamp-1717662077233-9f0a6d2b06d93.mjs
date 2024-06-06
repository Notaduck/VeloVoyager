// vite.config.ts
import { defineConfig } from "file:///Users/danielguldbergaaes/Playground/VeloVoyager/frontend/node_modules/vite/dist/node/index.js";
import { ViteImageOptimizer } from "file:///Users/danielguldbergaaes/Playground/VeloVoyager/frontend/node_modules/vite-plugin-image-optimizer/dist/index.mjs";
import react from "file:///Users/danielguldbergaaes/Playground/VeloVoyager/frontend/node_modules/@vitejs/plugin-react-swc/index.mjs";
import { TanStackRouterVite } from "file:///Users/danielguldbergaaes/Playground/VeloVoyager/frontend/node_modules/@tanstack/router-vite-plugin/dist/esm/index.js";
import path from "path";
var __vite_injected_original_dirname = "/Users/danielguldbergaaes/Playground/VeloVoyager/frontend";
var DEFAULT_OPTIONS = {
  test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
  exclude: void 0,
  include: void 0,
  includePublic: true,
  logStats: true,
  ansiColors: true,
  svg: {
    multipass: true,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            cleanupNumericValues: false,
            removeViewBox: false
            // https://github.com/svg/svgo/issues/1128
          },
          cleanupIDs: {
            minify: false,
            remove: false
          },
          convertPathData: false
        }
      },
      "sortAttrs",
      {
        name: "addAttributesToSVGElement",
        params: {
          attributes: [{ xmlns: "http://www.w3.org/2000/svg" }]
        }
      }
    ]
  },
  png: {
    // https://sharp.pixelplumbing.com/api-output#png
    quality: 100
  },
  jpeg: {
    // https://sharp.pixelplumbing.com/api-output#jpeg
    quality: 100
  },
  jpg: {
    // https://sharp.pixelplumbing.com/api-output#jpeg
    quality: 100
  },
  tiff: {
    // https://sharp.pixelplumbing.com/api-output#tiff
    quality: 100
  },
  // gif does not support lossless compression
  // https://sharp.pixelplumbing.com/api-output#gif
  gif: {},
  webp: {
    // https://sharp.pixelplumbing.com/api-output#webp
    lossless: true
  },
  avif: {
    // https://sharp.pixelplumbing.com/api-output#avif
    lossless: true
  },
  cache: false,
  cacheLocation: void 0
};
var vite_config_default = defineConfig({
  plugins: [
    react(),
    TanStackRouterVite(),
    ViteImageOptimizer({
      ...DEFAULT_OPTIONS
    })
  ],
  define: {
    "process.env.VITE_SUPABASE_URL": JSON.stringify(
      process.env.VITE_SUPABASE_URL
    ),
    "process.env.VITE_SUPABASE_API_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_API_KEY
    ),
    "process.env.VITE_API_URL": JSON.stringify(process.env.VITE_API_URL),
    "process.env.VITE_MAPBOX_TOKEN": JSON.stringify(
      process.env.VITE_MAPBOX_TOKEN
    )
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  base: "/",
  preview: {
    port: 8080,
    strictPort: true
  },
  server: {
    port: 8080,
    strictPort: true,
    host: true,
    origin: "http://0.0.0.0:8080"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZGFuaWVsZ3VsZGJlcmdhYWVzL1BsYXlncm91bmQvVmVsb1ZveWFnZXIvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9kYW5pZWxndWxkYmVyZ2FhZXMvUGxheWdyb3VuZC9WZWxvVm95YWdlci9mcm9udGVuZC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZGFuaWVsZ3VsZGJlcmdhYWVzL1BsYXlncm91bmQvVmVsb1ZveWFnZXIvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHsgVml0ZUltYWdlT3B0aW1pemVyIH0gZnJvbSBcInZpdGUtcGx1Z2luLWltYWdlLW9wdGltaXplclwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCB7IFRhblN0YWNrUm91dGVyVml0ZSB9IGZyb20gXCJAdGFuc3RhY2svcm91dGVyLXZpdGUtcGx1Z2luXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG5jb25zdCBERUZBVUxUX09QVElPTlMgPSB7XG4gIHRlc3Q6IC9cXC4oanBlP2d8cG5nfGdpZnx0aWZmfHdlYnB8c3ZnfGF2aWYpJC9pLFxuICBleGNsdWRlOiB1bmRlZmluZWQsXG4gIGluY2x1ZGU6IHVuZGVmaW5lZCxcbiAgaW5jbHVkZVB1YmxpYzogdHJ1ZSxcbiAgbG9nU3RhdHM6IHRydWUsXG4gIGFuc2lDb2xvcnM6IHRydWUsXG4gIHN2Zzoge1xuICAgIG11bHRpcGFzczogdHJ1ZSxcbiAgICBwbHVnaW5zOiBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwicHJlc2V0LWRlZmF1bHRcIixcbiAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgb3ZlcnJpZGVzOiB7XG4gICAgICAgICAgICBjbGVhbnVwTnVtZXJpY1ZhbHVlczogZmFsc2UsXG4gICAgICAgICAgICByZW1vdmVWaWV3Qm94OiBmYWxzZSwgLy8gaHR0cHM6Ly9naXRodWIuY29tL3N2Zy9zdmdvL2lzc3Vlcy8xMTI4XG4gICAgICAgICAgfSxcbiAgICAgICAgICBjbGVhbnVwSURzOiB7XG4gICAgICAgICAgICBtaW5pZnk6IGZhbHNlLFxuICAgICAgICAgICAgcmVtb3ZlOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbnZlcnRQYXRoRGF0YTogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgXCJzb3J0QXR0cnNcIixcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJhZGRBdHRyaWJ1dGVzVG9TVkdFbGVtZW50XCIsXG4gICAgICAgIHBhcmFtczoge1xuICAgICAgICAgIGF0dHJpYnV0ZXM6IFt7IHhtbG5zOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgfV0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIF0sXG4gIH0sXG4gIHBuZzoge1xuICAgIC8vIGh0dHBzOi8vc2hhcnAucGl4ZWxwbHVtYmluZy5jb20vYXBpLW91dHB1dCNwbmdcbiAgICBxdWFsaXR5OiAxMDAsXG4gIH0sXG4gIGpwZWc6IHtcbiAgICAvLyBodHRwczovL3NoYXJwLnBpeGVscGx1bWJpbmcuY29tL2FwaS1vdXRwdXQjanBlZ1xuICAgIHF1YWxpdHk6IDEwMCxcbiAgfSxcbiAganBnOiB7XG4gICAgLy8gaHR0cHM6Ly9zaGFycC5waXhlbHBsdW1iaW5nLmNvbS9hcGktb3V0cHV0I2pwZWdcbiAgICBxdWFsaXR5OiAxMDAsXG4gIH0sXG4gIHRpZmY6IHtcbiAgICAvLyBodHRwczovL3NoYXJwLnBpeGVscGx1bWJpbmcuY29tL2FwaS1vdXRwdXQjdGlmZlxuICAgIHF1YWxpdHk6IDEwMCxcbiAgfSxcbiAgLy8gZ2lmIGRvZXMgbm90IHN1cHBvcnQgbG9zc2xlc3MgY29tcHJlc3Npb25cbiAgLy8gaHR0cHM6Ly9zaGFycC5waXhlbHBsdW1iaW5nLmNvbS9hcGktb3V0cHV0I2dpZlxuICBnaWY6IHt9LFxuICB3ZWJwOiB7XG4gICAgLy8gaHR0cHM6Ly9zaGFycC5waXhlbHBsdW1iaW5nLmNvbS9hcGktb3V0cHV0I3dlYnBcbiAgICBsb3NzbGVzczogdHJ1ZSxcbiAgfSxcbiAgYXZpZjoge1xuICAgIC8vIGh0dHBzOi8vc2hhcnAucGl4ZWxwbHVtYmluZy5jb20vYXBpLW91dHB1dCNhdmlmXG4gICAgbG9zc2xlc3M6IHRydWUsXG4gIH0sXG4gIGNhY2hlOiBmYWxzZSxcbiAgY2FjaGVMb2NhdGlvbjogdW5kZWZpbmVkLFxufTtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIFRhblN0YWNrUm91dGVyVml0ZSgpLFxuICAgIFZpdGVJbWFnZU9wdGltaXplcih7XG4gICAgICAuLi5ERUZBVUxUX09QVElPTlMsXG4gICAgfSksXG4gIF0sXG4gIGRlZmluZToge1xuICAgIFwicHJvY2Vzcy5lbnYuVklURV9TVVBBQkFTRV9VUkxcIjogSlNPTi5zdHJpbmdpZnkoXG4gICAgICBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX1VSTFxuICAgICksXG4gICAgXCJwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX0FQSV9LRVlcIjogSlNPTi5zdHJpbmdpZnkoXG4gICAgICBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX0FQSV9LRVlcbiAgICApLFxuXG4gICAgXCJwcm9jZXNzLmVudi5WSVRFX0FQSV9VUkxcIjogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuVklURV9BUElfVVJMKSxcbiAgICBcInByb2Nlc3MuZW52LlZJVEVfTUFQQk9YX1RPS0VOXCI6IEpTT04uc3RyaW5naWZ5KFxuICAgICAgcHJvY2Vzcy5lbnYuVklURV9NQVBCT1hfVE9LRU5cbiAgICApLFxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG4gIGJhc2U6IFwiL1wiLFxuICBwcmV2aWV3OiB7XG4gICAgcG9ydDogODA4MCxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA4MDgwLFxuICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgaG9zdDogdHJ1ZSxcbiAgICBvcmlnaW46IFwiaHR0cDovLzAuMC4wLjA6ODA4MFwiLFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZWLFNBQVMsb0JBQW9CO0FBQzFYLFNBQVMsMEJBQTBCO0FBQ25DLE9BQU8sV0FBVztBQUNsQixTQUFTLDBCQUEwQjtBQUNuQyxPQUFPLFVBQVU7QUFKakIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTSxrQkFBa0I7QUFBQSxFQUN0QixNQUFNO0FBQUEsRUFDTixTQUFTO0FBQUEsRUFDVCxTQUFTO0FBQUEsRUFDVCxlQUFlO0FBQUEsRUFDZixVQUFVO0FBQUEsRUFDVixZQUFZO0FBQUEsRUFDWixLQUFLO0FBQUEsSUFDSCxXQUFXO0FBQUEsSUFDWCxTQUFTO0FBQUEsTUFDUDtBQUFBLFFBQ0UsTUFBTTtBQUFBLFFBQ04sUUFBUTtBQUFBLFVBQ04sV0FBVztBQUFBLFlBQ1Qsc0JBQXNCO0FBQUEsWUFDdEIsZUFBZTtBQUFBO0FBQUEsVUFDakI7QUFBQSxVQUNBLFlBQVk7QUFBQSxZQUNWLFFBQVE7QUFBQSxZQUNSLFFBQVE7QUFBQSxVQUNWO0FBQUEsVUFDQSxpQkFBaUI7QUFBQSxRQUNuQjtBQUFBLE1BQ0Y7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLFFBQ0UsTUFBTTtBQUFBLFFBQ04sUUFBUTtBQUFBLFVBQ04sWUFBWSxDQUFDLEVBQUUsT0FBTyw2QkFBNkIsQ0FBQztBQUFBLFFBQ3REO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxLQUFLO0FBQUE7QUFBQSxJQUVILFNBQVM7QUFBQSxFQUNYO0FBQUEsRUFDQSxNQUFNO0FBQUE7QUFBQSxJQUVKLFNBQVM7QUFBQSxFQUNYO0FBQUEsRUFDQSxLQUFLO0FBQUE7QUFBQSxJQUVILFNBQVM7QUFBQSxFQUNYO0FBQUEsRUFDQSxNQUFNO0FBQUE7QUFBQSxJQUVKLFNBQVM7QUFBQSxFQUNYO0FBQUE7QUFBQTtBQUFBLEVBR0EsS0FBSyxDQUFDO0FBQUEsRUFDTixNQUFNO0FBQUE7QUFBQSxJQUVKLFVBQVU7QUFBQSxFQUNaO0FBQUEsRUFDQSxNQUFNO0FBQUE7QUFBQSxJQUVKLFVBQVU7QUFBQSxFQUNaO0FBQUEsRUFDQSxPQUFPO0FBQUEsRUFDUCxlQUFlO0FBQ2pCO0FBR0EsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sbUJBQW1CO0FBQUEsSUFDbkIsbUJBQW1CO0FBQUEsTUFDakIsR0FBRztBQUFBLElBQ0wsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLGlDQUFpQyxLQUFLO0FBQUEsTUFDcEMsUUFBUSxJQUFJO0FBQUEsSUFDZDtBQUFBLElBQ0EscUNBQXFDLEtBQUs7QUFBQSxNQUN4QyxRQUFRLElBQUk7QUFBQSxJQUNkO0FBQUEsSUFFQSw0QkFBNEIsS0FBSyxVQUFVLFFBQVEsSUFBSSxZQUFZO0FBQUEsSUFDbkUsaUNBQWlDLEtBQUs7QUFBQSxNQUNwQyxRQUFRLElBQUk7QUFBQSxJQUNkO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsTUFBTTtBQUFBLEVBQ04sU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxFQUNWO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
