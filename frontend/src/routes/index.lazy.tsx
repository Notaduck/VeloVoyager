import { Button } from "@/components/ui/button";
import { Link, createLazyFileRoute } from "@tanstack/react-router";
import Hero from "../assets/group_ride.jpg";

export const Route = createLazyFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="p-2">
      <div className="flex overflow-y-scroll flex-col h-screen snap-y snap-mandatory">
        <main className="flex-1">
          <section className="py-12 w-full h-screen md:py-24 lg:py-32 xl:py-48 snap-start">
            <div className="container px-4 md:px-6">
              <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
                <img
                  alt="Hero"
                  className="object-cover overflow-hidden mx-auto rounded-xl aspect-video sm:w-full lg:order-last lg:aspect-square"
                  height="550"
                  src={Hero}
                  width="550"
                />
                <div className="flex flex-col justify-center space-y-4">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                      Track Your Cycling Activities
                    </h1>
                    <p className="max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                      Easily upload data from your Garmin, Wahoo, or Bryton
                      cycle computers and analyze your performance, routes, and
                      more.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 min-[400px]:flex-row">
                    <Button
                      className="inline-flex justify-center items-center px-8 h-10 text-sm font-medium text-gray-50 bg-gray-900 rounded-md shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
                      // href="/signup"
                    >
                      Get Started
                    </Button>
                    <a
                      className="inline-flex justify-center items-center px-8 h-10 text-sm font-medium bg-white rounded-md border border-gray-200 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50 dark:focus-visible:ring-gray-300"
                      href="#"
                    >
                      Learn More
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className="py-12 w-full h-screen bg-gray-100 md:py-24 lg:py-32 dark:bg-gray-800 snap-start">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col justify-center items-center space-y-4 text-center">
                <div className="space-y-2">
                  <div className="inline-block px-3 py-1 text-sm bg-gray-100 rounded-lg dark:bg-gray-800">
                    Key Features
                  </div>
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                    Unlock Your Cycling Potential
                  </h2>
                  <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                    Our platform provides advanced analytics, route planning,
                    and social features to help you improve your cycling
                    performance and connect with other riders.
                  </p>
                </div>
              </div>
              <div className="grid gap-6 items-center py-12 mx-auto max-w-5xl lg:grid-cols-2 lg:gap-12">
                <img
                  alt="Features"
                  className="object-cover object-center overflow-hidden mx-auto rounded-xl aspect-video sm:w-full lg:order-last"
                  height="310"
                  src="https://placehold.co/600x400"
                  width="550"
                />
                <div className="flex flex-col justify-center space-y-4">
                  <ul className="grid gap-6">
                    <li>
                      <div className="grid gap-1">
                        <h3 className="text-xl font-bold">
                          Advanced Analytics
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Dive deep into your cycling data with detailed
                          performance metrics and visualizations.
                        </p>
                      </div>
                    </li>
                    <li>
                      <div className="grid gap-1">
                        <h3 className="text-xl font-bold">Route Planning</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Discover new routes, plan your rides, and share your
                          favorite routes with the community.
                        </p>
                      </div>
                    </li>
                    <li>
                      <div className="grid gap-1">
                        <h3 className="text-xl font-bold">Social Features</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Connect with other cyclists, join groups, and compete
                          in challenges to stay motivated.
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
          <section className="py-12 w-full h-screen md:py-24 lg:py-32 snap-start">
            <div className="container grid gap-6 items-center px-4 md:px-6 lg:grid-cols-2 lg:gap-10">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                  Elevate Your Cycling Experience
                </h2>
                <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Our platform provides the tools and insights you need to take
                  your cycling to the next level.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row lg:justify-end">
                <Link
                  className="inline-flex justify-center items-center px-8 h-10 text-sm font-medium text-gray-50 bg-gray-900 rounded-md shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
                  to="/login"
                >
                  Get Started
                </Link>
                <a
                  className="inline-flex justify-center items-center px-8 h-10 text-sm font-medium bg-white rounded-md border border-gray-200 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50 dark:focus-visible:ring-gray-300"
                  href="#"
                >
                  Learn More
                </a>
              </div>
            </div>
          </section>
        </main>
        <footer className="flex flex-col gap-2 items-center px-4 py-6 w-full border-t sm:flex-row shrink-0 md:px-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © 2024 Cycle Tracker. All rights reserved.
          </p>
          <nav className="flex gap-4 sm:ml-auto sm:gap-6">
            <a className="text-xs hover:underline underline-offset-4" href="#">
              Terms of Service
            </a>
            <a className="text-xs hover:underline underline-offset-4" href="#">
              Privacy
            </a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
