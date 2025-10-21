import { Input } from "@/components/ui/input";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Suspense, lazy, useCallback, useMemo, useState } from "react";
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
import type { GetActivityResponse } from "@/gen/activity/v1/activity_pb";
import { useQuery } from "@connectrpc/connect-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
      activityId,
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
    activityId: activityId,
  });

  const metricsPoints = useMemo<MetricPoint[]>(() => {
    const records = activity?.records ?? [];
    if (!records.length) {
      return [];
    }

    const maxPoints = 1000;
    const step = Math.max(1, Math.floor(records.length / maxPoints));

    return records
      .filter((_, index) => index % step === 0)
      .map((record) => ({
        recordId: record.id,
        distanceKm: record.distance / 100_000,
        speedKph: record.speed,
        heartRate:
          record.heartRate !== undefined && record.heartRate !== null
            ? record.heartRate
            : null,
      }));
  }, [activity?.records]);

  const sampleByRecordId = useMemo(() => {
    const map = new Map<number, MetricPoint>();
    const records = activity?.records ?? [];

    if (!metricsPoints.length) {
      return map;
    }

    for (const point of metricsPoints) {
      map.set(point.recordId, point);
    }

    for (const record of records) {
      if (map.has(record.id)) {
        continue;
      }
      const distanceKm = record.distance / 100_000;
      let nearest = metricsPoints[0];
      let minDiff = Math.abs(nearest.distanceKm - distanceKm);

      for (let i = 1; i < metricsPoints.length; i += 1) {
        const candidate = metricsPoints[i];
        const diff = Math.abs(candidate.distanceKm - distanceKm);
        if (diff < minDiff) {
          nearest = candidate;
          minDiff = diff;
        }
      }

      map.set(record.id, {
        ...nearest,
        recordId: record.id,
        distanceKm,
        speedKph: record.speed,
        heartRate:
          record.heartRate !== undefined && record.heartRate !== null
            ? record.heartRate
            : nearest.heartRate,
      });
    }

    return map;
  }, [metricsPoints, activity?.records]);

  const routeInfo = useMemo(() => {
    const coordinateRecords = (activity?.records ?? []).filter(
      (record) =>
        record.coordinates?.x !== undefined &&
        record.coordinates?.y !== undefined,
    );

    if (!coordinateRecords.length) {
      return { route: [] as number[][], centerLat: 0, centerLng: 0 };
    }

    const route = coordinateRecords.map((record) => [
      record.coordinates.x,
      record.coordinates.y,
    ]);

    const centerLat =
      coordinateRecords.reduce((acc, record) => acc + record.coordinates.y, 0) /
      coordinateRecords.length;
    const centerLng =
      coordinateRecords.reduce((acc, record) => acc + record.coordinates.x, 0) /
      coordinateRecords.length;

    return { route, centerLat, centerLng };
  }, [activity?.records]);

  const formMethods = useForm<z.infer<typeof formSchema>>({
    mode: "onBlur",
    resolver: zodResolver(formSchema),
    defaultValues: {
      activityName: activity?.activityName,
    },
  });

  const [editTitle, setEditTitle] = useState<boolean>(false);
  const [activeRecordId, setActiveRecordId] = useState<number | null>(null);
  const handleRecordHover = useCallback(
    (recordId: number | null) => {
      setActiveRecordId((prev) => {
        if (prev === recordId) {
          return prev;
        }
        return recordId;
      });
    },
    [setActiveRecordId],
  );
  const activeSample = useMemo(() => {
    if (activeRecordId == null) {
      return null;
    }
    return sampleByRecordId.get(activeRecordId) ?? null;
  }, [activeRecordId, sampleByRecordId]);
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
            {routeInfo.route.length >= 2 && (
              <Suspense fallback={<div className="h-64">Loading map...</div>}>
                <LazyMap
                  initialLat={routeInfo.centerLat}
                  initialLng={routeInfo.centerLng}
                  records={activity?.records ?? []}
                  route={routeInfo.route}
                  focusedRecordId={activeRecordId}
                  onRecordHover={handleRecordHover}
                />
              </Suspense>
            )}

            <div className="flex items-center">
              <div className="my-8 w-1/12 h-[2px] bg-gray-600 rounded-lg" />
              <h2 className="px-2">Speed</h2>
              <div className="my-8 w-full h-[2px] bg-gray-800" />
            </div>

            <SpeedChart
              points={metricsPoints}
              activePoint={activeSample}
              onHoverRecord={handleRecordHover}
            />

            <div className="flex items-center">
              <div className="my-8 w-1/12 h-[2px] bg-gray-600 rounded-lg" />
              <h2 className="px-2 text-nowrap">Heart Rate</h2>
              <div className="my-8 w-full h-[2px] bg-gray-800" />
            </div>

            <HeartRateChart
              records={activity?.records ?? []}
              activePoint={activeSample}
              onHoverRecord={handleRecordHover}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type ActivityRecords = GetActivityResponse["records"];

type MetricPoint = {
  recordId: number;
  distanceKm: number;
  speedKph: number;
  heartRate: number | null;
};

const formatDistance = (distance: number, maxTick?: number) =>
  `${distance.toFixed(maxTick !== undefined && maxTick >= 100 ? 0 : 1)} km`;

const createDistanceTicks = (points: MetricPoint[]): number[] => {
  if (!points.length) {
    return [];
  }

  const maxDistance = Math.max(...points.map((point) => point.distanceKm));
  const step = maxDistance < 100 ? 5 : 10;
  const topTick =
    maxDistance < 100
      ? Math.ceil(maxDistance / step) * step
      : Math.max(step, Math.floor(maxDistance / step) * step);

  const ticks: number[] = [];
  for (let value = 0; value <= topTick + 1e-6; value += step) {
    ticks.push(Number(value.toFixed(2)));
  }

  if (!ticks.length) {
    ticks.push(0);
  }

  return ticks;
};

type MetricsChartProps = {
  points: MetricPoint[];
  activePoint: MetricPoint | null;
  onHoverRecord: (recordId: number | null) => void;
};

const SpeedChart = ({
  points,
  activePoint,
  onHoverRecord,
}: MetricsChartProps) => {
  const distanceTicks = useMemo(() => createDistanceTicks(points), [points]);
  const averageSpeed = useMemo(() => {
    if (!points.length) {
      return 0;
    }
    const total = points.reduce((sum, point) => sum + point.speedKph, 0);
    return total / points.length;
  }, [points]);
  const maxTick = distanceTicks.at(-1);

  if (!points.length) {
    return (
      <Card className="opacity-60">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Speed over distance</CardTitle>
            <CardDescription>
              Distance is plotted in kilometres; speed is shown in km/h.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-10 text-sm text-muted-foreground">
          No distance samples available for this activity.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Speed over distance</CardTitle>
          <CardDescription>
            Distance is plotted in kilometres; speed is shown in km/h.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-2 pt-4 sm:px-6 sm:pt-6 lg:flex-row lg:items-start">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={points}
              margin={{ top: 16, right: 24, left: 8, bottom: 0 }}
              onMouseMove={(state) => {
                const sample = state?.activePayload?.[0]?.payload as
                  | MetricPoint
                  | undefined;
                if (sample?.recordId != null) {
                  onHoverRecord(sample.recordId);
                }
              }}
              onMouseLeave={() => onHoverRecord(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="distanceKm"
                type="number"
                domain={
                  maxTick !== undefined ? [0, maxTick] : [0, "dataMax" as const]
                }
                ticks={distanceTicks}
                allowDecimals={false}
                tickFormatter={(value) => `${Number(value).toFixed(0)} km`}
                tickMargin={12}
              />
              <YAxis
                dataKey="speedKph"
                tickFormatter={(value) => `${value.toFixed(0)} km/h`}
                width={64}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "speedKph") {
                    return [`${Number(value).toFixed(1)} km/h`, "Speed"];
                  }
                  return value;
                }}
                labelFormatter={(value) =>
                  formatDistance(Number(value), maxTick)
                }
              />
              <Legend />
              {activePoint && (
                <ReferenceLine
                  x={activePoint.distanceKm}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                />
              )}
              <Line
                type="monotone"
                dataKey="speedKph"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name="Speed"
                isAnimationActive={false}
              />
              {activePoint && (
                <ReferenceDot
                  x={activePoint.distanceKm}
                  y={activePoint.speedKph}
                  r={5}
                  fill="#3b82f6"
                  stroke="#1d4ed8"
                  isFront
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ChartSummary
          averageLabel="Average"
          averageValue={`${averageSpeed.toFixed(1)} km/h`}
          currentLabel="Current"
          currentValue={
            activePoint ? `${activePoint.speedKph.toFixed(1)} km/h` : "–"
          }
          distance={
            activePoint
              ? formatDistance(activePoint.distanceKm, maxTick)
              : "Hover chart or route"
          }
          extra={
            activePoint?.heartRate != null
              ? `${activePoint.heartRate} bpm`
              : undefined
          }
        />
      </CardContent>
    </Card>
  );
};

type HeartRateChartProps = {
  records: ActivityRecords;
  activePoint: MetricPoint | null;
  onHoverRecord: (recordId: number | null) => void;
};

const HeartRateChart = ({
  records,
  activePoint,
  onHoverRecord,
}: HeartRateChartProps) => {
  const heartRecords = useMemo(
    () => (records ?? []).filter((record) => record.heartRate != null),
    [records],
  );

  const heartPoints = useMemo(() => {
    if (!heartRecords.length) {
      return [] as MetricPoint[];
    }

    const maxPoints = 600;
    const step = Math.max(1, Math.floor(heartRecords.length / maxPoints));

    return heartRecords
      .filter((_, index) => index % step === 0)
      .map((record) => ({
        recordId: record.id,
        distanceKm: record.distance / 100_000,
        speedKph: record.speed,
        heartRate: record.heartRate!,
      }));
  }, [heartRecords]);

  const distanceTicks = useMemo(
    () => createDistanceTicks(heartPoints),
    [heartPoints],
  );
  const maxTick = distanceTicks.at(-1);

  const averageHeartRate = useMemo(() => {
    if (!heartPoints.length) {
      return null;
    }
    const total = heartPoints.reduce((sum, point) => sum + point.heartRate!, 0);
    return total / heartPoints.length;
  }, [heartPoints]);

  return (
    <Card className={!heartPoints.length ? "opacity-60" : undefined}>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Heart rate over distance</CardTitle>
          <CardDescription>
            Beats per minute plotted against distance covered.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-2 pt-4 sm:px-6 sm:pt-6 lg:flex-row lg:items-start">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={heartPoints}
              margin={{ top: 16, right: 24, left: 8, bottom: 0 }}
              onMouseMove={(state) => {
                if (!heartPoints.length) return;
                const sample = state?.activePayload?.[0]?.payload as
                  | MetricPoint
                  | undefined;
                if (sample?.recordId != null) {
                  onHoverRecord(sample.recordId);
                }
              }}
              onMouseLeave={() => onHoverRecord(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="distanceKm"
                type="number"
                domain={
                  maxTick !== undefined ? [0, maxTick] : [0, "dataMax" as const]
                }
                ticks={distanceTicks}
                allowDecimals={false}
                tickFormatter={(value) => `${Number(value).toFixed(0)} km`}
                tickMargin={12}
              />
              <YAxis
                dataKey="heartRate"
                tickFormatter={(value) => `${value} bpm`}
                width={60}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "heartRate") {
                    return [`${Number(value).toFixed(0)} bpm`, "Heart rate"];
                  }
                  return value;
                }}
                labelFormatter={(value) =>
                  formatDistance(Number(value), maxTick)
                }
              />
              <Legend />
              {activePoint && (
                <ReferenceLine
                  x={activePoint.distanceKm}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                />
              )}
              <Line
                type="monotone"
                dataKey="heartRate"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
                name="Heart rate"
                strokeOpacity={heartPoints.length ? 1 : 0.4}
                isAnimationActive={false}
              />
              {activePoint?.heartRate != null && (
                <ReferenceDot
                  x={activePoint.distanceKm}
                  y={activePoint.heartRate}
                  r={4}
                  fill="#ef4444"
                  stroke="#991b1b"
                  isFront
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ChartSummary
          averageLabel="Average"
          averageValue={
            averageHeartRate != null
              ? `${averageHeartRate.toFixed(0)} bpm`
              : "–"
          }
          currentLabel="Current"
          currentValue={
            activePoint?.heartRate != null
              ? `${activePoint.heartRate} bpm`
              : "–"
          }
          distance={
            activePoint
              ? formatDistance(activePoint.distanceKm, maxTick)
              : "Hover chart or route"
          }
        />
      </CardContent>
    </Card>
  );
};

type ChartSummaryProps = {
  averageLabel: string;
  averageValue: string;
  currentLabel: string;
  currentValue: string;
  distance: string;
  extra?: string;
};

function ChartSummary({
  averageLabel,
  averageValue,
  currentLabel,
  currentValue,
  distance,
  extra,
}: ChartSummaryProps) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground lg:w-56">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {averageLabel}
        </p>
        <p className="text-base font-semibold text-foreground">
          {averageValue}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {currentLabel}
        </p>
        <p className="text-base font-semibold text-foreground">
          {currentValue}
        </p>
        <p className="text-xs text-muted-foreground">{distance}</p>
        {extra && <p className="text-xs text-muted-foreground">{extra}</p>}
      </div>
    </div>
  );
}

export default Activity;
