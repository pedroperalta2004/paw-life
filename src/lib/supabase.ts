import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xfcjzhxgzffmsugzcvac.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmY2p6aHhnemZmbXN1Z3pjdmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTA3NzUsImV4cCI6MjA5MTIyNjc3NX0.GQYCMZEuWoF1Clj1q8zov-EcWvRvNhURfTavVDNZW4M";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});