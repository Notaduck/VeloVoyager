import { queryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";

interface TotalTime {
  Microseconds: number;
  Valid: boolean;
}

interface Activity {
<<<<<<< HEAD
  activityName: string;
  activityName2: string;
  totalTime: TotalTime;
  distance: number;
  elapsedTimeChar: string;
  totalTimeChar: string;
=======
  ID: number;
  CreatedAt: string;
  UserID: string;
  Distance: number;
  ActivityName: string;
  AvgSpeed: number;
  MaxSpeed: number;
  ElapsedTime: Time;
  TotalTime: Time;
  WeatherImpact: number;
  Headwind: number;
  LongestHeadwind: Time;
  AirSpeed: number;
  Temp: number;
>>>>>>> caef5286ebb4c5b51a10005f72a14ccc33a580f0
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
