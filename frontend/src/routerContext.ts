import { SupabaseClient } from "@supabase/supabase-js";
import { QueryClient } from "@tanstack/react-query";

export type RouterContext = {
  supabase: SupabaseClient;
  queryClient: QueryClient;
};
