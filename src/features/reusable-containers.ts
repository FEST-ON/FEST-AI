"use client";

import { useSyncExternalStore } from "react";
import { writeJson } from "@/shared/lib/local-store";
import { useStored } from "@/shared/lib/use-stored";
import { randomId, shortCode } from "@/shared/lib/utils";

export const REUSABLE_STAMP_POINTS = 50;
export const REUSABLE_CONTAINER_STORAGE_KEY = "festai-reusable-container-rentals";
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

const EMPTY: ContainerRental[] = [];

/**
 * 이 기기의 방문객 코드. 서버 렌더에는 저장소가 없어 빈 문자열이고, 하이드레이션 뒤에 값이 온다.
 *
 * 코드가 없을 때 만드는 일은 구독 시점(=클라이언트에서 한 번)에 한다 — 스냅샷을 읽는
 * 쪽에서 만들면 렌더가 저장소를 바꾸게 된다.
 */
export function useReusableVisitorCode() {
  return useSyncExternalStore(
    (onChange) => {
      if (!window.localStorage.getItem(REUSABLE_VISITOR_CODE_STORAGE_KEY)) {
        window.localStorage.setItem(REUSABLE_VISITOR_CODE_STORAGE_KEY, shortCode("VIS"));
        onChange();
      }
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    () => window.localStorage.getItem(REUSABLE_VISITOR_CODE_STORAGE_KEY) ?? "",
    () => "",
  );
}

export function writeReusableContainerRentals(rentals: ContainerRental[]) {
  writeJson(REUSABLE_CONTAINER_STORAGE_KEY, rentals);
}

/** 대여 내역 구독. 같은 탭의 대여·반납 처리와 다른 탭의 변경이 모두 반영된다. */
export function useReusableContainerRentals() {
  return useStored(REUSABLE_CONTAINER_STORAGE_KEY, EMPTY);
}

export function createContainerRental(input: NewContainerRental): ContainerRental {
  return {
    id: randomId("rental"),
    rentalCode: shortCode("RC"),
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

export function reusableContainerPoints(rentals: ContainerRental[]) {
  return rentals.reduce((total, rental) => total + rental.stampPoints, 0);
}
