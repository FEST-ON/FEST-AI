import { festivalApi, json } from "@/shared/lib/api";

export const DOCUMENT_ROLES = ["SUPER_ADMIN", "FESTIVAL_MANAGER", "FIELD_OPERATOR", "REVIEWER", "MERCHANT"] as const;

export interface NewInternalDocument {
  title: string;
  documentType: string;
  body: string;
  sourceUrl?: string;
  allowedRoles: string[];
}

export interface InternalDocument {
  id: string;
  title: string;
  document_type: string;
  source_url: string | null;
  allowed_roles: string[];
  status: string;
  /** 등록 응답은 created_at, 목록은 updated_at을 준다. */
  created_at?: string;
  updated_at?: string;
}

export async function createInternalDocument(input: NewInternalDocument) {
  return festivalApi<InternalDocument>(`/internal-documents`, json("POST", input));
}

/** 본인 역할이 열람할 수 있는 문서만 내려온다 — 검색과 같은 기준. */
export async function fetchInternalDocuments() {
  return festivalApi<InternalDocument[]>(`/internal-documents`);
}

export interface OperationsSearchResult {
  answer: string;
  sources: Array<{ documentId: string; title: string; sourceUrl: string | null }>;
}

/** 권한 범위의 운영 문서만 검색하고, 결과 본문은 서버에서 개인정보가 마스킹된다. */
export async function searchOperations(question: string) {
  return festivalApi<OperationsSearchResult>(`/ai/operations/search`, json("POST", { question }));
}
