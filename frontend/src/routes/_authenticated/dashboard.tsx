import { postsQueryOptions } from "@/hooks/getActivities";
import { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  loader: ({ context: { queryClient, supabase } }) => {
    const jwt = (supabase as SupabaseClient).auth
      .getSession()
      .then((session) => session.data.session?.access_token);
    return queryClient.ensureQueryData(postsQueryOptions(jwt));
  },
});

function Dashboard() {
  const context = Route.useRouteContext();
  return <div>Hello /_authenticated/dashboard!</div>;
}
