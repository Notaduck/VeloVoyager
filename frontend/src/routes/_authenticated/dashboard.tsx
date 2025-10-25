import { useState } from "react"
import {
  Activity as ActivityIcon,
  Calendar,
  File,
  FileCheck2Icon,
  ListFilter,
  Target,
  TrendingUp,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@radix-ui/react-dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs"
import { SupabaseClient } from "@supabase/supabase-js"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { FormProvider, useForm } from "react-hook-form"
import {
  FormControl,
  FormItem,
  FormField,
  FormMessage,
} from "@/components/ui/form"
import { Dropzone } from "@/components/ui/dropzone"
import { Progress } from "@/components/ui/progress"
import { getActivities } from "@/gen/activity/v1/activity-ActivityService_connectquery"
import { useQuery } from "@connectrpc/connect-query"
import { useUploadActivities } from "@/hooks/uploadActivity"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,

  loader: async ({ context: { supabase } }) => {
    const jwt = await (supabase as SupabaseClient).auth
      .getSession()
      .then((session) => session.data.session?.access_token)
    return {
      authToken: jwt,
    }
  },
})

function Dashboard() {
  const navigate = useNavigate()

  const [weeklyProgress] = useState<number>(0)
  const [monthlyProgress] = useState<number>(0)

  const { data } = useQuery(getActivities)

  type FormValues = { files: undefined | FileList }

  const defaultValues: FormValues = {
    files: undefined,
  }

  const methods = useForm<FormValues>({
    defaultValues,
    shouldFocusError: true,
    shouldUnregister: false,
    shouldUseNativeValidation: false,
  })

  const { uploadActivities, status } = useUploadActivities()
  const activities = data?.activities ?? []
  const totalActivities = activities.length
  const latestActivity = activities[0]
  const latestSubtitle = latestActivity
    ? [
      latestActivity.totalTime,
      latestActivity.distance != null
        ? `${latestActivity.distance} (unit)`
        : null,
    ]
      .filter(Boolean)
      .join(" • ")
    : "Your next upload will appear here."
  const weeklyProgressValue = Math.min(Math.max(weeklyProgress, 0), 100)
  const monthlyProgressValue = Math.min(Math.max(monthlyProgress, 0), 100)
  const selectedFiles = methods.watch("files")

  async function handleFormSubmit(values: FormValues) {
    if (!values.files || values.files.length === 0) {
      methods.setError("files", {
        message: "File is required",
        type: "typeError",
      })
      return
    }

    const success = await uploadActivities(values.files)
    if (success) {
      methods.reset(defaultValues)
    }
  }

  const allowedMimeTypes = ["application/fits"]
  const allowedExtensions = ["fit", "fits"]
  const allowedExtensionsLabel = allowedExtensions
    .map((extension) => `.${extension}`)
    .join(", ")
  const acceptExtensions = allowedExtensions
    .map((extension) => `.${extension}`)
    .join(",")

  function handleOnDrop(acceptedFiles: FileList | null) {
    if (!acceptedFiles || acceptedFiles.length === 0) {
      methods.setValue("files", undefined)
      methods.setError("files", {
        message: "File is required",
        type: "typeError",
      })
      return
    }

    const containsInvalidFile = Array.from(acceptedFiles).some((file) => {
      if (file.type && allowedMimeTypes.includes(file.type)) {
        return false
      }

      const fileExtension = file.name.split(".").pop()?.toLowerCase()?.trim()

      return !fileExtension || !allowedExtensions.includes(fileExtension)
    })

    if (containsInvalidFile) {
      methods.setValue("files", undefined)
      methods.setError("files", {
        message: `File type is not valid. Allowed extensions: ${allowedExtensionsLabel}`,
        type: "typeError",
      })
      return
    }

    methods.setValue("files", acceptedFiles)
    methods.clearErrors("files")
    void (async () => {
      const success = await uploadActivities(acceptedFiles)
      if (success) {
        methods.reset(defaultValues)
      }
    })()
  }

  // useLayoutEffect(() => {
  //   const timer = setTimeout(() => {
  //     if (statsStatus === "success") {
  //       setWeeklyProgress(stats?.percentageChangeWeek);
  //       setMonthlyProgress(stats?.percentageChangeMonth);
  //     }
  //   }, 500);
  //   return () => clearTimeout(timer);
  // }, [stats]);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-50 shadow-2xl">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -left-24 top-[-10%] h-64 w-64 rounded-full bg-sky-500/40 blur-3xl" />
          <div className="absolute right-[-10%] bottom-[-25%] h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-8 p-8 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide">
              <span>Dashboard</span>
              <span className="h-1 w-1 rounded-full bg-white/60" />
              <span className="text-white/80">Overview</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome back, ready for the next ride?
              </h1>
              <p className="max-w-xl text-sm text-slate-200/80 sm:text-base">
                Upload your FIT files to unlock rich analytics. Surface
                performance trends, highlight personal bests, and keep your
                training log organized.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-200/80">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <ActivityIcon className="h-3.5 w-3.5" />
                {totalActivities
                  ? `${totalActivities.toLocaleString()} activities tracked`
                  : "Zero activities tracked yet"}
              </span>
              {latestActivity && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {latestActivity.activityName ?? "Recent ride"}
                </span>
              )}
            </div>
          </div>
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-6 shadow-lg backdrop-blur">
            <FormProvider {...methods}>
              <form
                className="space-y-4"
                onSubmit={methods.handleSubmit(handleFormSubmit)}
                noValidate
                autoComplete="off"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">
                    Drop FIT files to begin
                  </p>
                  <p className="text-xs text-slate-200/70">
                    Supports multi-file uploads up to 25MB each.
                  </p>
                </div>
                <FormField
                  control={methods.control}
                  name="files"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Dropzone
                          {...field}
                          accept={acceptExtensions}
                          dropMessage="Drop files or click to browse"
                          multiple
                          handleOnDrop={handleOnDrop}
                          classNameWrapper="border-white/30 bg-white/10 hover:border-white/60"
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-200" />
                    </FormItem>
                  )}
                />
                {selectedFiles && selectedFiles.length > 0 && (
                  <div className="flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white/90">
                    <Upload className="h-3.5 w-3.5" />
                    <span>
                      {selectedFiles.length} file
                      {selectedFiles.length > 1 ? "s" : ""} ready to upload
                    </span>
                  </div>
                )}
                {status.isUploading && (
                  <div className="flex items-center gap-2 rounded-md border border-sky-300/40 bg-sky-500/20 px-3 py-2 text-xs text-sky-100">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Uploading activities…
                  </div>
                )}
                {status.error && (
                  <div className="flex items-center gap-2 rounded-md border border-red-400/40 bg-red-500/20 px-3 py-2 text-xs text-red-100">
                    <File className="h-3.5 w-3.5" />
                    {status.error}
                  </div>
                )}
                {status.success && (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-xs text-emerald-100">
                    <FileCheck2Icon className="h-3.5 w-3.5" />
                    Upload complete
                  </div>
                )}
              </form>
            </FormProvider>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardDescription>Total activities</CardDescription>
              <CardTitle className="text-3xl">
                {totalActivities ? totalActivities.toLocaleString() : "0"}
              </CardTitle>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/15 text-sky-600">
              <ActivityIcon className="h-5 w-5" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Keep the uploads coming to build a complete training history.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardDescription>Latest activity</CardDescription>
              <CardTitle className={cn("line-clamp-1 text-2xl")}>
                {latestActivity?.activityName ?? "No activity yet"}
              </CardTitle>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <Calendar className="h-5 w-5" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{latestSubtitle}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardDescription>Weekly goal</CardDescription>
              <CardTitle className="text-3xl">
                {weeklyProgressValue ? `${weeklyProgressValue}%` : "—"}
              </CardTitle>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-500">
              <Target className="h-5 w-5" />
            </span>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={weeklyProgressValue} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Track progress toward this week&apos;s distance target.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardDescription>Monthly momentum</CardDescription>
              <CardTitle className="text-3xl">
                {monthlyProgressValue ? `${monthlyProgressValue}%` : "—"}
              </CardTitle>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
              <TrendingUp className="h-5 w-5" />
            </span>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={monthlyProgressValue} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Stay consistent to unlock new personal bests each month.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">
              Activity history
            </h2>
            <p className="text-sm text-muted-foreground">
              Tap into any activity to review the map, metrics, and heart rate
              details.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-sm"
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked>
                  Completed
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>
                  Personal bests
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>
                  Requires attention
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-sm">
              <File className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>

        <Tabs defaultValue="week" className="space-y-4">
          <TabsList className="w-fit rounded-full bg-muted/60 p-1">
            <TabsTrigger
              value="week"
              className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow"
            >
              Week
            </TabsTrigger>
            <TabsTrigger
              value="month"
              className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow"
            >
              Month
            </TabsTrigger>
            <TabsTrigger
              value="year"
              className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow"
            >
              Year
            </TabsTrigger>
          </TabsList>
          <TabsContent value="week">
            <Card>
              <CardHeader className="space-y-1 border-b px-6 py-4">
                <CardTitle className="text-lg">Recent activities</CardTitle>
                <CardDescription>
                  Review the most recent uploads at a glance.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <ActivityIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        No activities yet
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Upload your first FIT file to populate this view.
                      </p>
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-muted/60">
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Title
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Time
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Distance
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map((activity) => (
                        <TableRow
                          onClick={() =>
                            navigate({
                              to: "/activity/$activityId",
                              params: {
                                activityId: String(activity.id),
                              },
                            })
                          }
                          key={activity.id}
                          className="group cursor-pointer border-muted/40 transition-colors hover:bg-muted/50"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/15 text-sky-500">
                                <ActivityIcon className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  Ride
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  #{activity.id}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {activity?.activityName ?? "Untitled activity"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {activity.totalTime ?? "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {activity.distance ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}
