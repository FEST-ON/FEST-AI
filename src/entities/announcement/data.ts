import { adminApi, adminFestivalId } from "@/shared/lib/api";
import type { Announcement, AnnouncementSeverity, AnnouncementStatus } from "./model";

interface AnnouncementRow {
  id: string;
  title: string;
  severity?: AnnouncementSeverity;
  audience?: string[];
  target_area_ids?: string[];
  starts_at?: string;
  ends_at?: string | null;
  status?: AnnouncementStatus;
  effective_status?: AnnouncementStatus;
  version: number;
}

function normalize(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    severity: row.severity ?? "INFO",
    audience: row.audience ?? [],
    targetAreaIds: row.target_area_ids ?? [],
    startsAt: row.starts_at ?? "",
    endsAt: row.ends_at ?? null,
    status: row.effective_status ?? row.status ?? "DRAFT",
    version: row.version,
  };
}

export async function fetchAnnouncements() {
  const festivalId = await adminFestivalId();
  const rows = await adminApi<AnnouncementRow[]>(`/admin/festivals/${festivalId}/announcements`);
  return rows.map(normalize).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

// 방문객 공개 목록은 features/notification/api/notifications.ts가 이미 조회한다.

export async function fetchAreaOptions() {
  const festivalId = await adminFestivalId();
  const rows = await adminApi<Array<{ id: string; name: string }>>(`/admin/festivals/${festivalId}/areas`);
  return rows.map((row) => ({ id: row.id, name: row.name }));
}

async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[${label}] ${message}`);
  }
}

export interface PublishAnnouncementInput {
  title: string;
  severity: AnnouncementSeverity;
  audience: string[];
  targetAreaIds: string[];
  startsAt: string;
  endsAt?: string;
}

// ponytail: 중간 단계가 실패하면 DRAFT 공지와 콘텐츠 항목이 남는다. 방문객에게는 노출되지
// 않고 삭제 API도 없어서 그대로 두었다. 정리가 필요해지면 백엔드에 DELETE를 요청할 것.
export async function publishAnnouncement(input: PublishAnnouncementInput) {
  const festivalId = await adminFestivalId();
  const announcement = await step("1. 공지 생성", () =>
    adminApi<{ id: string }>(`/admin/festivals/${festivalId}/announcements`, {
      method: "POST",
      body: JSON.stringify({ title: input.title }),
    }));

  // slug는 축제 단위로 유일해야 하므로 uuid를 통째로 쓴다(앞 8자리는 재시도 시 충돌 가능).
  const slug = `announcement-${announcement.id}`;
  const contentItem = await step("2. 콘텐츠 아이템 생성", () =>
    adminApi<{ id: string }>(`/admin/festivals/${festivalId}/content-items`, {
      method: "POST",
      body: JSON.stringify({
        contentType: "ANNOUNCEMENT",
        resourceType: "ANNOUNCEMENT",
        resourceId: announcement.id,
        slug,
      }),
    }));
  const version = await step("3. 콘텐츠 버전 생성", () =>
    adminApi<{ id: string }>(`/admin/festivals/${festivalId}/content-items/${contentItem.id}/versions`, {
      method: "POST",
      body: JSON.stringify({ language: "ko", body: { title: input.title } }),
    }));
  await step("4. 검수 제출", () =>
    adminApi(`/admin/festivals/${festivalId}/content-versions/${version.id}/submit`, { method: "POST" }));
  await step("5. 검수 승인", () =>
    adminApi(`/admin/festivals/${festivalId}/content-versions/${version.id}/reviews`, {
      method: "POST",
      body: JSON.stringify({ decision: "APPROVED", comment: "현장 공지 자동 승인" }),
    }));

  return step("6. 공지 발행", () =>
    adminApi(`/admin/festivals/${festivalId}/announcements/${announcement.id}/publish`, {
      method: "POST",
      body: JSON.stringify({
        contentVersionId: version.id,
        severity: input.severity,
        audience: input.audience,
        targetAreaIds: input.targetAreaIds,
        startsAt: input.startsAt,
        endsAt: input.endsAt || null,
      }),
    }));
}

export async function closeAnnouncement(id: string) {
  const festivalId = await adminFestivalId();
  return adminApi(`/admin/festivals/${festivalId}/announcements/${id}/close`, { method: "POST" });
}
