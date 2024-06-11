import { ELineChart } from "@/components/charts/eLineChart";
import Map, { Coordinates } from "@/components/map/map";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { activityQueryOptions } from "@/hooks/getActivity";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Form, FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";

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

  // Convert target distances to centimeters and store them in targets array
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

  const result = dataset.map((value, index) =>
    closestIndices.has(index) ? value / 10000 : null
  );
  return result;
}

const formSchema = z.object({
  activityName: z.string().min(2).max(50),
});

function Activity() {
  const { activity } = Route.useLoaderData();

  const { distance, speed, heartRate, route, x, y } = activity.records.reduce(
    (acc, record) => {
      // acc.distance.push(record.distance / 100000);
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

  // Example dataset of n values in centimeters
  // // Maximum kilometers to consider (e.g., up to 50 km)
  // const maxKm = Math.max(...distance) / 100000;

  // // Find closest values
  // const closestValues = findClosest(distance, maxKm);

  // console.log(
  //   "Closest values to targets with non-closest set to null:",
  //   closestValues
  // );

  const syncGroup = 1;

  const formMethods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activityName: activity.activityName,
    },
  });

  const [editTitle, setEditTitle] = useState<boolean>(false);

  const onSubmit = () => {
    console.log("lll");
  };
  return (
    <div className="container p-4 mx-auto min-h-screen">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="">
              {editTitle ? (
                <FormProvider {...formMethods}>
                  <form
                    onSubmit={formMethods.handleSubmit(onSubmit)}
                    className="w-full transition-all duration-300 ease-in-out"
                  >
                    <FormField
                      control={formMethods.control}
                      name="activityName"
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input
                              {...field}
                              onBlur={() => setEditTitle(false)}
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
              {activity.avgSpeed}
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
              <div className="my-8  w-1/12 h-[2px] bg-gray-600 rounded-lg" />
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
              <div className="my-8  w-1/12 h-[2px] bg-gray-600 rounded-lg" />
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
