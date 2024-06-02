import { queryOptions, useQuery } from "@tanstack/react-query";
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
}

interface Coordinates {
  x: number;
  y: number;
}

type GetActivityParas = {
  jwtToken: string;
  activityId: number;
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
