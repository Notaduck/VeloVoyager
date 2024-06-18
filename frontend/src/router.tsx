import { createRouter as createReactRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'
import SuperJSON from 'superjson'
import { createClient } from '@supabase/supabase-js';
import { QueryClient } from '@tanstack/react-query';

export function createRouter() {

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_API_KEY
);

const queryClient = new QueryClient();

  return createReactRouter({
    routeTree,
    context: {
        supabase: supabase,
        queryClient: queryClient
    },
    defaultPreload: 'intent',
    transformer: SuperJSON,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
