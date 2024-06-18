import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { DehydrateRouter } from "@tanstack/start";
import { Header } from "./__root";

export function RootLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <TanStackRouterDevtools />

      <DehydrateRouter />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
