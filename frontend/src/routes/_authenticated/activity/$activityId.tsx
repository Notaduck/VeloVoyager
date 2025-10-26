import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  getActivity,
  updateActivity,
  uploadActivityImage,
} from "@/gen/activity/v1/activity-ActivityService_connectquery";
import { useQuery, useMutation } from "@connectrpc/connect-query";
import { useQueryClient } from "@tanstack/react-query";
import { create } from "@bufbuild/protobuf";
import { UpdateActivityRequestSchema } from "@/gen/activity/v1/activity_pb";

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
  MAX_CADENCE_POINTS,
  MAX_HEART_RATE_POINTS,
  UNKNOWN_VALUE,
} from "@/features/activity/constants";
import type {
  ActivityRecords,
  DetailItem,
  MetricPoint,
  StatItem,
} from "@/features/activity/types";
import { createDistanceTicks, formatDistance } from "@/features/activity/utils";
import { useActivityDerivedData } from "@/features/activity/hooks/useActivityDerivedData";

const LazyMap = lazy(() => import("../../../components/map/lazyMap"));

const rideTypeOptions = [
  { value: "road", label: "Road", icon: Bike },
  { value: "gravel", label: "Gravel", icon: Mountain },
  { value: "mtb", label: "MTB", icon: TreePine },
  { value: "tt", label: "TT", icon: Wind },
];

import {
  Activity as CadenceIcon,
  Bike,
  Clock,
  Gauge,
  HeartPulse,
  MapPin,
  Mountain,
  Timer,
  TreePine,
  TrendingUp,
  Wind,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/activity/$activityId")({
  component: Activity,
  loader: async ({ context: { supabase }, ...rest }) => {
    const activityId = Number(rest.params.activityId);
    const jwt = await (supabase as SupabaseClient).auth
      .getSession()
      .then((session) => session.data.session?.access_token);

    return {
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
  const { activityId } = Route.useLoaderData();
  const queryClient = useQueryClient();

  // const { updateActivity } = useActivity();
  const updateActivityMutation = useMutation(updateActivity);
  const uploadActivityMedia = useMutation(uploadActivityImage);

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
    totalTimeLabel,
    averageHeartRateValue,
    averageHeartRateLabel,
    maxHeartRateLabel,
    averageCadenceValue,
    averageCadenceLabel,
    maxCadenceLabel,
    recordCountLabel,
    recordedOnLabel,
    detailItems,
    distanceTicks,
  } = useActivityDerivedData(activity, activityId);

  const rideType = (activity?.rideType ?? "road").toLowerCase();
  const [pendingRideType, setPendingRideType] = useState<string | null>(null);

  const handleRideTypeChange = useCallback(
    async (value: string) => {
      if (value === rideType || pendingRideType === value) {
        return;
      }

      setPendingRideType(value);

      try {
        const request = create(UpdateActivityRequestSchema, {
          activityId: Number(activityId),
          rideType: value,
        });

        console.log("Sending update request:", request);
        const response = await updateActivityMutation.mutateAsync(request);
        console.log("Update response:", response);

        // Invalidate all queries to force refetch
        await queryClient.invalidateQueries();

        console.log("Ride type updated successfully");
        setPendingRideType(null);
      } catch (error) {
        console.error("Failed to update ride type", error);
        setPendingRideType(null);
      }
    },
    [activityId, pendingRideType, rideType, updateActivityMutation, queryClient]
  );

  const rideTypeLabel = useMemo(() => {
    const match = rideTypeOptions.find((option) => option.value === rideType);
    return match?.label ?? rideType;
  }, [rideType]);

  const detailItemsWithRideType = useMemo(
    () => [
      { label: "Ride type", value: rideTypeLabel } satisfies DetailItem,
      ...detailItems,
    ],
    [detailItems, rideTypeLabel]
  );

  const hasRouteData = routeInfo.route.length >= 2;
  const mapCardRef = useRef<HTMLDivElement | null>(null);
  const mapPlaceholderRef = useRef<HTMLDivElement | null>(null);
  const [mapHeight, setMapHeight] = useState<number>(360);
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(false);
  const [isMapPinned, setIsMapPinned] = useState<boolean>(false);

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
    [setActiveRecordId]
  );
  const activeSample = useMemo(() => {
    if (activeRecordId == null) {
      return null;
    }
    return sampleByRecordId.get(activeRecordId) ?? null;
  }, [activeRecordId, sampleByRecordId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktopViewport(event.matches);
    };

    setIsDesktopViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!hasRouteData) {
      return;
    }

    const node = mapCardRef.current;
    if (!node) {
      return;
    }

    const updateHeight = (nextHeight: number) => {
      setMapHeight((previous) => {
        if (Math.abs(previous - nextHeight) < 1) {
          return previous;
        }
        return nextHeight;
      });
    };

    if (typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }
        updateHeight(entry.contentRect.height);
      });

      resizeObserver.observe(node);
      return () => resizeObserver.disconnect();
    }

    updateHeight(node.offsetHeight);
    const handleResize = () => updateHeight(node.offsetHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [hasRouteData]);

  useEffect(() => {
    if (!isDesktopViewport || !hasRouteData) {
      setIsMapPinned(false);
      return;
    }

    const handleScroll = () => {
      const sentinel = mapPlaceholderRef.current;
      if (!sentinel) {
        return;
      }

      const { top } = sentinel.getBoundingClientRect();
      const shouldPin = top <= 72;

      setIsMapPinned((previous) => {
        if (previous === shouldPin) {
          return previous;
        }
        return shouldPin;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasRouteData, isDesktopViewport]);
  type HeroMetric = StatItem;
  const heroStats: HeroMetric[] = useMemo(
    () => [
      {
        label: "Distance",
        value: distanceLabel,
        helper: "Total distance covered",
        icon: MapPin,
        rowSpan: 2,
      },
      {
        label: "Total time",
        value: totalTimeLabel,
        helper: "Overall recorded duration",
        icon: Clock,
      },
      {
        label: "Ride time",
        value: elapsedTimeLabel,
        helper: "Moving time while recording",
        icon: Timer,
      },
      {
        label: "Max cadence",
        value: maxCadenceLabel,
        helper: "Peak pedal rpm",
        icon: CadenceIcon,
      },
      {
        label: "Avg cadence",
        value:
          averageCadenceValue != null ? averageCadenceLabel : UNKNOWN_VALUE,
        helper: "Average pedal rpm",
        icon: CadenceIcon,
      },
      {
        label: "Max speed",
        value: maxSpeedLabel,
        helper: "Top recorded speed",
        icon: TrendingUp,
      },
      {
        label: "Avg speed",
        value: avgSpeedLabel,
        helper: "Moving average speed",
        icon: Gauge,
      },
      {
        label: "Max heart rate",
        value: maxHeartRateLabel,
        helper: "Peak recorded bpm",
        icon: HeartPulse,
      },
      {
        label: "Avg heart rate",
        value:
          averageHeartRateValue != null ? averageHeartRateLabel : UNKNOWN_VALUE,
        helper: "Across recorded samples",
        icon: HeartPulse,
      },
    ],
    [
      averageCadenceLabel,
      averageCadenceValue,
      averageHeartRateLabel,
      averageHeartRateValue,
      avgSpeedLabel,
      distanceLabel,
      elapsedTimeLabel,
      maxCadenceLabel,
      maxHeartRateLabel,
      maxSpeedLabel,
      totalTimeLabel,
    ]
  );
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (data.activityName != activity?.activityName && activity?.id) {
      try {
        const request = create(UpdateActivityRequestSchema, {
          activityId: activity.id,
          activityName: data.activityName,
        });

        await updateActivityMutation.mutateAsync(request);

        // Invalidate all queries to force refetch
        await queryClient.invalidateQueries();

        console.log("Activity updated successfully");
      } catch (error) {
        console.error("Error updating activity:", error);
      }
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
                  <Badge
                    variant="outline"
                    className="border-white/30 text-white"
                  >
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:auto-rows-[minmax(0,1fr)]">
              {heroStats.map(
                ({ colSpan, rowSpan, icon: Icon, label, value, helper }) => {
                  const colClass =
                    colSpan === 2
                      ? "lg:col-span-2"
                      : colSpan === 3
                        ? "lg:col-span-3"
                        : "";
                  const rowClass = rowSpan === 2 ? "lg:row-span-2" : "";
                  return (
                    <div
                      key={label}
                      className={clsx(
                        "flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100",
                        colClass,
                        rowClass
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="space-y-0.5">
                          <p className="text-xs uppercase tracking-wider text-slate-200/70">
                            {label}
                          </p>
                          <p className="text-sm font-semibold text-white">
                            {value}
                          </p>
                          {helper && (
                            <p className="text-xs text-slate-200/60">
                              {helper}
                            </p>
                          )}
                        </div>
                      </div>
                      {label === "Distance" && (
                        <div className="mt-1 space-y-2 text-xs text-slate-200/70">
                          <p className="uppercase tracking-wider">Ride type</p>
                          <div className="flex flex-wrap gap-2">
                            {rideTypeOptions.map((option) => {
                              const OptionIcon = option.icon;
                              const isActive =
                                pendingRideType != null
                                  ? pendingRideType === option.value
                                  : rideType === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() =>
                                    handleRideTypeChange(option.value)
                                  }
                                  disabled={
                                    pendingRideType != null &&
                                    pendingRideType !== option.value
                                  }
                                  className={clsx(
                                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] transition",
                                    isActive
                                      ? "border-white bg-white/20 text-white"
                                      : "border-white/20 text-slate-200 hover:border-white/40",
                                    pendingRideType !== null &&
                                      pendingRideType !== option.value &&
                                      "opacity-60"
                                  )}
                                >
                                  <OptionIcon className="h-3.5 w-3.5" />
                                  <span>{option.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </section>
      </FormProvider>

      <section className="grid gap-6 xl:grid-cols">
        {hasRouteData && (
          <div
            ref={mapPlaceholderRef}
            aria-hidden="true"
            style={{ height: isMapPinned ? mapHeight : 0 }}
          />
        )}

        <div
          ref={hasRouteData ? mapCardRef : null}
          className={clsx(
            "map-shell overflow-hidden rounded-2xl bg-muted/40",
            hasRouteData
              ? "border border-border/60"
              : "border border-dashed border-muted-foreground/30",
            hasRouteData && isMapPinned && "map-shell--pinned"
          )}
        >
          {hasRouteData ? (
            <Suspense
              fallback={
                <div className="map-shell__fallback flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Loading map…</p>
                </div>
              }
            >
              <LazyMap
                initialLat={routeInfo.centerLat}
                initialLng={routeInfo.centerLng}
                records={mapboxRecords}
                route={routeInfo.route}
                focusedRecordId={activeRecordId}
                onRecordHover={handleRecordHover}
              />
            </Suspense>
          ) : (
            <div className="map-shell__fallback map-shell__empty flex flex-col items-center justify-center gap-2">
              <p className="text-sm font-medium text-foreground">
                No route coordinates available
              </p>
              <p className="text-xs text-muted-foreground">
                Upload an activity with GPS data to view the map.
              </p>
            </div>
          )}
        </div>
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
        <CadenceChart
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
            summaryPoint
              ? `${summaryPoint.speedKph.toFixed(1)} km/h`
              : "No samples"
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
    [records]
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
        cadence: record.cadence ?? null,
      }));
  }, [heartRecords]);

  const distanceTicks = useMemo(
    () => createDistanceTicks(heartPoints),
    [heartPoints]
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

type CadenceChartProps = {
  records: ActivityRecords;
  activePoint: MetricPoint | null;
  onHoverRecord: (recordId: number | null) => void;
};

const CadenceChart = ({
  records,
  activePoint,
  onHoverRecord,
}: CadenceChartProps) => {
  const cadenceRecords = useMemo(
    () => (records ?? []).filter((record) => record.cadence != null),
    [records]
  );

  const cadencePoints = useMemo(() => {
    if (!cadenceRecords.length) {
      return [] as MetricPoint[];
    }

    const maxPoints = MAX_CADENCE_POINTS;
    const step = Math.max(1, Math.floor(cadenceRecords.length / maxPoints));

    return cadenceRecords
      .filter((_, index) => index % step === 0)
      .map((record) => ({
        recordId: record.id,
        distanceKm: record.distance / 100_000,
        speedKph: record.speed,
        cadence: record.cadence!,
        heartRate: record.heartRate ?? null,
      }));
  }, [cadenceRecords]);

  const distanceTicks = useMemo(
    () => createDistanceTicks(cadencePoints),
    [cadencePoints]
  );
  const maxTick = distanceTicks.at(-1);

  const averageCadence = useMemo(() => {
    if (!cadencePoints.length) {
      return null;
    }
    const total = cadencePoints.reduce(
      (sum, point) => sum + (point.cadence ?? 0),
      0
    );
    return total / cadencePoints.length;
  }, [cadencePoints]);
  const summaryPoint = activePoint ?? cadencePoints[0];

  if (!cadencePoints.length) {
    return (
      <Card className="h-full border border-border/60 bg-muted/40 text-muted-foreground">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-muted/30 px-6 py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Cadence over distance</CardTitle>
            <CardDescription>
              Pedal revolutions per minute plotted against distance.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-10 text-sm text-muted-foreground">
          No cadence samples available for this activity.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border border-border/60 shadow-lg">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-muted/30 px-6 py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Cadence over distance</CardTitle>
          <CardDescription>
            Pedal cadence shown in rpm alongside the recorded distance.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-start">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={cadencePoints}
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
                dataKey="cadence"
                tickFormatter={(value) => `${value} rpm`}
                width={60}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "cadence") {
                    return [`${Number(value).toFixed(0)} rpm`, "Cadence"];
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
                dataKey="cadence"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name="Cadence"
                isAnimationActive={false}
              />
              {activePoint && activePoint.cadence != null && (
                <ReferenceDot
                  x={activePoint.distanceKm}
                  y={activePoint.cadence}
                  r={5}
                  fill="#22c55e"
                  stroke="#15803d"
                  isFront
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ChartSummary
          averageLabel="Average"
          averageValue={
            averageCadence != null
              ? `${averageCadence.toFixed(0)} rpm`
              : UNKNOWN_VALUE
          }
          currentLabel="Current"
          currentValue={
            summaryPoint?.cadence != null
              ? `${summaryPoint.cadence} rpm`
              : cadencePoints.length
                ? "No cadence"
                : "No samples"
          }
          distance={
            summaryPoint
              ? formatDistance(summaryPoint.distanceKm, maxTick)
              : "No samples"
          }
          extra={
            summaryPoint?.speedKph != null
              ? `${summaryPoint.speedKph.toFixed(1)} km/h`
              : undefined
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
