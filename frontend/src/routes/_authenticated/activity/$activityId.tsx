import { LineChart } from "@/components/charts/lineChart";
import { activityQueryOptions } from "@/hooks/getActivity";
import { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/activity/$activityId")({
  component: Activity,

  loader: async ({ context: { queryClient, supabase }, ...rest }) => {
    let activityId = Number(rest.params.activityId);
    const jwt = await (supabase as SupabaseClient).auth
      .getSession()
      .then((session) => session.data.session?.access_token);
    return {
      activity: await queryClient.ensureQueryData(
        activityQueryOptions({ jwtToken: jwt!, activityId: activityId })
      ),
      authToken: jwt,
    };
  },
});

function Activity() {
  const { activity } = Route.useLoaderData();

  const { distance, speed, heartRate } = activity.records.reduce(
    (acc, record) => {
      acc.distance.push(record.distance / 100000);
      acc.speed.push(record.speed);
      record?.heartRate && acc.heartRate.push(record.heartRate);

      return acc;
    },
    {
      distance: [] as number[],
      speed: [] as number[],
      heartRate: [] as number[],
    }
  );
  return (
    <>
      <div>Hello /_authenticated/activity/$activityId!</div>

      <div className="grid gap-4 w-full sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1">
        <LineChart x={distance} y1={speed} />
        <LineChart x={distance} y1={heartRate} />
      </div>
    </>
  );
}
