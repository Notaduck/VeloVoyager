import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

interface Activity {
  id: number;
  createdAt: string;
  distance: number;
  activityName: string;
  avgSpeed: number;
  maxSpeed: number;
  elapsedTime: string;
  totalTime: string;
  records: Record[];
}

interface Record {
  id: number;
  coordinates: Coordinates;
  distance: number;
  speed: number;
  timeStamp: number;
  heartRate?: number;
  dateOfActivity: Date;
}

interface Coordinates {
  x: number;
  y: number;
}

type GetActivityParas = {
  jwtToken: string;
  activityId: number;
};

type UpdateActivityParams = {
  jwtToken: string;
  activityId: number;
  activityName: string;
};

const QUERY_KEY = ["activity"];

const fetchActivity = async ({
  jwtToken,
  activityId,
}: GetActivityParas): Promise<Activity> => {
  const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/activity`, {
    headers: {
      "x-jwt-token": jwtToken,
    },
    params: {
      activityId: activityId,
    },
  });

  return data;
};


export const activityQueryOptions = ({
  jwtToken,
  activityId,
}: GetActivityParas) =>
  queryOptions({
    queryKey: [...QUERY_KEY, activityId],
    queryFn: () => fetchActivity({ jwtToken, activityId }),
  });

export const useGetActivities = ({
  jwtToken,
  activityId,
}: GetActivityParas) => {
  return useQuery<Activity, Error>({
    queryKey: [...QUERY_KEY, activityId],
    queryFn: () => fetchActivity({ jwtToken, activityId }),
  });
};


const updateActivityFn = async ({
  jwtToken,
  activityId,
  activityName,
}: UpdateActivityParams): Promise<Activity> => {
  console.log(jwtToken, activityId, activityName);
  const { data } = await axios.patch(
    `${import.meta.env.VITE_API_URL}/activity`,
    {
      activityName, // Body data should be an object
    },
    {
      headers: {
        "x-jwt-token": jwtToken,
      },
      params: {
        activityId: activityId,
      },
    }
  );

  return data;
};

export const useActivity = () => {

  const queryClient = useQueryClient()

  const getActivity = useQuery({
    queryKey: [...QUERY_KEY, ],
    queryFn: fetchActivity 
  })

  const updateActivity = useMutation<Activity, Error, UpdateActivityParams>({
    mutationKey: ["mutate", "activity"],
    mutationFn: updateActivityFn,
    onSuccess: (activity) => {
      queryClient.setQueryData([ ...QUERY_KEY, activity.id ],activity)
      queryClient.invalidateQueries({queryKey: [...QUERY_KEY, activity.id]});
    }
  });

  return {
    updateActivity,
    getActivity
  };
};
