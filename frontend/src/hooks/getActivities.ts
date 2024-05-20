import { queryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";

type User = {
  id: string;
  name: string;
  email: string;
};

type GetActivities = {
  jwtToken: string;
};

const QUERY_KEY = ["activities"];

const fetchActivities = async ({ jwtToken }: GetActivities): Promise<User> => {
  const { data } = await axios.get(`127.0.0.1:3000/activities/`, {
    headers: {
      "x-jwt-token": jwtToken,
    },
  });
  return data;
};

export const postsQueryOptions = (jwtToken: string) =>
  queryOptions({
    queryKey: ["posts"],
    queryFn: () => fetchActivities({ jwtToken }),
  });

export const useGetActivities = (props: GetActivities) => {
  return useQuery<User, Error>({
    queryKey: QUERY_KEY,
    queryFn: () => fetchActivities({ jwtToken: props.jwtToken }),
  });
};
