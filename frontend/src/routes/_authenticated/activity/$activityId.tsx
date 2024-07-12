import { ELineChart } from "@/components/charts/eLineChart";
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
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Suspense, lazy, useLayoutEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Dropzone } from "@/components/ui/dropzone";
import { FileCheck2Icon } from "lucide-react";
import { useUploadMedia } from "@/hooks/uploadActivityMedia";

const LazyMap = lazy(() => import("../../../components/map/lazyMap"));

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
      x: 0 as number,
      y: 0 as number,
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
  const router = useRouter();
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (data.activityName != activity.activityName && authToken) {
      const params = {
        jwtToken: authToken,
        activityId: activity.id, // replace with actual activity id
        activityName: data.activityName, // replace with the new activity name
      };

      updateActivity.mutate(params, {
        onSuccess: async () => {
          await router?.invalidate();
        },
        onError: (error) => {
          console.error("Error updating activity:", error);
        },
      });
    }

    setEditTitle(false);
  };

  const defaultValues: { files: undefined | FileList } = {
    files: undefined,
  };

  const methods = useForm({
    defaultValues,
    shouldFocusError: true,
    shouldUnregister: false,
    shouldUseNativeValidation: false,
  });

  function handleFormSubmit() {}

  const { mutate } = useUploadMedia();

  async function handleOnDrop(acceptedFiles: FileList | null) {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const allowedTypes = [{ name: "file", types: ["application/fits"] }];

      const fileType = allowedTypes.find((allowedType) =>
        allowedType.types.find((type) => type === acceptedFiles[0].type)
      );

      if (!fileType) {
        methods.setValue("files", undefined);
        methods.setError("files", {
          message: "File type is not valid",
          type: "typeError",
        });
      } else {
        methods.setValue("files", acceptedFiles);
        methods.clearErrors("files");

        mutate({
          files: acceptedFiles,
          jwtToken: authToken!,
          activityId: activity.id,
        }); // Call the upload function here
      }
    } else {
      methods.setValue("files", undefined);
      methods.setError("files", {
        message: "File is required",
        type: "typeError",
      });
    }
  }

  return (
    <div className="container grid grid-cols-7 p-4 mx-auto min-h-screen">
      <div className="grid col-span-5 gap-4">
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
            <Suspense fallback={<div>Loading map...</div>}>
              <LazyMap
                initialLat={y / activity.records.length}
                initialLng={x / activity.records.length}
                records={activity.records}
                route={route}
              />
            </Suspense>

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

      <Card>
        <p>Images goes here</p>
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
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  );
}

export default Activity;
