import ReactDOM from 'react-dom/client'

import { StartClient } from '@tanstack/start'
import { createRouter } from './router'
// import { createClient } from '@supabase/supabase-js';
// import { QueryClient } from '@tanstack/react-query';

// const supabase = createClient(
//   import.meta.env.VITE_SUPABASE_URL,
//   import.meta.env.VITE_SUPABASE_API_KEY
// );

// const queryClient = new QueryClient();

// Create a new router instance
const router = createRouter();

ReactDOM.hydrateRoot(document, <StartClient router={router} />)
