import { queryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";

interface ActivityStats {
  totalForCurrentMonth: number;
  totalForLastMonth: number;
  totalForCurrentWeek: number;
  totalForLastWeek: number;
  percentageChangeMonth: number;
  percentageChangeWeek: number;
}

type GetActivities = {
  jwtToken: string;
};

const QUERY_KEY = ["stats"];

const fetchStats = async ({
  jwtToken,
}: GetActivities): Promise<ActivityStats> => {
  const { data } = await axios.get(`${import.meta.env.API_URL}/stats`, {
    headers: {
      "x-jwt-token": jwtToken,
    },
  });
  console.log("Query data for stats", data);

  return data;
};

export const statsQueryOptions = (jwtToken: string) =>
  queryOptions({
    queryKey: ["posts"],
    queryFn: () => fetchStats({ jwtToken }),
  });

export const useGetStats = (props: GetActivities) => {
  return useQuery<ActivityStats, Error>({
    queryKey: QUERY_KEY,
    queryFn: () => fetchStats({ jwtToken: props.jwtToken }),
  });
};
