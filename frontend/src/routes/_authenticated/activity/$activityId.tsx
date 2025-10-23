import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
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
} from "@/components/ui/card";
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
import {
  Activity as CadenceIcon,
  Clock,
  Gauge,
  HeartPulse,
  MapPin,
  TrendingUp,
} from "lucide-react";

import { MAX_HEART_RATE_POINTS, UNKNOWN_VALUE } from "@/features/activity/constants";
import type { ActivityRecords, MetricPoint, StatItem } from "@/features/activity/types";
import { createDistanceTicks, formatDistance } from "@/features/activity/utils";
import { useActivityDerivedData } from "@/features/activity/hooks/useActivityDerivedData";

const LazyMap = lazy(() => import("../../../components/map/lazyMap"));

export const Route = createFileRoute("/_authenticated/activity/$activityId")({
  component: Activity,
  loader: async ({ context: { supabase }, ...rest }) => {
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

/**
 * Activity detail page displaying route metrics, charts, and an interactive map.
 */
function Activity() {
  const { activityId, authToken } = Route.useLoaderData();

  // const { updateActivity } = useActivity();

  const { data: activity } = useQuery(getActivity, {
    activityId: activityId,
  });

  const {
    metricsPoints,
    sampleByRecordId,
    routeInfo,
    mapboxRecords,
    totalDistanceKm,
    distanceLabel,
    avgSpeedLabel,
    maxSpeedLabel,
    elapsedTimeLabel,
    averageHeartRateValue,
    averageHeartRateLabel,
    maxHeartRateValue,
    maxHeartRateLabel,
    averageCadenceValue,
    averageCadenceLabel,
    maxCadenceValue,
    maxCadenceLabel,
    recordCountLabel,
    recordedOnLabel,
    detailItems,
    distanceTicks,
  } = useActivityDerivedData(activity, activityId);

  const formMethods = useForm<z.infer<typeof formSchema>>({
    mode: "onBlur",
    resolver: zodResolver(formSchema),
    defaultValues: {
      activityName: activity?.activityName,
    },
  });

  const [editTitle, setEditTitle] = useState<boolean>(false);
  const [activeRecordId, setActiveRecordId] = useState<number | null>(null);
  /**
   * Synchronises hover state between the map and charts.
   */
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
  const heroStats: StatItem[] = useMemo(() => {
    const stats: StatItem[] = [
      {
        label: "Distance",
        value: distanceLabel,
        helper: "Total distance covered",
        icon: MapPin,
      },
      {
        label: "Elapsed time",
        value: elapsedTimeLabel,
        helper: "Recorded duration",
        icon: Clock,
      },
      {
        label: "Avg speed",
        value: avgSpeedLabel,
        helper: "Moving average speed",
        icon: Gauge,
      },
      {
        label: "Max speed",
        value: maxSpeedLabel,
        helper: "Top recorded speed",
        icon: TrendingUp,
      },
    ];
    if (averageHeartRateValue != null) {
      stats.push({
        label: "Avg heart rate",
        value: averageHeartRateLabel,
        helper: "Across recorded samples",
        icon: HeartPulse,
      });
    }
    if (averageCadenceValue != null) {
      stats.push({
        label: "Avg cadence",
        value: averageCadenceLabel,
        helper: "Average pedal rpm",
        icon: CadenceIcon,
      });
    }
    return stats;
  }, [
    averageCadenceLabel,
    averageCadenceValue,
    averageHeartRateLabel,
    averageHeartRateValue,
    avgSpeedLabel,
    distanceLabel,
    elapsedTimeLabel,
    maxSpeedLabel,
  ]);
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (data.activityName != activity?.activityName && authToken) {
      // updateActivity.mutate(
      //   {
      //     jwtToken: authToken,
      //     activityId: activity?.id,
      //     activityName: data.activityName,
      //   },
      //   onSuccess: async () => {
      //   },
      //   onError: (error) => {
      //     console.error("Error updating activity:", error);
      //   },
      // );
    }

    setEditTitle(false);
  };
  const handleCancelEdit = useCallback(() => {
    formMethods.reset({ activityName: activity?.activityName });
    setEditTitle(false);
  }, [activity?.activityName, formMethods]);
  useEffect(() => {
    formMethods.reset({ activityName: activity?.activityName });
  }, [activity?.activityName, formMethods]);

  return (
    <div className="space-y-10 pb-12">
      <FormProvider {...formMethods}>
        <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-50 shadow-2xl">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute -left-24 top-[-20%] h-64 w-64 rounded-full bg-sky-500/40 blur-3xl" />
            <div className="absolute right-[-16%] bottom-[-30%] h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl" />
          </div>
          <div className="relative space-y-8 p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-slate-200/80">
                <Badge variant="outline" className="border-white/30 text-white">
                  Activity #{activity?.id ?? activityId}
                </Badge>
                <span className="rounded-full bg-white/10 px-3 py-1 text-white/80">
                  {recordedOnLabel !== UNKNOWN_VALUE
                    ? recordedOnLabel
                    : "Date unavailable"}
                </span>
              </div>
                {editTitle ? (
                  <form
                    className="flex flex-col gap-3 md:flex-row md:items-center"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onSubmit(formMethods.getValues());
                    }}
                  >
                    <FormField
                      control={formMethods.control}
                      name="activityName"
                      render={({ field }) => (
                        <FormItem className="w-full max-w-xl">
                          <FormControl>
                            <Input
                              {...field}
                              autoFocus
                              onBlur={() => onSubmit(formMethods.getValues())}
                              placeholder="Name this ride"
                              className="h-12 border-white/20 bg-white/10 text-lg text-white placeholder:text-white/60 focus-visible:ring-white"
                            />
                          </FormControl>
                          <FormMessage className="text-xs text-red-200" />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        variant="secondary"
                        className="bg-white text-slate-900 hover:bg-slate-100"
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/10"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                      {activity?.activityName ?? "Untitled activity"}
                    </h1>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="bg-white/20 text-white hover:bg-white/30"
                      onClick={() => setEditTitle(true)}
                    >
                      <Pencil2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <p className="max-w-2xl text-sm text-slate-200/80 sm:text-base">
                  Dive into the metrics for this ride. Hover the map or charts
                  to explore each recorded sample and see how your speed and
                  heart rate evolved across the route.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {heroStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-xs uppercase tracking-wider text-slate-200/70">
                        {stat.label}
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {stat.value}
                      </p>
                      {stat.helper && (
                        <p className="text-xs text-slate-200/60">
                          {stat.helper}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </FormProvider>

      <section className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card className="overflow-hidden border border-border/60 shadow-lg">
          <CardHeader className="space-y-1 border-b bg-muted/30 px-6 py-5">
            <CardTitle className="text-lg">Route overview</CardTitle>
            <CardDescription>
              Hover the map to highlight samples and sync with charts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-6">
            {routeInfo.route.length >= 2 ? (
              <Suspense
                fallback={
                  <div className="flex h-[360px] w-full items-center justify-center rounded-2xl border border-dashed border-muted-foreground/20 bg-muted/40">
                    <p className="text-sm text-muted-foreground">
                      Loading map…
                    </p>
                  </div>
                }
              >
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/40">
                  <LazyMap
                    initialLat={routeInfo.centerLat}
                    initialLng={routeInfo.centerLng}
                    records={mapboxRecords}
                    route={routeInfo.route}
                    focusedRecordId={activeRecordId}
                    onRecordHover={handleRecordHover}
                  />
                </div>
              </Suspense>
            ) : (
              <div className="flex h-[360px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/40 text-center">
                <p className="text-sm font-medium text-foreground">
                  No route coordinates available
                </p>
                <p className="text-xs text-muted-foreground">
                  Upload an activity with GPS data to view the map.
                </p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-xs text-muted-foreground">Total distance</p>
                <p className="text-sm font-semibold text-foreground">
                  {distanceLabel}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-xs text-muted-foreground">Samples</p>
                <p className="text-sm font-semibold text-foreground">
                  {recordCountLabel}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Focused record ID
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {activeSample ? `#${activeSample.recordId}` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-lg">
          <CardHeader className="space-y-1 border-b bg-muted/30 px-6 py-5">
            <CardTitle className="text-lg">Ride details</CardTitle>
            <CardDescription>
              Key metadata pulled from the activity file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-6">
            <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  Focused sample
                </p>
                {activeSample && (
                  <Badge variant="outline" className="border-border/60">
                    Record #{activeSample.recordId}
                  </Badge>
                )}
              </div>
              {activeSample ? (
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">
                      Distance
                    </dt>
                    <dd className="font-medium text-foreground">
                      {formatDistance(activeSample.distanceKm, totalDistanceKm)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">
                      Speed
                    </dt>
                    <dd className="font-medium text-foreground">
                      {activeSample.speedKph.toFixed(1)} km/h
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">
                      Heart rate
                    </dt>
                    <dd className="font-medium text-foreground">
                      {activeSample.heartRate != null
                        ? `${activeSample.heartRate} bpm`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">
                      Cadence
                    </dt>
                    <dd className="font-medium text-foreground">
                      {activeSample.cadence != null
                        ? `${activeSample.cadence} rpm`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Hover the map or charts to inspect an individual sample.
                </p>
              )}
            </div>
            <div className="grid gap-3 text-sm">
              {detailItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-3 py-2"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <SpeedChart
          points={metricsPoints}
          distanceTicks={distanceTicks}
          activePoint={activeSample}
          onHoverRecord={handleRecordHover}
        />
        <HeartRateChart
          records={activity?.records ?? []}
          activePoint={activeSample}
          onHoverRecord={handleRecordHover}
        />
      </section>
    </div>
  );
}
type MetricsChartProps = {
  points: MetricPoint[];
  distanceTicks: number[];
  activePoint: MetricPoint | null;
  onHoverRecord: (recordId: number | null) => void;
};

/**
 * Renders the speed-over-distance line chart with hover synchronisation.
 */
const SpeedChart = ({
  points,
  distanceTicks,
  activePoint,
  onHoverRecord,
}: MetricsChartProps) => {
  const averageSpeed = useMemo(() => {
    if (!points.length) {
      return 0;
    }
    const total = points.reduce((sum, point) => sum + point.speedKph, 0);
    return total / points.length;
  }, [points]);
  const maxTick = distanceTicks.at(-1);
  const summaryPoint = activePoint ?? points[0];

  if (!points.length) {
    return (
      <Card className="h-full border border-border/60 bg-muted/40 text-muted-foreground">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-muted/30 px-6 py-5 sm:flex-row">
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
    <Card className="h-full border border-border/60 shadow-lg">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-muted/30 px-6 py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Speed over distance</CardTitle>
          <CardDescription>
            Distance is plotted in kilometres; speed is shown in km/h.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-start">
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
            summaryPoint ? `${summaryPoint.speedKph.toFixed(1)} km/h` : "No samples"
          }
          distance={
            summaryPoint
              ? formatDistance(summaryPoint.distanceKm, maxTick)
              : "No samples"
          }
          extra={
            summaryPoint?.heartRate != null
              ? `${summaryPoint.heartRate} bpm`
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

    const maxPoints = MAX_HEART_RATE_POINTS;
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
  const summaryPoint = activePoint ?? heartPoints[0];

  if (!heartPoints.length) {
    return (
      <Card className="h-full border border-border/60 bg-muted/40 text-muted-foreground">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-muted/30 px-6 py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Heart rate over distance</CardTitle>
            <CardDescription>
              Beats per minute plotted against distance covered.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-10 text-sm text-muted-foreground">
          No heart rate samples available for this activity.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border border-border/60 shadow-lg">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-muted/30 px-6 py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Heart rate over distance</CardTitle>
          <CardDescription>
            Beats per minute plotted against distance covered.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-start">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={heartPoints}
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
              : UNKNOWN_VALUE
          }
          currentLabel="Current"
          currentValue={
            summaryPoint?.heartRate != null
              ? `${summaryPoint.heartRate} bpm`
              : heartPoints.length
                ? "No heart rate"
                : "No samples"
          }
          distance={
            summaryPoint
              ? formatDistance(summaryPoint.distanceKm, maxTick)
              : "No samples"
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

/**
 * Displays the compact summary card next to the charts.
 */
function ChartSummary({
  averageLabel,
  averageValue,
  currentLabel,
  currentValue,
  distance,
  extra,
}: ChartSummaryProps) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-border/60 bg-muted/30 px-5 py-5 text-sm text-muted-foreground lg:w-56">
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
