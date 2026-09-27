"""참여업체(부스)와 상인 계정 초대. 공개 목록·운영자 심사·성과 지표."""
from fastapi import APIRouter, Request, Response

from ..db import all_rows, jsonb, one
from ..deps import Db, IfMatch, Manager, ManagerOrReviewer, Scope
from ..errors import bad_request, found
from ..http import success
from ..schemas import BusinessIn, FestivalBusinessPatch, MerchantInviteIn, ReviewIn
from ..security import hash_token, random_token
from .admin_core import created, in_festival, logged, patch_row, scoped
from .public import cached, published_festival


router = APIRouter(tags=["businesses"])


@router.get("/public/festivals/{festival_code}/businesses")
def public_businesses(festival_code: str, request: Request, response: Response, connection: Db, category: str | None = None):
    festival = published_festival(connection, festival_code)
    # 업체당 부스가 여러 개일 수 있어 그냥 조인하면 같은 업체가 부스 수만큼 중복된다.
    # 목록은 업체 단위이므로 대표 부스(booth_no 오름차순 첫 번째) 하나만 붙인다.
    rows = all_rows(connection, """SELECT DISTINCT ON (fb.id) fb.id,b.name,fb.category,fb.description,fb.menu,
        fb.operating_hours,fb.accessibility,b.address,bo.booth_no,bo.area_id,a.name AS area_name
        FROM festival_businesses fb JOIN businesses b ON b.id=fb.business_id
        LEFT JOIN booths bo ON bo.festival_business_id=fb.id LEFT JOIN festival_areas a ON a.id=bo.area_id
        WHERE fb.festival_id=%(festival_id)s AND fb.participation_status='APPROVED' AND b.status='ACTIVE'
          AND (%(category)s::text IS NULL OR fb.category=%(category)s) ORDER BY fb.id,bo.booth_no""",
        {"festival_id": festival["id"], "category": category})
    rows.sort(key=lambda row: row["name"])
    cached(response)
    return success(request, rows)


@router.get("/admin/festivals/{festival_id}/businesses")
def businesses(festival_id: str, request: Request, _: Scope, connection: Db, status: str | None = None):
    # 부스가 여러 개인 업체가 중복되지 않도록 대표 부스 하나만 붙인다(공개 목록과 같은 규칙).
    rows = all_rows(connection, """SELECT DISTINCT ON (fb.id) fb.*,b.registration_no,b.name,b.address,
        bo.id AS booth_id,bo.booth_no,bo.area_id
        FROM festival_businesses fb JOIN businesses b ON b.id=fb.business_id LEFT JOIN booths bo ON bo.festival_business_id=fb.id
        WHERE fb.festival_id=%(festival_id)s AND (%(status)s::text IS NULL OR fb.participation_status=%(status)s)
        ORDER BY fb.id,bo.booth_no""", {"festival_id": festival_id, "status": status})
    rows.sort(key=lambda row: row["name"])
    return success(request, rows)


@router.post("/admin/festivals/{festival_id}/businesses", status_code=201)
def create_business(festival_id: str, body: BusinessIn, request: Request, _: Scope, user: Manager, connection: Db):
    # 연락처는 저장하지 않는다. JWT 서명 키를 pgp_sym_encrypt 대칭 키로 재사용하고 있었고
    # (키 하나로 토큰 위조와 개인정보 복호화가 동시에 뚫린다), 저장소 어디에도 복호화 코드가
    # 없어 읽지도 못하는 쓰기 전용 데이터였다. 연락은 소유 멤버십 계정으로 한다.
    business = one(connection, """INSERT INTO businesses(organization_id,registration_no,name,address)
        VALUES(%(organization_id)s,%(registration_no)s,%(name)s,%(address)s)
        ON CONFLICT(organization_id,registration_no) DO UPDATE SET name=excluded.name,address=excluded.address,updated_at=now() RETURNING *""",
        {"organization_id": user["organization_id"], "registration_no": body.registration_no, "name": body.name,
         "address": jsonb(body.address)})
    row = one(connection, """INSERT INTO festival_businesses(festival_id,business_id,owner_membership_id,category,description,menu,operating_hours,accessibility)
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (festival_id, business["id"], body.owner_membership_id, body.category, body.description, jsonb(body.menu), jsonb(body.operating_hours), jsonb(body.accessibility)))
    if body.area_id and body.booth_no:
        if not in_festival(connection, "festival_areas", body.area_id, festival_id):
            raise bad_request("AREA_SCOPE_MISMATCH", "부스 구역이 같은 축제에 속하지 않습니다.")
        connection.execute("INSERT INTO booths(festival_business_id,area_id,booth_no) VALUES(%s,%s,%s)", (row["id"], body.area_id, body.booth_no))
    created(connection, request, user, festival_id, "FESTIVAL_BUSINESS", row)
    return success(request, {**row, "name": business["name"], "registrationNo": business["registration_no"]})


@router.patch("/admin/festivals/{festival_id}/businesses/{business_id}")
def update_festival_business(festival_id: str, business_id: str, body: FestivalBusinessPatch, request: Request,
                             _: Scope, user: Manager, connection: Db, if_match: IfMatch = None):
    """운영자가 참여업체 속성을 고친다.

    광고 노출(is_sponsored)과 ESG 참여(esg_participating)는 방문객 추천 점수와 광고 분리에
    쓰이는 값인데 설정할 API가 없어 DB를 직접 고치는 수밖에 없었다.
    """
    return success(request, patch_row(connection, request, user, "festival_businesses", business_id, festival_id,
                                      body, if_match))


@router.post("/admin/festivals/{festival_id}/businesses/{business_id}/review")
def review_business(festival_id: str, business_id: str, body: ReviewIn, request: Request, _: Scope, user: ManagerOrReviewer, connection: Db):
    row = one(connection, """UPDATE festival_businesses SET participation_status=%(decision)s,review_comment=%(comment)s,
        approved_by=%(reviewer)s,approved_at=CASE WHEN %(decision)s='APPROVED' THEN now() ELSE NULL END,
        version=version+1,updated_at=now()
        WHERE id=%(business_id)s AND festival_id=%(festival_id)s
          AND participation_status IN ('SUBMITTED','REJECTED') RETURNING *""",
        {"decision": body.decision, "comment": body.comment, "reviewer": user["id"],
         "business_id": business_id, "festival_id": festival_id})
    if not row:
        raise bad_request("INVALID_STATE_TRANSITION", "제출 또는 반려 상태의 업체만 검토할 수 있습니다.")
    logged(connection, request, user, festival_id, body.decision, "FESTIVAL_BUSINESS", business_id, after_data=row)
    return success(request, row)


# BIZ-05 초대 링크 만료. 기획에서 72시간으로 확정했다.
INVITATION_HOURS = 72


@router.get("/admin/festivals/{festival_id}/businesses/{business_id}/invitations")
def merchant_invitations(festival_id: str, business_id: str, request: Request, _: Scope, user: Manager, connection: Db):
    """업체에 발급한 상인 계정 초대와 현재 연결된 계정."""
    scoped(connection, "festival_businesses", business_id, festival_id)
    rows = all_rows(connection, """SELECT mi.id,mi.email,mi.status,mi.expires_at,mi.accepted_at,mi.created_at,
        (mi.status='PENDING' AND mi.expires_at<=now()) AS expired,u.name AS accepted_name
        FROM merchant_invitations mi LEFT JOIN memberships m ON m.id=mi.membership_id LEFT JOIN users u ON u.id=m.user_id
        WHERE mi.festival_business_id=%s ORDER BY mi.created_at DESC""", (business_id,))
    owner = one(connection, """SELECT m.id AS membership_id,m.status,u.name,u.email FROM festival_businesses fb
        JOIN memberships m ON m.id=fb.owner_membership_id JOIN users u ON u.id=m.user_id WHERE fb.id=%s""", (business_id,))
    return success(request, {"invitations": rows, "owner": owner})


@router.post("/admin/festivals/{festival_id}/businesses/{business_id}/invitations", status_code=201)
def create_merchant_invitation(festival_id: str, business_id: str, body: MerchantInviteIn, request: Request,
                               _: Scope, user: Manager, connection: Db):
    """상인 계정 초대 발급.

    계정은 이 링크로만 만들어진다(자율 가입 없음). 사업자 증빙은 BIZ-01 업체 승인 절차에서
    이미 확인하므로 여기서 다시 검증하지 않는다. 토큰 원문은 응답으로 한 번만 나가고
    서버에는 해시만 남는다 — 유출된 DB로 초대를 수락할 수 없게.
    """
    scoped(connection, "festival_businesses", business_id, festival_id, "참여업체를 찾을 수 없습니다.")
    token = random_token("mi")
    row = one(connection, """INSERT INTO merchant_invitations(festival_business_id,email,token_hash,invited_by,expires_at)
        VALUES(%s,%s,%s,%s,now()+make_interval(hours => %s)) RETURNING id,email,status,expires_at,created_at""",
        (business_id, str(body.email).lower(), hash_token(token), user["id"], INVITATION_HOURS))
    # 초대받는 사람의 표시 이름은 수락 시점에 계정이 없을 때만 쓰이므로 초대 행에 두지 않고 링크에 싣는다.
    logged(connection, request, user, festival_id, "INVITE", "MERCHANT_ACCOUNT", str(row["id"]),
           after_data={"email": row["email"], "businessId": business_id})
    return success(request, {**row, "inviteToken": token, "name": body.name, "expiresInHours": INVITATION_HOURS})


@router.post("/admin/festivals/{festival_id}/businesses/{business_id}/invitations/{invitation_id}/revoke")
def revoke_merchant_invitation(festival_id: str, business_id: str, invitation_id: str, request: Request,
                               _: Scope, user: Manager, connection: Db):
    row = one(connection, """UPDATE merchant_invitations mi SET status='REVOKED' FROM festival_businesses fb
        WHERE mi.id=%s AND mi.festival_business_id=fb.id AND fb.id=%s AND fb.festival_id=%s AND mi.status='PENDING'
        RETURNING mi.id,mi.email,mi.status""", (invitation_id, business_id, festival_id))
    if not row:
        raise bad_request("INVALID_STATE_TRANSITION", "대기 중인 초대만 회수할 수 있습니다.")
    logged(connection, request, user, festival_id, "REVOKE", "MERCHANT_ACCOUNT", invitation_id, after_data=row)
    return success(request, row)


@router.delete("/admin/festivals/{festival_id}/businesses/{business_id}/merchant", status_code=204)
def deactivate_business_merchant(festival_id: str, business_id: str, request: Request, _: Scope, user: Manager,
                                 connection: Db) -> Response:
    """업체와 연결된 상인 계정을 비활성화한다(축제 종료 후 정리).

    계정을 지우지 않고 비활성화만 한다 — 보유기간(비활성화 후 1년)이 지나면 OPS-11 파기
    배치가 개인정보를 지운다. 업체 연결도 끊어 이후 본인 확인이 성립하지 않게 한다.
    """
    business = found(one(connection, """SELECT owner_membership_id FROM festival_businesses
        WHERE id=%s AND festival_id=%s""", (business_id, festival_id)))
    if not business["owner_membership_id"]:
        raise bad_request("MERCHANT_NOT_LINKED", "이 업체에 연결된 상인 계정이 없습니다.")
    connection.execute("""UPDATE memberships SET status='INACTIVE',deactivated_at=coalesce(deactivated_at,now())
        WHERE id=%s AND role='MERCHANT'""", (business["owner_membership_id"],))
    connection.execute("UPDATE festival_businesses SET owner_membership_id=NULL,updated_at=now() WHERE id=%s", (business_id,))
    logged(connection, request, user, festival_id, "DEACTIVATE", "MERCHANT_ACCOUNT", str(business["owner_membership_id"]),
           after_data={"businessId": business_id})
    return Response(status_code=204)


# BIZ-04 소규모 표본 보호. 표본 업체가 이보다 적으면 비교 통계에서 개별 업체 실적이 역산된다.
MIN_COMPARISON_SAMPLE = 5


@router.get("/admin/festivals/{festival_id}/business-performance")
def business_performance(festival_id: str, request: Request, _: Scope, user: Manager, connection: Db):
    """BIZ-04 운영자용 업체별 전환 지표와 전체 참여 성과.

    매출은 수집 동의(sales_consent)가 있는 업체만 집계·표시한다. 비교 통계는 표본이
    MIN_COMPARISON_SAMPLE 미만이면 개별 업체 실적이 역산되므로 내려주지 않는다.
    """
    # 이벤트와 쿠폰을 한 쿼리에서 조인하면 곱집합이 된다 — 노출 1건이 발급 쿠폰 수만큼
    # 불어나 전환율과 매출이 통째로 틀렸다. 서로 무관한 집계라 각각 서브쿼리로 센다.
    rows = all_rows(connection, """SELECT fb.id,b.name,fb.category,fb.is_sponsored,fb.esg_participating,fb.sales_consent,
        coalesce(e.impressions,0)::int AS impressions,coalesce(e.visits,0)::int AS visits,
        coalesce(k.coupons_issued,0)::int AS coupons_issued,coalesce(k.coupons_redeemed,0)::int AS coupons_redeemed,
        CASE WHEN fb.sales_consent THEN coalesce(e.sales_amount,0) END AS sales_amount
        FROM festival_businesses fb JOIN businesses b ON b.id=fb.business_id
        LEFT JOIN LATERAL (SELECT count(*) FILTER(WHERE be.event_type='IMPRESSION') AS impressions,
                                  count(*) FILTER(WHERE be.event_type='VISIT') AS visits,
                                  coalesce(sum(be.sales_amount),0) AS sales_amount
                           FROM business_events be WHERE be.festival_business_id=fb.id) e ON true
        LEFT JOIN LATERAL (SELECT count(ci.id) AS coupons_issued,
                                  count(cr.id) FILTER(WHERE cr.status='REDEEMED') AS coupons_redeemed
                           FROM coupons c JOIN coupon_issues ci ON ci.coupon_id=c.id
                           LEFT JOIN coupon_redemptions cr ON cr.coupon_issue_id=ci.id
                           WHERE c.festival_business_id=fb.id) k ON true
        WHERE fb.festival_id=%s AND fb.participation_status='APPROVED'
        ORDER BY b.name""", (festival_id,))
    for row in rows:
        row["redemption_rate"] = round(row["coupons_redeemed"] / row["coupons_issued"] * 100, 1) if row["coupons_issued"] else None
        row["visit_rate"] = round(row["visits"] / row["impressions"] * 100, 1) if row["impressions"] else None
    totals = {key: sum(row[key] for row in rows) for key in ("impressions", "visits", "coupons_issued", "coupons_redeemed")}
    totals["businesses"] = len(rows)
    totals["salesConsented"] = sum(1 for row in rows if row["sales_consent"])
    comparison = None
    if len(rows) >= MIN_COMPARISON_SAMPLE:
        rates = sorted(row["redemption_rate"] for row in rows if row["redemption_rate"] is not None)
        comparison = {
            "averageRedemptionRate": round(sum(rates) / len(rates), 1) if rates else None,
            "medianRedemptionRate": rates[len(rates) // 2] if rates else None,
            "averageCouponsIssued": round(totals["coupons_issued"] / len(rows), 1),
        }
    return success(request, {
        "items": rows, "totals": totals, "comparison": comparison,
        "comparisonSuppressed": comparison is None,
        "minComparisonSample": MIN_COMPARISON_SAMPLE,
        "salesNotice": "매출은 수집 동의를 받은 업체만 집계합니다.",
    })
