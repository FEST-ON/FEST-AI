export const REUSABLE_OPERATOR_EMAIL = "operator@example.com";
export const REUSABLE_STAMP_POINTS = 50;
export const REUSABLE_CONTAINER_STORAGE_KEY = "festai-reusable-container-rentals";
export const REUSABLE_CONTAINER_UPDATED_EVENT = "festai-reusable-container-updated";
export const REUSABLE_VISITOR_CODE_STORAGE_KEY = "festai-reusable-visitor-code";

export type ContainerType = "CUP" | "BOWL" | "TUMBLER";
export type ContainerRentalStatus = "RENTED" | "RETURNED";
export type StampStatus = "WAITING" | "ISSUED";

export const CONTAINER_TYPE_LABEL: Record<ContainerType, string> = {
  CUP: "다회용 컵",
  BOWL: "다회용 식기",
  TUMBLER: "텀블러",
};

export interface ContainerRental {
  id: string;
  rentalCode: string;
  visitorCode: string;
  containerType: ContainerType;
  quantity: number;
  station: string;
  rentedAt: string;
  returnedAt: string | null;
  status: ContainerRentalStatus;
  stampStatus: StampStatus;
  stampPoints: number;
  operatorEmail: string;
}

export interface NewContainerRental {
  visitorCode: string;
  containerType: ContainerType;
  quantity: number;
  station: string;
  operatorEmail: string;
}

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getReusableVisitorCode() {
  if (typeof window === "undefined") return "";
  const stored = window.localStorage.getItem(REUSABLE_VISITOR_CODE_STORAGE_KEY);
  if (stored) return stored;
  const code = `VIS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  window.localStorage.setItem(REUSABLE_VISITOR_CODE_STORAGE_KEY, code);
  return code;
}

function notifyUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(REUSABLE_CONTAINER_UPDATED_EVENT));
}

export function readReusableContainerRentals(): ContainerRental[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REUSABLE_CONTAINER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed as ContainerRental[] : [];
  } catch {
    return [];
  }
}

export function writeReusableContainerRentals(rentals: ContainerRental[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REUSABLE_CONTAINER_STORAGE_KEY, JSON.stringify(rentals));
  notifyUpdated();
}

export function createContainerRental(input: NewContainerRental): ContainerRental {
  return {
    id: newId("rental"),
    rentalCode: `RC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    visitorCode: input.visitorCode.trim().toUpperCase(),
    containerType: input.containerType,
    quantity: Math.max(1, input.quantity),
    station: input.station,
    rentedAt: new Date().toISOString(),
    returnedAt: null,
    status: "RENTED",
    stampStatus: "WAITING",
    stampPoints: 0,
    operatorEmail: input.operatorEmail,
  };
}

export function completeContainerReturn(rentals: ContainerRental[], rentalId: string) {
  const target = rentals.find((rental) => rental.id === rentalId && rental.status === "RENTED");
  if (!target) return undefined;
  return rentals.map((rental) => rental.id === rentalId
    ? {
        ...rental,
        returnedAt: new Date().toISOString(),
        status: "RETURNED" as const,
        stampStatus: "ISSUED" as const,
        stampPoints: REUSABLE_STAMP_POINTS,
      }
    : rental);
}

export function returnedReusableContainerRentals(rentals: ContainerRental[]) {
  return rentals.filter((rental) => rental.status === "RETURNED");
}

export function reusableContainerPoints(rentals: ContainerRental[]) {
  return returnedReusableContainerRentals(rentals).reduce((total, rental) => total + rental.stampPoints, 0);
}

export function isToday(isoDate: string | null) {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  const today = new Date();
  return date.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
    === today.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}
