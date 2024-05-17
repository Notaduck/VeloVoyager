import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/login")({
  component: Index,
});

// const supabase = createClient('https://<project>.supabase.co', '<your-anon-key>')

function Index() {
  return (
    <div className="flex justify-center items-center p-8 h-full bg-gray-100 dark:bg-gray-950">
      <div className="mx-auto space-y-6 w-full max-w-md">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Sign in to your account to continue
          </p>
        </div>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="m@example.com"
              required
              type="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" required type="password" />
          </div>
          <Button className="w-full" type="submit">
            Sign in
          </Button>
        </form>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400">
          Don't have an account?
          <Link className="font-medium underline underline-offset-4" href="#">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
