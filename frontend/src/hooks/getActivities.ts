import { queryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";

interface TotalTime {
  Microseconds: number;
  Valid: boolean;
}

interface Activity {
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
  const { data } = await axios.get(`http://localhost:3000/activities`, {
    headers: {
      "x-jwt-token": jwtToken,
    },
  });
  console.log("Query data", data);

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
