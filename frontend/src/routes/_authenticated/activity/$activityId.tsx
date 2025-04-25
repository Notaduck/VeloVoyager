import { Input } from "@/components/ui/input";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Suspense, lazy, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { getActivity } from "@/gen/activity/v1/activity-ActivityService_connectquery";
import { useQuery } from "@connectrpc/connect-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
const LazyMap = lazy(() => import("../../../components/map/lazyMap"));

export const Route = createFileRoute("/_authenticated/activity/$activityId")({
  component: Activity,
  loader: async ({ context: { queryClient, supabase }, ...rest }) => {
    const activityId = Number(rest.params.activityId);
    const jwt = await (supabase as SupabaseClient).auth
      .getSession()
      .then((session) => session.data.session?.access_token);





    return {
      // activity: await queryClient.ensureQueryData(
      // getActivity, {activityId: activityId} 
      // ),
      authToken: jwt,
      activityId
    };
  },
});

const formSchema = z.object({
  activityName: z.string().min(2).max(50),
});

function Activity() {
  const { activityId, authToken } = Route.useLoaderData();


  // const { updateActivity } = useActivity();

  const { data: activity } = useQuery(getActivity, {
    activityId: activityId
  })







  type Accumulator = {
    x: number;
    y: number;
    distance: number[];
    speed: number[];
    heartRate: number[];
    route: Array<[number, number]>;
  };

  const initialAcc: Accumulator = {
    x: 0,
    y: 0,
    distance: [],
    speed: [],
    heartRate: [],
    route: [],
  };

  const reducedAcc: Accumulator = activity?.records.reduce<Accumulator>((acc, record) => {
    acc.distance.push(record.distance);
    acc.speed.push(record.speed);

    // Safely handle heartRate
    if (record.heartRate !== undefined && record.heartRate !== null) {
      acc.heartRate.push(record.heartRate);
    }

    // Safely handle coordinates
    if (record.coordinates?.x !== undefined && record.coordinates?.y !== undefined) {
      acc.route.push([record.coordinates.x, record.coordinates.y]);
      acc.x += record.coordinates.x;
      acc.y += record.coordinates.y;
    }

    return acc;
  }, initialAcc) ?? initialAcc;

  const { distance, speed, heartRate } = reducedAcc;




  const formMethods = useForm<z.infer<typeof formSchema>>({
    mode: "onBlur",
    resolver: zodResolver(formSchema),
    defaultValues: {
      activityName: activity?.activityName,
    },
  });

  const [editTitle, setEditTitle] = useState<boolean>(false);

  const syncGroup = 1;
  const router = useRouter();
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (data.activityName != activity?.activityName && authToken) {
      const params = {
        jwtToken: authToken,
        activityId: activity?.id, // replace with actual activity id
        activityName: data.activityName, // replace with the new activity name
      };

      // updateActivity.mutate(params, {
      //   onSuccess: async () => {
      //     await router?.invalidate();
      //   },
      //   onError: (error) => {
      //     console.error("Error updating activity:", error);
      //   },
      // });
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
                              placeholder={activity?.activityName}
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
                  <span>{activity?.activityName}</span>
                  <Pencil2Icon
                    className="transition-opacity duration-300 ease-in-out cursor-pointer hover:opacity-75"
                    onClick={() => setEditTitle(true)}
                  />
                </div>
              )}
            </CardTitle>
            <CardDescription>
              Avg Speed: {activity?.avgSpeed}, Max Speed: {activity?.maxSpeed},
              Elapsed Time: {activity?.elapsedTime}, Tour Date:{" "}
              {/* {activity?.tourDate} */}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading map...</div>}>
              {/* <LazyMap
                initialLat={y / activity?.records?.length}
                initialLng={x / activity?.records?.length}
                records={activity.records}
                route={route}
              /> */}
            </Suspense>

            <div className="flex items-center">
              <div className="my-8 w-1/12 h-[2px] bg-gray-600 rounded-lg" />
              <h2 className="px-2">Speed</h2>
              <div className="my-8 w-full h-[2px] bg-gray-800" />
            </div>

            <Chart
              data={activity?.records.filter((_, i) => i % 2 == 0).map(e => ({
                x: (e.distance / 100000).toFixed(2),
                y: e.speed,
                y1: e.heartRate,
              }))}
            />
            {/* <ELineChart
              x={distance}
              y={speed}
              xLabel="km"
              yLabel="km/h"
              title="Speed"
              syncGroup={syncGroup}
            /> */}

            <div className="flex items-center">
              <div className="my-8 w-1/12 h-[2px] bg-gray-600 rounded-lg" />
              <h2 className="px-2 text-nowrap">Heart Rate</h2>
              <div className="my-8 w-full h-[2px] bg-gray-800" />
            </div>

            {/* <ELineChart
              x={distance}
              y={heartRate}
              xLabel="km"
              yLabel="bpm"
              title="Heart Rate"
              syncGroup={syncGroup}

            />  */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


type ChartData = Array<{ x: string | number, y: number, y1: number }>

const chartData: ChartData = [
  { x: "2024-04-01", y: 222, y1: 150 },
  { x: "2024-04-02", y: 97, y1: 180 },
  { x: "2024-04-03", y: 167, y1: 120 },
  { x: "2024-04-04", y: 242, y1: 260 },
  { x: "2024-04-05", y: 373, y1: 290 },
  { x: "2024-04-06", y: 301, y1: 340 },
  { x: "2024-04-07", y: 245, y1: 180 },
  { x: "2024-04-08", y: 409, y1: 320 },
  { x: "2024-04-09", y: 59, y1: 110 },
  { x: "2024-04-10", y: 261, y1: 190 },
  { x: "2024-04-11", y: 327, y1: 350 },
  { x: "2024-04-12", y: 292, y1: 210 },
  { x: "2024-04-13", y: 342, y1: 380 },
  { x: "2024-04-14", y: 137, y1: 220 },
  { x: "2024-04-15", y: 120, y1: 170 },
  { x: "2024-04-16", y: 138, y1: 190 },
  { x: "2024-04-17", y: 446, y1: 360 },
  { x: "2024-04-18", y: 364, y1: 410 },
  { x: "2024-04-19", y: 243, y1: 180 },
  { x: "2024-04-20", y: 89, y1: 150 },
  { x: "2024-04-21", y: 137, y1: 200 },
  { x: "2024-04-22", y: 224, y1: 170 },
  { x: "2024-04-23", y: 138, y1: 230 },
  { x: "2024-04-24", y: 387, y1: 290 },
  { x: "2024-04-25", y: 215, y1: 250 },
  { x: "2024-04-26", y: 75, y1: 130 },
  { x: "2024-04-27", y: 383, y1: 420 },
  { x: "2024-04-28", y: 122, y1: 180 },
  { x: "2024-04-29", y: 315, y1: 240 },
  { x: "2024-04-30", y: 454, y1: 380 },
  { x: "2024-05-01", y: 165, y1: 220 },
  { x: "2024-05-02", y: 293, y1: 310 },
  { x: "2024-05-03", y: 247, y1: 190 },
  { x: "2024-05-04", y: 385, y1: 420 },
  { x: "2024-05-05", y: 481, y1: 390 },
  { x: "2024-05-06", y: 498, y1: 520 },
  { x: "2024-05-07", y: 388, y1: 300 },
  { x: "2024-05-08", y: 149, y1: 210 },
  { x: "2024-05-09", y: 227, y1: 180 },
  { x: "2024-05-10", y: 293, y1: 330 },
  { x: "2024-05-11", y: 335, y1: 270 },
  { x: "2024-05-12", y: 197, y1: 240 },
  { x: "2024-05-13", y: 197, y1: 160 },
  { x: "2024-05-14", y: 448, y1: 490 },
  { x: "2024-05-15", y: 473, y1: 380 },
  { x: "2024-05-16", y: 338, y1: 400 },
  { x: "2024-05-17", y: 499, y1: 420 },
  { x: "2024-05-18", y: 315, y1: 350 },
  { x: "2024-05-19", y: 235, y1: 180 },
  { x: "2024-05-20", y: 177, y1: 230 },
  { x: "2024-05-21", y: 82, y1: 140 },
  { x: "2024-05-22", y: 81, y1: 120 },
  { x: "2024-05-23", y: 252, y1: 290 },
  { x: "2024-05-24", y: 294, y1: 220 },
  { x: "2024-05-25", y: 201, y1: 250 },
  { x: "2024-05-26", y: 213, y1: 170 },
  { x: "2024-05-27", y: 420, y1: 460 },
  { x: "2024-05-28", y: 233, y1: 190 },
  { x: "2024-05-29", y: 78, y1: 130 },
  { x: "2024-05-30", y: 340, y1: 280 },
  { x: "2024-05-31", y: 178, y1: 230 },
  { x: "2024-06-01", y: 178, y1: 200 },
  { x: "2024-06-02", y: 470, y1: 410 },
  { x: "2024-06-03", y: 103, y1: 160 },
  { x: "2024-06-04", y: 439, y1: 380 },
  { x: "2024-06-05", y: 88, y1: 140 },
  { x: "2024-06-06", y: 294, y1: 250 },
  { x: "2024-06-07", y: 323, y1: 370 },
  { x: "2024-06-08", y: 385, y1: 320 },
  { x: "2024-06-09", y: 438, y1: 480 },
  { x: "2024-06-10", y: 155, y1: 200 },
  { x: "2024-06-11", y: 92, y1: 150 },
  { x: "2024-06-12", y: 492, y1: 420 },
  { x: "2024-06-13", y: 81, y1: 130 },
  { x: "2024-06-14", y: 426, y1: 380 },
  { x: "2024-06-15", y: 307, y1: 350 },
  { x: "2024-06-16", y: 371, y1: 310 },
  { x: "2024-06-17", y: 475, y1: 520 },
  { x: "2024-06-18", y: 107, y1: 170 },
  { x: "2024-06-19", y: 341, y1: 290 },
  { x: "2024-06-20", y: 408, y1: 450 },
  { x: "2024-06-21", y: 169, y1: 210 },
  { x: "2024-06-22", y: 317, y1: 270 },
  { x: "2024-06-23", y: 480, y1: 530 },
  { x: "2024-06-24", y: 132, y1: 180 },
  { x: "2024-06-25", y: 141, y1: 190 },
  { x: "2024-06-26", y: 434, y1: 380 },
  { x: "2024-06-27", y: 448, y1: 490 },
  { x: "2024-06-28", y: 149, y1: 200 },
  { x: "2024-06-29", y: 103, y1: 160 },
  { x: "2024-06-30", y: 446, y1: 400 },
]

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig



const Chart = ({ data = chartData }: { data?: ChartData }) => {
  const [timeRange, setTimeRange] = useState("90d")

  // const filteredData = chartData.filter((item) => {
  //   const referenceDate = new Date("2024-06-30")
  //   let daysToSubtract = 90
  //   if (timeRange === "30d") {
  //     daysToSubtract = 30
  //   } else if (timeRange === "7d") {
  //     daysToSubtract = 7
  //   }
  //   const startDate = new Date(referenceDate)
  //   startDate.setDate(startDate.getDate() - daysToSubtract)
  //   return date >= startDate
  // })

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Area Chart - Interactive</CardTitle>
          <CardDescription>
            Showing total visitors for the last 3 months
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="red"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="red"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="green"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="green"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="x"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            // tickFormatter={(value) => {
            //   const date = new Date(value)
            //   return date.toLocaleDateString("en-US", {
            //     month: "short",
            //     day: "numeric",
            //   })
            // }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return
                    // return new Date(value).toLocaleDateString("en-US", {
                    //   month: "short",
                    //   day: "numeric",
                    // })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="y"
              type="natural"
              fill="url(#fillMobile)"
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <Area
              dataKey="y1"
              type="natural"
              fill="url(#fillDesktop)"
              stroke="var(--color-desktop)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default Activity;
