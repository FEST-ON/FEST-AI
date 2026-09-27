"""운영 내부 문서와 그 문서만 근거로 삼는 검색(AI-04)."""
from fastapi import APIRouter, Request, Response

from ..db import all_rows, jsonb, one, set_clause
from ..deps import Db, Manager, Scope, User
from ..domain import is_safe_question, mask_sensitive, search_terms
from ..errors import bad_request, found
from ..http import success
from ..schemas import InternalDocumentIn, InternalDocumentPatch, InternalSearchIn
from .admin_core import created, logged


router = APIRouter(tags=["admin-documents"])


@router.get("/admin/festivals/{festival_id}/internal-documents")
def internal_documents(festival_id: str, request: Request, _: Scope, user: User, connection: Db):
    """검색과 같은 권한 기준(allowed_roles)으로 목록도 본인이 열람 가능한 문서만 돌려준다."""
    rows = all_rows(connection, """SELECT id,title,document_type,source_url,allowed_roles,status,updated_at
        FROM internal_documents WHERE festival_id=%s AND status='ACTIVE' AND allowed_roles ? %s
        ORDER BY updated_at DESC""", (festival_id, user["role"]))
    return success(request, rows)


@router.post("/admin/festivals/{festival_id}/internal-documents", status_code=201)
def create_internal_document(festival_id: str, body: InternalDocumentIn, request: Request, _: Scope, user: Manager, connection: Db):
    row = one(connection, """INSERT INTO internal_documents(festival_id,title,document_type,body,source_url,allowed_roles,created_by)
        VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING id,title,document_type,source_url,allowed_roles,status,created_at""",
        (festival_id, body.title, body.document_type, body.body, body.source_url, jsonb(body.allowed_roles), user["id"]))
    created(connection, request, user, festival_id, "INTERNAL_DOCUMENT", row)
    return success(request, row)


@router.patch("/admin/festivals/{festival_id}/internal-documents/{document_id}")
def update_internal_document(festival_id: str, document_id: str, body: InternalDocumentPatch, request: Request,
                             _: Scope, user: Manager, connection: Db):
    """운영 문서 수정. 등록·조회·검색만 있어서 오타 하나도 고칠 수 없었다."""
    values = body.model_dump(exclude_none=True)
    if not values:
        raise bad_request("VALIDATION_ERROR", "변경할 값이 없습니다.")
    if "allowed_roles" in values:
        values["allowed_roles"] = jsonb(values["allowed_roles"])
    before = found(one(connection, "SELECT * FROM internal_documents WHERE id=%s AND festival_id=%s AND status='ACTIVE'", (document_id, festival_id)))
    clause, params = set_clause(values)
    row = found(one(connection, f"""UPDATE internal_documents SET {clause},updated_at=now()
        WHERE id=%s AND festival_id=%s AND status='ACTIVE'
        RETURNING id,title,document_type,source_url,allowed_roles,status,updated_at""", [*params, document_id, festival_id]))
    logged(connection, request, user, festival_id, "UPDATE", "INTERNAL_DOCUMENT", document_id,
           before_data=before, after_data=row)
    return success(request, row)


@router.delete("/admin/festivals/{festival_id}/internal-documents/{document_id}", status_code=204)
def archive_internal_document(festival_id: str, document_id: str, request: Request, _: Scope, user: Manager, connection: Db) -> Response:
    """보관 처리. 감사 대상 문서라 실제로 지우지 않고 status만 ARCHIVED로 바꾼다(검색 대상에서 빠진다)."""
    row = found(one(connection, """UPDATE internal_documents SET status='ARCHIVED',updated_at=now()
        WHERE id=%s AND festival_id=%s AND status='ACTIVE' RETURNING id""", (document_id, festival_id)))
    logged(connection, request, user, festival_id, "ARCHIVE", "INTERNAL_DOCUMENT", str(row["id"]))
    return Response(status_code=204)


@router.post("/admin/festivals/{festival_id}/ai/operations/search")
def search_internal_documents(festival_id: str, body: InternalSearchIn, request: Request, _: Scope, user: User, connection: Db):
    if not is_safe_question(body.question):
        raise bad_request("UNSAFE_QUERY", "민감정보 또는 시스템 정보 요청은 검색할 수 없습니다.")
    patterns = [f"%{term}%" for term in search_terms(body.question)]
    # internal_documents_body_idx(gin_trgm_ops)가 ILIKE ANY를 받는다.
    rows = all_rows(connection, """SELECT id,title,document_type,body,source_url,updated_at FROM internal_documents
        WHERE festival_id=%(festival_id)s AND status='ACTIVE' AND allowed_roles ? %(role)s AND body ILIKE ANY(%(patterns)s)
        ORDER BY (SELECT count(*) FROM unnest(%(patterns)s::text[]) pattern WHERE body ILIKE pattern) DESC,
                 updated_at DESC LIMIT 5""",
        {"festival_id": festival_id, "role": user["role"], "patterns": patterns}) if patterns else []
    excerpts = [mask_sensitive(row["body"][:500]) for row in rows]
    return success(request, {"answer": "\n\n".join(excerpts) if excerpts else "권한 범위의 운영 문서에서 근거를 찾지 못했습니다.",
                             "sources": [{"documentId": row["id"], "title": row["title"], "sourceUrl": row["source_url"]} for row in rows]})
