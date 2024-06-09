import { queryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";

interface TotalTime {
  Microseconds: number;
  Valid: boolean;
}

interface Activity {
  id: number;
  activityName: string;
  totalTime: TotalTime;
  distance: number;
  elapsedTimeChar: string;
  totalTimeChar: string;
}

type GetActivities = {
  jwtToken: string;
};

const QUERY_KEY = ["activities"];

const fetchActivities = async ({
  jwtToken,
}: GetActivities): Promise<Activity[]> => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_URL}/activities`,
    {
      headers: {
        "x-jwt-token": jwtToken,
      },
    }
  );

  return data;
};

export const postsQueryOptions = (jwtToken: string) =>
  queryOptions({
    queryKey: ["posts"],
    queryFn: () => fetchActivities({ jwtToken }),
  });

export const useGetActivities = (props: GetActivities) => {
  return useQuery<Activity[], Error>({
    queryKey: QUERY_KEY,
    queryFn: () => fetchActivities({ jwtToken: props.jwtToken }),
  });
};
