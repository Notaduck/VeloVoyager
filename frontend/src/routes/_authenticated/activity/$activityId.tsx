import { activityQueryOptions } from "@/hooks/getActivity";
import { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/activity/$activityId")({
  component: () => <div>Hello /_authenticated/activity/$activityId!</div>,

  loader: async ({ context: { queryClient, supabase }, ...rest }) => {
    let activityId = Number(rest.params.activityId);
    const jwt = await (supabase as SupabaseClient).auth
      .getSession()
      .then((session) => session.data.session?.access_token);
    console.log("jwt", jwt);
    return {
      activities: await queryClient.ensureQueryData(
        activityQueryOptions({ jwtToken: jwt!, activityId: activityId })
      ),
      authToken: jwt,
    };
  },
});
