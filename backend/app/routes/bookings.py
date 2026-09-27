"""프로그램 회차 예약·대기표. 방문객이 잡고 운영자가 상태를 옮긴다."""
from fastapi import APIRouter, Query, Request, Response
from psycopg.errors import UniqueViolation

from ..db import all_rows, deliveries, idempotent, one
from ..deps import Db, IdempotencyKey, Operator, Scope, Visitor
from ..domain import validate_booking_cancel_window, validate_booking_transition
from ..errors import conflict, found
from ..http import cursor_params, idempotent_success, keyset, paged, success
from ..schemas import BookingIn, BookingStatusIn
from .admin_core import logged


router = APIRouter(tags=["bookings"])


def reserved_seats(connection, session_id) -> int:
    """정원을 차지하고 있는 인원. 입장 완료(COMPLETED)도 자리를 쓴 것이다 —
    빼면 운영자가 입장 처리를 할수록 자리가 비어 보여서 회차 진행 중에 정원 초과 예약이 확정됐다."""
    return one(connection, """SELECT coalesce(sum(party_size),0)::int AS count FROM bookings
        WHERE program_session_id=%s AND status IN ('CONFIRMED','CALLED','COMPLETED')""", (session_id,))["count"]


def promote_waiting(connection, session_id) -> None:
    """빈 자리만큼 대기를 순번대로 확정한다.

    예전에는 선두 한 건만 봤다 — 5명이 취소해도 한 건만 올라갔고, 선두가 인원 때문에 못
    들어가면 뒤에 맞는 대기가 있어도 자리가 비어 있는 채로 남았다.
    인원이 안 맞는 대기는 건너뛰되 순번은 그대로 두어 다음 취소 때 다시 후보가 된다.
    """
    session = one(connection, "SELECT capacity FROM program_sessions WHERE id=%s FOR UPDATE", (session_id,))
    waiting = all_rows(connection, """SELECT id,party_size FROM bookings WHERE program_session_id=%s AND status='WAITING'
        ORDER BY queue_number FOR UPDATE SKIP LOCKED""", (session_id,))
    taken = reserved_seats(connection, session_id)
    for booking in waiting:
        if session["capacity"] is not None and taken + booking["party_size"] > session["capacity"]:
            continue
        connection.execute("UPDATE bookings SET status='CONFIRMED',queue_number=NULL,version=version+1,updated_at=now() WHERE id=%s",
                           (booking["id"],))
        taken += booking["party_size"]


@router.get("/visitor/bookings")
def my_bookings(request: Request, visitor: Visitor, connection: Db):
    rows = all_rows(connection, """SELECT b.id,b.status,b.party_size,b.queue_number,b.called_at,b.created_at,b.updated_at,
        ps.starts_at,ps.ends_at,p.title AS program_title,p.slug AS program_slug,a.name AS area_name
        FROM bookings b JOIN program_sessions ps ON ps.id=b.program_session_id JOIN programs p ON p.id=ps.program_id
        JOIN festival_areas a ON a.id=ps.area_id WHERE b.visitor_session_id=%s ORDER BY ps.starts_at""", (visitor["id"],))
    # OPS-10: 호출은 이 폴링 응답에 실릴 때 비로소 방문객에게 닿는다. 도달 결과를 운영자가
    # 확인할 수 있도록 응답에 실제로 실린 호출을 세션별로 남긴다.
    deliveries(connection, visitor["festival_id"], "BOOKING_CALL",
               [row["id"] for row in rows if row["status"] == "CALLED"], visitor["id"])
    return success(request, rows)


@router.post("/visitor/program-sessions/{session_id}/bookings", status_code=201)
def create_booking(session_id: str, body: BookingIn, request: Request, response: Response, visitor: Visitor,
                   connection: Db, idempotency_key: IdempotencyKey = None):
    def work():
        session = found(one(connection, """SELECT ps.*,p.title FROM program_sessions ps JOIN programs p ON p.id=ps.program_id
            WHERE ps.id=%s AND ps.festival_id=%s AND ps.status='OPEN' AND ps.ends_at>now() FOR UPDATE OF ps""",
            (session_id, visitor["festival_id"])), "예약 가능한 프로그램 회차를 찾을 수 없습니다.")
        confirmed = session["capacity"] is None or reserved_seats(connection, session_id) + body.party_size <= session["capacity"]
        queue_number = None if confirmed else one(connection, "SELECT coalesce(max(queue_number),0)+1 AS next FROM bookings WHERE program_session_id=%s", (session_id,))["next"]
        # contact는 더 이상 저장하지 않는다. JWT 서명 키를 pgp_sym_encrypt 키로 재사용하고 있었고
        # (키 하나가 유출되면 토큰 위조와 개인정보 복호화가 같이 뚫린다), 복호화하는 코드가 저장소
        # 어디에도 없어 읽을 수도 없는 쓰기 전용 데이터였다. 호출도 대기표 화면으로 하므로 필요 없다.
        try:
            row = one(connection, """INSERT INTO bookings(festival_id,visitor_session_id,program_session_id,status,party_size,queue_number)
                VALUES(%(festival_id)s,%(visitor_id)s,%(session_id)s,%(status)s,%(party_size)s,%(queue_number)s)
                RETURNING id,status,party_size,queue_number,created_at""",
                {"festival_id": visitor["festival_id"], "visitor_id": visitor["id"], "session_id": session_id,
                 "status": "CONFIRMED" if confirmed else "WAITING", "party_size": body.party_size,
                 "queue_number": queue_number})
        except UniqueViolation as error:
            raise conflict("DUPLICATE_ACTION", "같은 회차의 예약 또는 대기표가 이미 있습니다.") from error
        return 201, {**row, "programTitle": session["title"], "startsAt": session["starts_at"]}
    return idempotent_success(request, response, idempotent(connection, key=idempotency_key, scope=f"booking:{visitor['id']}:{session_id}", body=body.model_dump(), work=work))


@router.delete("/visitor/bookings/{booking_id}", status_code=204)
def cancel_booking(booking_id: str, visitor: Visitor, connection: Db) -> Response:
    booking = found(one(connection, """SELECT b.*,ps.starts_at FROM bookings b
        JOIN program_sessions ps ON ps.id=b.program_session_id
        WHERE b.id=%s AND b.visitor_session_id=%s FOR UPDATE OF b""", (booking_id, visitor["id"])))
    validate_booking_transition(booking["status"], "CANCELLED")
    validate_booking_cancel_window(booking["starts_at"])
    connection.execute("UPDATE bookings SET status='CANCELLED',cancelled_at=now(),version=version+1,updated_at=now() WHERE id=%s", (booking_id,))
    # 자리를 쓰고 있던 예약이 빠졌을 때만 대기를 올린다(CALLED도 자리를 차지한다).
    if booking["status"] in ("CONFIRMED", "CALLED"):
        promote_waiting(connection, booking["program_session_id"])
    return Response(status_code=204)


@router.get("/admin/festivals/{festival_id}/bookings")
def bookings(festival_id: str, request: Request, _: Scope, connection: Db, status: str | None = None,
             limit: int = Query(100, ge=1, le=200), cursor: str | None = None):
    """예약·대기표 목록. 티켓과 같은 (created_at, id) 키셋 커서로 자른다."""
    rows = all_rows(connection, f"""SELECT b.id,b.status,b.party_size,b.queue_number,b.called_at,b.created_at,b.updated_at,
        ps.starts_at,ps.ends_at,p.id AS program_id,p.title AS program_title
        FROM bookings b JOIN program_sessions ps ON ps.id=b.program_session_id JOIN programs p ON p.id=ps.program_id
        WHERE b.festival_id=%(festival_id)s AND (%(status)s::text IS NULL OR b.status=%(status)s)
        AND {keyset(alias="b")}
        ORDER BY b.created_at DESC,b.id DESC LIMIT %(limit)s""",
        {"festival_id": festival_id, "status": status, **cursor_params(cursor, limit)})
    rows, page = paged(rows, limit)
    rows.sort(key=lambda row: (row["starts_at"], row["queue_number"] is not None, row["queue_number"] or 0, row["created_at"]))
    return success(request, rows, page=page)


@router.post("/admin/festivals/{festival_id}/bookings/{booking_id}/status")
def update_booking_status(festival_id: str, booking_id: str, body: BookingStatusIn, request: Request, _: Scope, user: Operator, connection: Db):
    booking = found(one(connection, "SELECT * FROM bookings WHERE id=%s AND festival_id=%s FOR UPDATE", (booking_id, festival_id)))
    validate_booking_transition(booking["status"], body.status)
    # ops_tickets 전이와 같은 방식이다 — 상태별 타임스탬프는 SQL CASE로 두고 SQL 문자열은 고정한다.
    row = one(connection, """UPDATE bookings SET status=%(status)s,
        called_at=CASE WHEN %(status)s='CALLED' THEN now() ELSE called_at END,
        completed_at=CASE WHEN %(status)s='COMPLETED' THEN now() ELSE completed_at END,
        version=version+1,updated_at=now() WHERE id=%(booking_id)s RETURNING *""",
        {"status": body.status, "booking_id": booking_id})
    # 노쇼로 빠진 자리는 대기가 채워야 한다 — 안 그러면 정원이 남은 채로 회차가 끝난다.
    if body.status == "NO_SHOW":
        promote_waiting(connection, booking["program_session_id"])
    logged(connection, request, user, festival_id, body.status, "BOOKING", booking_id,
           before_data=booking, after_data={**row, "note": body.note})
    return success(request, row)
