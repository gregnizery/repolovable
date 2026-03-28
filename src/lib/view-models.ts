import type { Tables } from "@/integrations/supabase/types";

export type ClientPreview = Pick<Tables<"clients">, "name" | "company" | "email" | "phone">;
export type ProfilePreview = Pick<Tables<"profiles">, "first_name" | "last_name" | "avatar_url">;
export type DevisPreview = Pick<Tables<"devis">, "id" | "number" | "status" | "total_ht" | "total_ttc" | "date" | "signed_at">;
export type FacturePreview = Pick<Tables<"factures">, "id" | "number" | "status" | "total_ht" | "total_ttc" | "date" | "due_date">;
export type MissionPreview = Pick<Tables<"missions">, "id" | "title" | "status" | "start_date" | "end_date" | "location">;

export type MissionAssignmentPreview = {
  user_id: string;
  profiles: ProfilePreview | null;
};

export type MissionListItem = Tables<"missions"> & {
  clients: ClientPreview | null;
  devis: DevisPreview[] | DevisPreview | null;
  mission_assignments: MissionAssignmentPreview[] | null;
};

export type EquipmentMissionLink = {
  missions: MissionPreview | null;
};

export type EquipmentListItem = Tables<"materiel"> & {
  tracking_type?: "unit" | "batch" | null;
  is_subrented?: boolean | null;
  storage_locations?: { name: string | null } | null;
  suppliers?: { name: string | null } | null;
  mission_materiel?: EquipmentMissionLink[] | null;
};

export type DevisListItem = Tables<"devis"> & {
  clients: ClientPreview | null;
};

export type FactureListItem = Tables<"factures"> & {
  clients: ClientPreview | null;
  missions?: { title: string | null } | { title: string | null }[] | null;
};

export type PaiementListItem = Tables<"paiements"> & {
  validation_status?: "pending" | "approved" | "rejected" | null;
  factures?: {
    number: string | null;
    clients: ClientPreview | null;
  } | null;
};

export type SearchResultRow = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  group: "Clients" | "Missions" | "Devis" | "Factures";
  status?: string;
};

export function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function getAssignmentDisplayName(assignment: MissionAssignmentPreview) {
  const firstName = assignment.profiles?.first_name?.trim();
  const lastName = assignment.profiles?.last_name?.trim();
  return [firstName, lastName].filter(Boolean).join(" ") || "Affectation";
}
