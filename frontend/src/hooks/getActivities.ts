import { queryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";

interface Time {
  Microseconds: number;
  Valid: boolean;
}

interface Activity {
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
}

interface Data {
  json: Activity[];
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
