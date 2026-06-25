import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import FarmsManager from "./FarmsManager";

export const metadata = { title: "ניהול רפתות - משקי דן" };

export type FarmStat = {
  id: string;
  name: string;
  excel_client_name: string;
  users_count: number;
  order_count: number;
  open_count: number;
};

export default async function AdminFarmsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_org_stats");
  const farms = (data as FarmStat[] | null) ?? [];
  return <FarmsManager farms={farms} />;
}
