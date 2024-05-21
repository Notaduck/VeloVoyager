// import { postsQueryOptions } from "@/hooks/getActivities";
// import { SupabaseClient } from "@supabase/supabase-js";
// import { createFileRoute } from "@tanstack/react-router";

// export const Route = createFileRoute("/_authenticated/dashboard")({
//   component: Dashboard,
//   loader: ({ context: { queryClient, supabase } }) => {
//     const jwt = (supabase as SupabaseClient).auth
//       .getSession()
//       .then((session) => session.data.session?.access_token);
//     return queryClient.ensureQueryData(postsQueryOptions(jwt));
//   },
// });

// function Dashboard() {
//   const data = Route.useLoaderData();
//   console.log("data", data);
//   return <div>Hello /_authenticated/dashboard!</div>;
// }
import { createFileRoute } from "@tanstack/react-router";
import axios from "axios";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const fetchData = async () => {
  try {
    const response = await axios.get(`http://localhost:3000/activities`, {
      headers: {
        "x-jwt-token": "jwt_token",
      },
    });
    console.log("Response Data:", response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      console.log("Error Response Data:", error.response.data);
      console.log("Error Response Status:", error.response.status);
      console.log("Error Response Headers:", error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.log("Error Request:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log("Error Message:", error.message);
    }
    console.log("Error Config:", error.config);
    return null;
  }
};

function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const getData = async () => {
      const result = await fetchData();
      if (result) {
        setData(result);
      }
    };

    getData();
  }, []);

  return (
    <div>
      <h1>Hello /_authenticated/dashboard!</h1>
      {data ? <pre>{JSON.stringify(data, null, 2)}</pre> : <p>Loading...</p>}
    </div>
  );
}
