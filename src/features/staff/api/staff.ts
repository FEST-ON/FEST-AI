import { adminApi, adminOrganizationId, festivalApi, json } from "@/shared/lib/api";

export interface StaffAssignment {
  id: string;
  membership_id: string;
  area_id: string;
  duty_role: string;
  task: string | null;
  starts_at: string;
  ends_at: string;
  acknowledged_at: string | null;
  staff_name: string;
  role: string;
}

export async function fetchStaffAssignments() {
  return festivalApi<StaffAssignment[]>(`/staff-assignments`);
}

export interface NewStaffAssignment {
  membershipId: string;
  areaId: string;
  dutyRole: string;
  task?: string;
  startsAt: string;
  endsAt: string;
}

export async function createStaffAssignment(input: NewStaffAssignment) {
  return festivalApi(`/staff-assignments`, json("POST", input));
}

export async function acknowledgeAssignment(assignmentId: string) {
  return festivalApi(`/staff-assignments/${assignmentId}/acknowledge`, { method: "POST" });
}

export interface Membership {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  festival_scope: string[];
  status: string;
  created_at: string;
}

// 멤버십 API는 조직 단위다 — 조직 ID는 api.ts가 세션 단위로 캐시해 둔 값을 쓴다.

export async function fetchMemberships() {
  return adminApi<Membership[]>(`/admin/organizations/${await adminOrganizationId()}/memberships`);
}

export interface NewMembership {
  email: string;
  name: string;
  password: string;
  role: Membership["role"];
  festivalScope: string[];
}

export async function createMembership(input: NewMembership) {
  return adminApi(`/admin/organizations/${await adminOrganizationId()}/memberships`, json("POST", input));
}

export async function updateMembership({ membershipId, ...body }: { membershipId: string; role?: string; status?: string; festivalScope?: string[] }) {
  return adminApi(`/admin/organizations/${await adminOrganizationId()}/memberships/${membershipId}`, json("PATCH", body));
}

export async function deactivateMembership(membershipId: string) {
  return adminApi<void>(`/admin/organizations/${await adminOrganizationId()}/memberships/${membershipId}`, { method: "DELETE" });
}
