export type AdminRole = "SUPER_ADMIN" | "FESTIVAL_MANAGER" | "FIELD_OPERATOR" | "MERCHANT" | "REVIEWER";

export const ADMIN_ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "최고 관리자",
  FESTIVAL_MANAGER: "축제 담당자",
  FIELD_OPERATOR: "현장 운영자",
  MERCHANT: "입점업체",
  REVIEWER: "검수자",
};

export interface AdminNavItem {
  href: string;
  label: string;
  roles: AdminRole[];
}

/**
 * 백엔드가 화면 단위 권한 매트릭스를 내려주지 않아, 각 화면이 호출하는 엔드포인트의
 * roles() 가드를 근거로 매핑했습니다. 화면에 필요한 API 중 하나라도 호출할 수 있는
 * 역할을 포함시킵니다. 백엔드 가드가 바뀌면 이 배열도 함께 맞춰야 합니다.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "운영 대시보드", roles: ["SUPER_ADMIN", "FESTIVAL_MANAGER", "FIELD_OPERATOR", "REVIEWER"] },
  { href: "/admin/programs", label: "통합 운영관리", roles: ["SUPER_ADMIN", "FESTIVAL_MANAGER", "FIELD_OPERATOR"] },
  // areas CRUD → SUPER_ADMIN, FESTIVAL_MANAGER
  { href: "/admin/map-locations", label: "지도·부스 설정", roles: ["SUPER_ADMIN", "FESTIVAL_MANAGER"] },
  // content-versions/{id}/reviews → SUPER_ADMIN, REVIEWER
  { href: "/admin/content", label: "검수·게시 관리", roles: ["SUPER_ADMIN", "FESTIVAL_MANAGER", "REVIEWER"] },
  { href: "/admin/tickets", label: "민원·공지·사고", roles: ["SUPER_ADMIN", "FESTIVAL_MANAGER", "FIELD_OPERATOR"] },
  // ai/reviews, ai/reviews/{id}/decision → SUPER_ADMIN, FESTIVAL_MANAGER, REVIEWER
  { href: "/admin/ai-insights", label: "AI 민원 인사이트", roles: ["SUPER_ADMIN", "FESTIVAL_MANAGER", "REVIEWER"] },
  // esg/measurements/{id}/reviews, esg/reports/{id}/approve → SUPER_ADMIN, REVIEWER
  { href: "/admin/esg", label: "ESG 성과관리", roles: ["SUPER_ADMIN", "FESTIVAL_MANAGER", "REVIEWER"] },
  { href: "/admin/audit-logs", label: "감사 로그", roles: ["SUPER_ADMIN", "FESTIVAL_MANAGER"] },
];

export function findNavItem(pathname: string) {
  return ADMIN_NAV_ITEMS.find((item) => (item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)));
}

export function canAccessPath(role: string | undefined, pathname: string) {
  const item = findNavItem(pathname);
  if (!item) return true;
  if (!role) return false;
  return (item.roles as string[]).includes(role);
}

export function visibleNavItems(role: string | undefined) {
  return ADMIN_NAV_ITEMS.filter((item) => role !== undefined && (item.roles as string[]).includes(role));
}
