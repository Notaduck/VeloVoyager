import { ELineChart } from "@/components/charts/eLineChart";
import Map from "@/components/map/map";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { activityQueryOptions, useActivity } from "@/hooks/getActivity";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

export const Route = createFileRoute("/_authenticated/activity/$activityId")({
  component: Activity,
  loader: async ({ context: { queryClient, supabase }, ...rest }) => {
    const activityId = Number(rest.params.activityId);
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

<<<<<<< HEAD
=======
function findCentroid(coordinates: Array<Coordinates>) {
  let sumX = 0;
  let sumY = 0;
  const n = coordinates.length;

  coordinates.forEach((coord) => {
    sumX += coord.x;
    sumY += coord.y;
  });

  const centerX = sumX / n;
  const centerY = sumY / n;

  return { x: centerX, y: centerY };
}

function findClosest(dataset: Array<number>, maxKm: number) {
  const targets = [];
  const closestIndices = new Set();

  for (let i = 0; i <= maxKm; i += 5) {
    targets.push(i * 100000); // converting km to cm
  }

  targets.forEach((target) => {
    let closestIndex = 0;
    let minDiff = Math.abs(dataset[0] - target);

    dataset.forEach((value, index) => {
      const diff = Math.abs(value - target);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = index;
      }
    });

    closestIndices.add(closestIndex);
  });

  return dataset.map((value, index) =>
    closestIndices.has(index) ? value / 10000 : null
  );
}
>>>>>>> 1c6cc9d4ba8a284c89fe07b82fb94c10a333a216

const formSchema = z.object({
  activityName: z.string().min(2).max(50),
});

function Activity() {

  const { activity, authToken } = Route.useLoaderData();
  const { updateActivity } = useActivity();

  const { distance, speed, heartRate, route, x, y } = activity.records.reduce(
    (acc, record) => {
      acc.distance.push(record.distance);
      acc.speed.push(record.speed);
      acc.heartRate.push(record.heartRate!);
      acc.route.push([record.coordinates.x, record.coordinates.y]);
      acc.x += record.coordinates.x;
      acc.y += record.coordinates.y;
      return acc;
    },
    {
      x: 0,
      y: 0,
      distance: [] as number[],
      speed: [] as number[],
      heartRate: [] as number[],
      route: [] as number[][],
    }
  );

  const formMethods = useForm<z.infer<typeof formSchema>>({
    mode: "onBlur",
    resolver: zodResolver(formSchema),
    defaultValues: {
      activityName: activity.activityName,
    },
  });

  const [editTitle, setEditTitle] = useState<boolean>(false);

  const syncGroup = 1;

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (data.activityName != activity.activityName && authToken) {
      const params = {
        jwtToken: authToken,
        activityId: activity.id, // replace with actual activity id
        activityName: data.activityName, // replace with the new activity name
      };

      updateActivity.mutate(params, {
        onSuccess: (data) => {

          Route.router?.dehydratedData()
          console.log("Activity updated successfully:", data);
        },
        onError: (error) => {
          console.error("Error updating activity:", error);
        },
      });
    }

    setEditTitle(false);
  };

  return (
    <div className="container p-4 mx-auto min-h-screen">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {editTitle ? (
                <FormProvider {...formMethods}>
                  <form className="w-full transition-all duration-300 ease-in-out">
                    <FormField
                      control={formMethods.control}
                      name="activityName"
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input
                              {...field}
                              onBlur={() => onSubmit(formMethods.getValues())}
                              type="text"
                              placeholder={activity.activityName}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </FormProvider>
              ) : (
                <div className="flex gap-2 items-center">
                  <span>{activity.activityName}</span>
                  <Pencil2Icon
                    className="transition-opacity duration-300 ease-in-out cursor-pointer hover:opacity-75"
                    onClick={() => setEditTitle(true)}
                  />
                </div>
              )}
            </CardTitle>
            <CardDescription>
              Avg Speed: {activity.avgSpeed}, Max Speed: {activity.maxSpeed},
              Elapsed Time: {activity.elapsedTime}, Tour Date:{" "}
              {activity.tourDate}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Map
              initialLat={y / activity.records.length}
              initialLng={x / activity.records.length}
              records={activity.records}
              route={route}
            />

            <div className="flex items-center">
              <div className="my-8 w-1/12 h-[2px] bg-gray-600 rounded-lg" />
              <h2 className="px-2">Speed</h2>
              <div className="my-8 w-full h-[2px] bg-gray-800" />
            </div>

            <ELineChart
              x={distance}
              y={speed}
              xLabel="km"
              yLabel="km/h"
              title="Speed"
              syncGroup={syncGroup}
            />

            <div className="flex items-center">
              <div className="my-8 w-1/12 h-[2px] bg-gray-600 rounded-lg" />
              <h2 className="px-2 text-nowrap">Heart Rate</h2>
              <div className="my-8 w-full h-[2px] bg-gray-800" />
            </div>

            <ELineChart
              x={distance}
              y={heartRate}
              xLabel="km"
              yLabel="bpm"
              title="Heart Rate"
              syncGroup={syncGroup}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Activity;
