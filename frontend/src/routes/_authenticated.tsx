import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context: { supabase } }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }

    return {
      accessToken: session.access_token,
    };
  },
  component: Layout,
});

function Layout() {
  return (
    <main className="grid flex-1 gap-4 items-start p-4 bg-gray-50 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-1 xl:grid-cols-2">
      <div className="grid auto-rows-max gap-4 items-start md:gap-8 lg:col-span-2">
        <Outlet />
      </div>
    </main>
  );
}
