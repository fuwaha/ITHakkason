import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://rcsribhqbpfgyzbpcakr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_pdTOOB_b0ALP0q497tIOYQ_hnGsac1T";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
);
