import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/authenticated")({
  beforeLoad: async ({ context }) => {
    const { isLogged } = { isLogged: () => true };
    if (isLogged()) {
      throw redirect({ to: "/login" });
    }
  },
});
