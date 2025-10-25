import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@connectrpc/connect";
import { create } from "@bufbuild/protobuf";

import {
  ActivityService,
  UpdateActivityRequestSchema,
  GetActivityResponse,
} from "@/gen/activity/v1/activity_pb";
import { transport } from "@/main";

type UpdateActivityRpcParams = {
  activityId: number;
  activityName?: string;
  rideType?: string;
};

const QUERY_KEY = ["activity"];

export const useUpdateActivityRpc = () => {
  const queryClient = useQueryClient();
  const client = createClient(ActivityService, transport);

  const updateActivity = useMutation<
    GetActivityResponse,
    Error,
    UpdateActivityRpcParams
  >({
    mutationKey: ["mutate", "activity", "rpc"],
    mutationFn: async ({
      activityId,
      activityName,
      rideType,
    }: UpdateActivityRpcParams) => {
      const request = create(UpdateActivityRequestSchema, {
        activityId,
        activityName,
        rideType,
      });

      const response = await client.updateActivity(request);
      return response;
    },
    onSuccess: (response: GetActivityResponse) => {
      // Convert the response to match the existing query cache format
      const activity = {
        id: response.id,
        activityName: response.activityName,
        distance: response.distance,
        avgSpeed: response.avgSpeed,
        maxSpeed: response.maxSpeed,
        elapsedTime: response.elapsedTime,
        totalTime: response.totalTime,
        createdAt: response.createdAt,
        rideType: response.rideType, // Add the rideType field
        records:
          response.records?.map((record) => ({
            id: record.id,
            coordinates: {
              x: record.coordinates?.x || 0,
              y: record.coordinates?.y || 0,
            },
            speed: record.speed,
            timeStamp: record.timeStamp
              ? new Date(
                  Number(record.timeStamp.seconds) * 1000 +
                    record.timeStamp.nanos / 1000000
                )
              : new Date(),
            distance: record.distance,
            heartRate: record.heartRate,
          })) || [],
      };

      // Update the query cache with the updated activity
      queryClient.setQueryData([...QUERY_KEY, response.id], activity);
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, response.id] });
    },
  });

  return {
    updateActivity,
  };
};
