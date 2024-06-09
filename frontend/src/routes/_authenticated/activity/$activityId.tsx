import { LineChart } from "@/components/charts/lineChart";
import Map from "@/components/map/map";
import { activityQueryOptions } from "@/hooks/getActivity";
import { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Chart as ChartJS } from "chart.js";
import "chartjs-plugin-crosshair";

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
  const chart1Ref = useRef<ChartJS | null>(null);
  const chart2Ref = useRef<ChartJS | null>(null);

  const handleSync = (chartInstance: ChartJS) => {
    if (!chart1Ref.current) {
      chart1Ref.current = chartInstance;
    } else if (!chart2Ref.current) {
      chart2Ref.current = chartInstance;
    }
  };

  const { activity } = Route.useLoaderData();

  const { distance, speed, heartRate, route } = activity.records.reduce(
    (acc, record) => {
      acc.distance.push(record.distance / 100000);
      acc.speed.push(record.speed);
      acc.heartRate.push(record.heartRate!);

      acc.route.push([record.coordinates.x, record.coordinates.y]);

      return acc;
    },
    {
      distance: [] as number[],
      speed: [] as number[],
      heartRate: [] as number[],
      route: [] as number[][],
    }
  );

  return (
    <div className="container p-4 mx-auto min-h-screen">
      <div className="grid gap-4">
        {/* <p> Map should be here</p> */}
        <div className="col-span-1">
          <Map records={activity.records} route={route} />
        </div>

        <div className="col-span-1 w-full">
          <div className="p-4 w-full bg-white rounded-lg shadow-md">
            <LineChart
              x={distance}
              y={speed}
              xLabel="km"
              yLabel="km/h"
              title="Speed"
              syncChart={handleSync}
            />
          </div>
        </div>
        <div className="col-span-1 w-full">
          <div className="p-4 w-full bg-white rounded-lg shadow-md">
            <LineChart
              x={distance}
              y={heartRate}
              xLabel={"km"}
              yLabel={"bpm"}
              title="Heart Rate"
              syncChart={handleSync}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Activity;
