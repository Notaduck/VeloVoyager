import { useState } from "react";
import { File, FileCheck2Icon, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@radix-ui/react-dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { FormProvider, useForm } from "react-hook-form";
import {
  FormControl,
  FormItem,
  FormField,
  FormMessage,
} from "@/components/ui/form";
import { Dropzone } from "@/components/ui/dropzone";
import { Progress } from "@/components/ui/progress";
import { getActivities } from "@/gen/activity/v1/activity-ActivityService_connectquery";
import { useQuery } from "@connectrpc/connect-query";
import { useUploadActivities } from "@/hooks/uploadActivity";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,

  loader: async ({ context: { supabase } }) => {
    const jwt = await (supabase as SupabaseClient).auth
      .getSession()
      .then((session) => session.data.session?.access_token);
    return {
      authToken: jwt,
    };
  },
});

function Dashboard() {
  const navigate = useNavigate();

  const [weeklyProgress] = useState<number>(0);
  const [monthlyProgress] = useState<number>(0);

  const { data } = useQuery(getActivities);

  type FormValues = { files: undefined | FileList };

  const defaultValues: FormValues = {
    files: undefined,
  };

  const methods = useForm<FormValues>({
    defaultValues,
    shouldFocusError: true,
    shouldUnregister: false,
    shouldUseNativeValidation: false,
  });

  const { uploadActivities, status } = useUploadActivities();

  async function handleFormSubmit(values: FormValues) {
    if (!values.files || values.files.length === 0) {
      methods.setError("files", {
        message: "File is required",
        type: "typeError",
      });
      return;
    }

    const success = await uploadActivities(values.files);
    if (success) {
      methods.reset(defaultValues);
    }
  }

  const allowedMimeTypes = ["application/fits"];
  const allowedExtensions = ["fit", "fits"];
  const allowedExtensionsLabel = allowedExtensions
    .map((extension) => `.${extension}`)
    .join(", ");
  const acceptExtensions = allowedExtensions
    .map((extension) => `.${extension}`)
    .join(",");

  function handleOnDrop(acceptedFiles: FileList | null) {
    if (!acceptedFiles || acceptedFiles.length === 0) {
      methods.setValue("files", undefined);
      methods.setError("files", {
        message: "File is required",
        type: "typeError",
      });
      return;
    }

    const containsInvalidFile = Array.from(acceptedFiles).some((file) => {
      if (file.type && allowedMimeTypes.includes(file.type)) {
        return false;
      }

      const fileExtension = file.name.split(".").pop()?.toLowerCase()?.trim();

      return !fileExtension || !allowedExtensions.includes(fileExtension);
    });

    if (containsInvalidFile) {
      methods.setValue("files", undefined);
      methods.setError("files", {
        message: `File type is not valid. Allowed extensions: ${allowedExtensionsLabel}`,
        type: "typeError",
      });
      return;
    }

    methods.setValue("files", acceptedFiles);
    methods.clearErrors("files");
    void (async () => {
      const success = await uploadActivities(acceptedFiles);
      if (success) {
        methods.reset(defaultValues);
      }
    })();
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
    <>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card className="sm:col-span-2" x-chunk="dashboard-05-chunk-0">
          <CardHeader className="pb-3">
            <CardContent>
              <FormProvider {...methods}>
                <form
                  className="flex flex-col gap-2 justify-center items-center w-100"
                  onSubmit={methods.handleSubmit(handleFormSubmit)}
                  noValidate
                  autoComplete="off"
                >
                  <FormField
                    control={methods.control}
                    name="files"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormControl>
                          <Dropzone
                            {...field}
                            accept={acceptExtensions}
                            dropMessage="Drop files or click here"
                            multiple
                            handleOnDrop={handleOnDrop}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {methods.watch("files") && (
                    <div className="flex relative gap-3 justify-center items-center p-4">
                      <FileCheck2Icon className="w-4 h-4" />
                      <p className="text-sm font-medium">
                        {/* {methods.watch("files")} */}
                      </p>
                    </div>
                  )}
                  {status.isUploading && (
                    <p className="text-sm text-muted-foreground">
                      Uploading activities…
                    </p>
                  )}
                  {status.error && (
                    <p className="text-sm text-destructive">{status.error}</p>
                  )}
                  {status.success && (
                    <p className="text-sm text-emerald-600">Upload complete</p>
                  )}
                </form>
              </FormProvider>
            </CardContent>
            <CardTitle>Upload your activities here</CardTitle>
          </CardHeader>
          <CardFooter>{/* <Button>Create New Order</Button> */}</CardFooter>
        </Card>
        <Card x-chunk="dashboard-05-chunk-1">
          <CardHeader className="pb-2">
            <CardDescription>Kilomoters This Week</CardDescription>
            <CardTitle className="text-4xl">
              {/* {stats?.totalForCurrentWeek} Km */}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {/* {stats?.percentageChangeWeek}% from last week */}
            </div>
          </CardContent>
          <CardFooter>
            <Progress value={weeklyProgress} />
          </CardFooter>
        </Card>
        <Card x-chunk="dashboard-05-chunk-2">
          <CardHeader className="pb-2">
            <CardDescription>This Month</CardDescription>
            <CardTitle className="text-4xl">
              {/* {stats?.totalForCurrentMonth} km */}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {/* {stats?.percentageChangeMonth}% from last month */}
            </div>
          </CardContent>
          <CardFooter>
            <Progress value={monthlyProgress} />
          </CardFooter>
        </Card>
      </div>
      <Tabs defaultValue="week">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
          <div className="flex gap-2 items-center ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-7 text-sm"
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only">Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked>
                  Fulfilled
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Declined</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Refunded</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="gap-1 h-7 text-sm">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Export</span>
            </Button>
          </div>
        </div>
        <TabsContent value="week">
          <Card x-chunk="dashboard-05-chunk-3">
            <CardHeader className="px-7">
              <CardTitle>Activities</CardTitle>
              {/* <CardDescription>
                  Recent orders from your store.
                </CardDescription> */}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Title
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">Time</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Distance
                    </TableHead>
                    {/* <TableHead className="text-right">Amount</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.activities?.map((activity) => (
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
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <TableCell>
                        <div className="font-medium">
                          <Badge className="rounded-md">Ride</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {activity?.activityName}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {activity.totalTime}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {activity.distance} (unit)
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
