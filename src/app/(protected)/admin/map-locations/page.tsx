import { MapLocationAdminPanel } from "@/features/map/ui/map-location-admin-panel";

export default function AdminMapLocationsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">지도·부스 설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">부스와 시설 좌표를 관리하면 방문객 카카오맵에 바로 반영됩니다.</p>
      </div>
      <MapLocationAdminPanel />
    </div>
  );
}
