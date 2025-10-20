import { Session } from "@supabase/supabase-js";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  loader: async ({ context }) => {
    const { supabase } = context;
    if (!supabase) {
      throw new Error(
        "Supabase instance is not provided in the route context."
      );
    }
    return { supabase };
  },
});

function LoginPage() {
  const { supabase } = Route.useRouteContext();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (session) {
      navigate({ to: "/dashboard" });
    }
  }, [session, navigate]);

  if (!session) {
    return (
      <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
        <div className="flex justify-center items-center py-12">
          <div className="mx-auto grid w-[350px] gap-6">
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={[]}
            />
          </div>
        </div>
        <div className="hidden bg-muted lg:block">
          <img
            src="https://placehold.co/600x400"
            alt="Image"
            width="1920"
            height="1080"
            className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          />
        </div>
      </div>
    );
    // return <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />;
  }

  // Render nothing while redirecting
  return null;
}
