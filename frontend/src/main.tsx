import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";
import { createClient } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConnectTransport } from "@connectrpc/connect-web";
import { TransportProvider } from "@connectrpc/connect-query";
// import * as Sentry from "@sentry/react";

import "./globals.css";
import "./index.css";
import "mapbox-gl/dist/mapbox-gl.css";

console.table(import.meta.env);

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_API_KEY,
);

const queryClient = new QueryClient();
export const transport = createConnectTransport({
  baseUrl: "http://127.0.0.1:8080",
  interceptors: [
    (next) => async (request) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        request.header.append(
          "Authorization",
          "Bearer " + session.access_token,
        );
      }
      // Add your headers here
      return next(request);
    },
  ],
});
// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    supabase: supabase,
    queryClient: queryClient,
  },
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Sentry.init({
//   dsn: "https://b98bdb716ccf15404e021d339d0a229a@o4507424145080320.ingest.de.sentry.io/4507424148881488",
//   integrations: [
//     Sentry.browserTracingIntegration(),
//     Sentry.replayIntegration(),
//   ],
//   // Performance Monitoring
//   tracesSampleRate: 1.0, //  Capture 100% of the transactions
//   // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
//   tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
//   // Session Replay
//   replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
//   replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
// });

// Render the app
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <TransportProvider transport={transport}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </TransportProvider>
    </StrictMode>,
  );
}
