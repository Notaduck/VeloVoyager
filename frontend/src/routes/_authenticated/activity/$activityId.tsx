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
import type { GetActivityResponse } from "@/gen/activity/v1/activity_pb";
import { useQuery } from "@connectrpc/connect-query";
import type { SurfaceSummary } from "@/components/map/lazyMap";

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
  Clock,
  Gauge,
  HeartPulse,
  Layers2,
  MapPin,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
      (record): record is RecordWithCoordinates =>
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

  const mapboxRecords = useMemo(
    () =>
      (activity?.records ?? []).map((record) => ({
        id: record.id,
        distance: record.distance,
        speed: record.speed,
        heartRate: record.heartRate ?? undefined,
        timeStamp: undefined,
        coordinates: record.coordinates
          ? { x: record.coordinates.x, y: record.coordinates.y }
          : undefined,
      })),
    [activity?.records],
  );

  const formMethods = useForm<z.infer<typeof formSchema>>({
    mode: "onBlur",
    resolver: zodResolver(formSchema),
    defaultValues: {
      activityName: activity?.activityName,
    },
  });

  const [editTitle, setEditTitle] = useState<boolean>(false);
  const [activeRecordId, setActiveRecordId] = useState<number | null>(null);
  const [surfaceSummary, setSurfaceSummary] = useState<SurfaceSummary | null>(
    null,
  );
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
  const handleSurfaceSummary = useCallback((summary: SurfaceSummary | null) => {
    setSurfaceSummary(summary);
  }, []);
  const activeSample = useMemo(() => {
    if (activeRecordId == null) {
      return null;
    }
    return sampleByRecordId.get(activeRecordId) ?? null;
  }, [activeRecordId, sampleByRecordId]);
  const totalDistanceKm =
    metricsPoints.length > 0
      ? metricsPoints[metricsPoints.length - 1].distanceKm
      : 0;
  const averageHeartRateValue = useMemo(() => {
    const heartRecords = (activity?.records ?? []).filter(
      (record) => record.heartRate != null,
    );
    if (!heartRecords.length) {
      return null;
    }
    const total = heartRecords.reduce(
      (sum, record) => sum + (record.heartRate ?? 0),
      0,
    );
    return total / heartRecords.length;
  }, [activity?.records]);
  const maxHeartRateValue = useMemo(() => {
    const heartRecords = (activity?.records ?? []).filter(
      (record) => record.heartRate != null,
    );
    if (!heartRecords.length) {
      return null;
    }
    return Math.max(
      ...heartRecords.map((record) => record.heartRate ?? Number.NEGATIVE_INFINITY),
    );
  }, [activity?.records]);
  const surfaceBreakdown = surfaceSummary?.breakdown ?? [];
  const dominantSurface = surfaceBreakdown[0];
  const distanceLabel =
    totalDistanceKm > 0 ? formatDistance(totalDistanceKm) : "—";
  const avgSpeedLabel =
    typeof activity?.avgSpeed === "number"
      ? `${activity.avgSpeed.toFixed(1)} km/h`
      : "—";
  const maxSpeedLabel =
    typeof activity?.maxSpeed === "number"
      ? `${activity.maxSpeed.toFixed(1)} km/h`
      : "—";
  const elapsedTimeLabel = activity?.elapsedTime ?? "—";
  const averageHeartRateLabel =
    averageHeartRateValue != null
      ? `${Math.round(averageHeartRateValue)} bpm`
      : "—";
  const maxHeartRateLabel =
    maxHeartRateValue != null ? `${maxHeartRateValue} bpm` : "—";
  const recordCountLabel = (activity?.records?.length ?? 0).toLocaleString();
  const recordedOnLabel = useMemo(() => {
    if (!activity?.createdAt) {
      return "—";
    }
    const parsed = new Date(activity.createdAt);
    if (Number.isNaN(parsed.getTime())) {
      return activity.createdAt;
    }
    return parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [activity?.createdAt]);
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
    if (dominantSurface) {
      stats.push({
        label: "Primary surface",
        value: dominantSurface.label,
        helper: `${Math.round(dominantSurface.percentage * 100)}% of route`,
        icon: Layers2,
      });
    }
    return stats;
  }, [
    averageHeartRateLabel,
    averageHeartRateValue,
    avgSpeedLabel,
    distanceLabel,
    elapsedTimeLabel,
    maxSpeedLabel,
    dominantSurface,
  ]);
  const detailItems = useMemo(
    () => [
      { label: "Activity ID", value: `#${activity?.id ?? activityId}` },
      { label: "Recorded on", value: recordedOnLabel },
      { label: "Samples", value: recordCountLabel },
      {
        label: "Max heart rate",
        value: averageHeartRateValue != null ? maxHeartRateLabel : "—",
      },
      {
        label: "Dominant surface",
        value: dominantSurface
          ? `${dominantSurface.label} (${Math.round(dominantSurface.percentage * 100)}%)`
          : "—",
      },
    ],
    [
      activity?.id,
      activityId,
      averageHeartRateValue,
      maxHeartRateLabel,
      recordCountLabel,
      recordedOnLabel,
      dominantSurface,
    ],
  );
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
                  {recordedOnLabel !== "—" ? recordedOnLabel : "Date unavailable"}
                </span>
                {dominantSurface && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
                    <Layers2 className="h-3.5 w-3.5" />
                    {dominantSurface.label}
                  </span>
                )}
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
                    onSurfaceSummary={handleSurfaceSummary}
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
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
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
            {surfaceBreakdown.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    Surface mix
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {surfaceSummary?.total?.toLocaleString() ?? 0} samples
                  </span>
                </div>
                <div className="space-y-2">
                  {surfaceBreakdown.map((entry) => (
                    <div key={entry.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          <span
                            className={`h-2 w-2 rounded-full ${SURFACE_COLOR_CLASSES[entry.label] ?? "bg-slate-400"}`}
                          />
                          {entry.label}
                        </span>
                        <span>{Math.round(entry.percentage * 100)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${SURFACE_COLOR_CLASSES[entry.label] ?? "bg-slate-400"}`}
                          style={{ width: `${Math.max(entry.percentage * 100, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <SpeedChart
          points={metricsPoints}
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

type MetricPoint = {
  recordId: number;
  distanceKm: number;
  speedKph: number;
  heartRate: number | null;
};

type StatItem = {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
};

type ActivityRecords = GetActivityResponse["records"];
type RecordWithCoordinates = ActivityRecords[number] & {
  coordinates: NonNullable<ActivityRecords[number]["coordinates"]>;
};

const SURFACE_COLOR_CLASSES: Record<string, string> = {
  Paved: "bg-sky-500",
  Unpaved: "bg-slate-500",
  Gravel: "bg-amber-500",
  Dirt: "bg-amber-700",
  Trail: "bg-emerald-500",
  "Unknown surface": "bg-slate-400",
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
              : "–"
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
