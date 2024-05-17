import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/authenticated/dashboard")({
  component: () => <div>Hello /authenticated/dashboard!</div>,
});
