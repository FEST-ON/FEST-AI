"""쿠폰과 리워드 포인트. 발급(방문객)·사용 처리(운영자·상인)·캠페인 등록(운영자)."""
from fastapi import APIRouter, Request, Response
from psycopg.errors import UniqueViolation

from ..db import all_rows, audit, idempotent, jsonb, one
from ..deps import Db, IdempotencyKey, Manager, Operator, Scope, Visitor
from ..errors import bad_request, conflict, found
from ..http import idempotent_success, success
from ..schemas import CouponIn, CouponRedeemIn, RewardActionIn, RewardCampaignIn, RewardEventIn
from ..security import hash_token, random_token
from .admin_core import created
from .public import cached, published_festival


router = APIRouter(tags=["rewards"])


def redeem_issue(connection, request: Request, issue: dict, actor_id, festival_id: str) -> dict:
    """발급된 쿠폰을 사용 처리한다.

    운영자 경로(현장 QR 스캔)와 상인 경로가 같은 처리를 한다 — 발급 건을 어떻게 찾고
    누구 것인지 확인하는 부분만 각 라우트에 있다.
    """
    if issue["status"] != "ISSUED" or issue["expired"]:
        raise conflict("INVALID_COUPON_STATUS", "사용 가능 상태의 쿠폰이 아닙니다.")
    try:
        redemption = one(connection, """INSERT INTO coupon_redemptions(coupon_issue_id,festival_business_id,processed_by)
            VALUES(%s,%s,%s) RETURNING *""", (issue["id"], issue["festival_business_id"], actor_id))
    except UniqueViolation as error:
        # 사용 취소된 발급 건은 상태가 ISSUED로 돌아오지만 사용 이력 행은 남아 있다.
        raise conflict("DUPLICATE_ACTION", "이미 사용 처리된 쿠폰입니다.") from error
    connection.execute("UPDATE coupon_issues SET status='REDEEMED' WHERE id=%s", (issue["id"],))
    connection.execute("INSERT INTO business_events(festival_business_id,visitor_session_id,event_type,source) VALUES(%s,%s,'COUPON_REDEEM','COUPON')",
        (issue["festival_business_id"], issue["visitor_session_id"]))
    audit(connection, festival_id=festival_id, actor_id=str(actor_id), action="REDEEM", resource_type="COUPON_ISSUE",
          resource_id=str(issue["id"]), after_data=redemption, request_id=request.state.request_id)
    return redemption


def insert_coupon(connection, business_id: str, body: CouponIn, created_by) -> dict:
    """운영자 경로와 상인 경로가 같은 쿠폰을 만든다. 접근 권한 검사는 각 라우트에 있다."""
    return one(connection, """INSERT INTO coupons(festival_business_id,name,description,benefit_type,benefit_value,issue_limit,
        per_visitor_limit,valid_from,valid_until,created_by) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
        (business_id, body.name, body.description, body.benefit_type, body.benefit_value, body.issue_limit,
         body.per_visitor_limit, body.starts_at, body.ends_at, created_by))


@router.get("/public/festivals/{festival_code}/coupons")
def public_coupons(festival_code: str, request: Request, response: Response, connection: Db):
    festival = published_festival(connection, festival_code)
    rows = all_rows(connection, """SELECT c.id,c.name,c.description,c.benefit_type,c.benefit_value,c.valid_from,c.valid_until,
        c.per_visitor_limit,
        c.issue_limit-(SELECT count(*) FROM coupon_issues ci WHERE ci.coupon_id=c.id) AS remaining,b.name AS business_name
        FROM coupons c JOIN festival_businesses fb ON fb.id=c.festival_business_id JOIN businesses b ON b.id=fb.business_id
        WHERE fb.festival_id=%s AND fb.participation_status='APPROVED' AND c.status='ACTIVE'
          AND c.valid_from<=now() AND c.valid_until>now() ORDER BY c.valid_until,c.name""", (festival["id"],))
    cached(response, 30)
    return success(request, rows)


@router.get("/visitor/coupons")
def my_coupons(request: Request, visitor: Visitor, connection: Db):
    # coupon_id를 함께 준다 — 없으면 화면이 "이미 발급받았는지"를 업체명·쿠폰명 문자열로
    # 짐작해야 해서, 방문객당 한도가 2장 이상인 쿠폰의 두 번째 발급이 잠겼다.
    rows = all_rows(connection, """SELECT ci.id,CASE WHEN ci.expires_at<=now() AND ci.status='ISSUED' THEN 'EXPIRED' ELSE ci.status END AS status,
        ci.issued_at,ci.expires_at,ci.coupon_id,c.name,c.description,c.benefit_type,c.benefit_value,b.name AS business_name
        FROM coupon_issues ci JOIN coupons c ON c.id=ci.coupon_id JOIN festival_businesses fb ON fb.id=c.festival_business_id
        JOIN businesses b ON b.id=fb.business_id WHERE ci.visitor_session_id=%s ORDER BY ci.issued_at DESC""", (visitor["id"],))
    return success(request, rows)


@router.post("/visitor/coupons/{coupon_id}/issues", status_code=201)
def issue_coupon(coupon_id: str, request: Request, response: Response, visitor: Visitor, connection: Db, idempotency_key: IdempotencyKey = None):
    def work():
        coupon = found(one(connection, """SELECT c.*,fb.festival_id,b.name AS business_name FROM coupons c
            JOIN festival_businesses fb ON fb.id=c.festival_business_id JOIN businesses b ON b.id=fb.business_id
            WHERE c.id=%s AND fb.festival_id=%s AND fb.participation_status='APPROVED' AND c.status='ACTIVE'
              AND c.valid_from<=now() AND c.valid_until>now() FOR UPDATE OF c""", (coupon_id, visitor["festival_id"])),
            "발급 가능한 쿠폰을 찾을 수 없습니다.")
        counts = one(connection, """SELECT count(*)::int AS total,
            count(*) FILTER(WHERE visitor_session_id=%s)::int AS mine FROM coupon_issues WHERE coupon_id=%s""", (visitor["id"], coupon_id))
        if counts["total"] >= coupon["issue_limit"]:
            raise conflict("CAPACITY_EXCEEDED", "쿠폰이 모두 발급되었습니다.")
        if counts["mine"] >= coupon["per_visitor_limit"]:
            raise conflict("ACTION_LIMIT_EXCEEDED", "방문객별 쿠폰 발급 한도를 초과했습니다.")
        token = random_token("cp")
        try:
            row = one(connection, """INSERT INTO coupon_issues(coupon_id,visitor_session_id,issue_token_hash,expires_at)
                VALUES(%s,%s,%s,%s) RETURNING id,status,issued_at,expires_at""", (coupon_id, visitor["id"], hash_token(token), coupon["valid_until"]))
        except UniqueViolation as error:
            raise conflict("DUPLICATE_ACTION", "이미 발급받은 쿠폰입니다.") from error
        connection.execute("INSERT INTO business_events(festival_business_id,visitor_session_id,event_type,source) VALUES(%s,%s,'COUPON_ISSUE','COUPON')",
            (coupon["festival_business_id"], visitor["id"]))
        return 201, {**row, "issueToken": token, "couponName": coupon["name"], "businessName": coupon["business_name"]}
    return idempotent_success(request, response, idempotent(connection, key=idempotency_key, scope=f"coupon:{visitor['id']}:{coupon_id}", body={}, work=work))


@router.post("/visitor/coupon-issues/{issue_id}/token")
def rotate_issue_token(issue_id: str, request: Request, visitor: Visitor, connection: Db):
    """쿠폰 사용 토큰 재발급.

    서버에는 해시만 남아서 발급 응답을 놓치면(기기 교체, 저장소 삭제) QR을 다시 만들 수 없고,
    쿠폰은 이미 발급돼 재발급도 막혀 있어 방문객이 영영 쓸 수 없는 상태가 됐다.
    새 토큰을 발급하고 해시를 교체한다 — 예전 토큰은 그 즉시 무효가 되므로 잃어버린
    QR 사진이 남의 손에 있어도 쓰이지 않는다.
    """
    issue = found(one(connection, """SELECT ci.id,ci.status,(ci.expires_at<=now()) AS expired,c.name
        FROM coupon_issues ci JOIN coupons c ON c.id=ci.coupon_id
        WHERE ci.id=%s AND ci.visitor_session_id=%s FOR UPDATE OF ci""", (issue_id, visitor["id"])),
        "발급받은 쿠폰을 찾을 수 없습니다.")
    if issue["status"] != "ISSUED" or issue["expired"]:
        raise conflict("INVALID_COUPON_STATUS", "사용 가능 상태의 쿠폰만 재발급할 수 있습니다.")
    token = random_token("cp")
    row = one(connection, """UPDATE coupon_issues SET issue_token_hash=%s WHERE id=%s
        RETURNING id,status,issued_at,expires_at""", (hash_token(token), issue_id))
    return success(request, {**row, "issueToken": token, "couponName": issue["name"]})


@router.get("/visitor/reward-actions")
def reward_actions(request: Request, visitor: Visitor, connection: Db):
    rows = all_rows(connection, """SELECT a.id,a.action_type,a.verification_type,a.points,a.per_user_limit,a.rule,
        count(e.id)::int AS earned_count FROM reward_actions a JOIN reward_campaigns c ON c.id=a.campaign_id
        LEFT JOIN reward_events e ON e.reward_action_id=a.id AND e.visitor_session_id=%s
        WHERE c.festival_id=%s AND c.status='ACTIVE' AND c.starts_at<=now() AND c.ends_at>now()
        GROUP BY a.id ORDER BY a.action_type""", (visitor["id"], visitor["festival_id"]))
    # rule에는 인증 키가 들어 있어 그대로 내려주지 않고 표시에 필요한 이름·위치만 추린다.
    return success(request, [{
        "id": row["id"], "action_type": row["action_type"], "points": row["points"],
        "verification_type": row["verification_type"],
        "name": (row["rule"] or {}).get("name", row["action_type"]),
        "location": (row["rule"] or {}).get("location", ""),
        "completed": row["earned_count"] >= row["per_user_limit"],
    } for row in rows])


@router.post("/visitor/reward-events", status_code=201)
def create_reward_event(body: RewardEventIn, request: Request, response: Response, visitor: Visitor, connection: Db, idempotency_key: IdempotencyKey = None):
    def work():
        action = found(one(connection, """SELECT a.*,c.festival_id,c.daily_point_limit FROM reward_actions a JOIN reward_campaigns c ON c.id=a.campaign_id
            WHERE a.id=%s AND c.festival_id=%s AND c.status='ACTIVE' AND c.starts_at<=now() AND c.ends_at>now() FOR UPDATE OF c""",
            (body.reward_action_id, visitor["festival_id"])), "참여 가능한 리워드 행동을 찾을 수 없습니다.")
        count = one(connection, "SELECT count(*)::int AS count FROM reward_events WHERE reward_action_id=%s AND visitor_session_id=%s",
            (body.reward_action_id, visitor["id"]))["count"]
        if count >= action["per_user_limit"]:
            raise conflict("ACTION_LIMIT_EXCEEDED", "행동별 참여 한도를 초과했습니다.")
        allowed_keys = (action["rule"] or {}).get("verificationKeys")
        if allowed_keys and body.verification_key not in allowed_keys:
            raise bad_request("INVALID_VERIFICATION", "유효하지 않은 행동 인증 값입니다.")
        # daily_point_limit은 캠페인별 설정인데 예전에는 point_ledger 전체 합계와 비교해서
        # 캠페인 A에서 쌓은 포인트가 캠페인 B의 한도를 잡아먹었다. 같은 캠페인 적립분만 센다.
        today_points = one(connection, """SELECT coalesce(sum(pl.points_delta),0)::int AS points FROM point_ledger pl
            JOIN reward_events re ON re.id=pl.reward_event_id JOIN reward_actions ra ON ra.id=re.reward_action_id
            WHERE pl.visitor_session_id=%s AND ra.campaign_id=%s AND pl.created_at::date=CURRENT_DATE""",
            (visitor["id"], action["campaign_id"]))["points"]
        if today_points + action["points"] > action["daily_point_limit"]:
            raise conflict("DAILY_POINT_LIMIT_EXCEEDED", "일일 포인트 한도를 초과했습니다.")
        try:
            # occurred_at은 스키마로 받기만 하고 버려지고 있었다 — 현장 인증 시각과 서버 도달
            # 시각이 다를 수 있으므로 준 값을 그대로 남긴다(없으면 컬럼 기본값 now()).
            event = one(connection, """INSERT INTO reward_events(reward_action_id,visitor_session_id,verification_key,evidence,occurred_at)
                VALUES(%s,%s,%s,%s,coalesce(%s,now())) RETURNING *""",
                (body.reward_action_id, visitor["id"], body.verification_key, jsonb(body.evidence), body.occurred_at))
        except UniqueViolation as error:
            raise conflict("DUPLICATE_ACTION", "이미 인증된 행동입니다.") from error
        ledger = one(connection, "INSERT INTO point_ledger(visitor_session_id,reward_event_id,points_delta,reason) VALUES(%s,%s,%s,%s) RETURNING *",
            (visitor["id"], event["id"], action["points"], action["action_type"]))
        return 201, {"event": event, "points": ledger["points_delta"]}
    return idempotent_success(request, response, idempotent(connection, key=idempotency_key, scope=f"reward:{visitor['id']}:{body.reward_action_id}", body=body.model_dump(), work=work))


@router.get("/visitor/points")
def points(request: Request, visitor: Visitor, connection: Db):
    ledger = all_rows(connection, "SELECT id,points_delta,reason,created_at FROM point_ledger WHERE visitor_session_id=%s ORDER BY created_at DESC", (visitor["id"],))
    return success(request, {"balance": sum(row["points_delta"] for row in ledger), "ledger": ledger})


@router.get("/admin/festivals/{festival_id}/businesses/{business_id}/coupons")
def coupons(festival_id: str, business_id: str, request: Request, _: Scope, connection: Db):
    return success(request, all_rows(connection, """SELECT c.*,(SELECT count(*) FROM coupon_issues ci WHERE ci.coupon_id=c.id)::int AS issued_count
        FROM coupons c JOIN festival_businesses fb ON fb.id=c.festival_business_id WHERE fb.festival_id=%s AND fb.id=%s ORDER BY c.created_at DESC""",
        (festival_id, business_id)))


@router.post("/admin/festivals/{festival_id}/businesses/{business_id}/coupons", status_code=201)
def create_coupon(festival_id: str, business_id: str, body: CouponIn, request: Request, _: Scope, user: Manager, connection: Db):
    if not one(connection, "SELECT 1 FROM festival_businesses WHERE id=%s AND festival_id=%s AND participation_status='APPROVED'", (business_id, festival_id)):
        raise bad_request("BUSINESS_NOT_APPROVED", "승인된 참여업체만 쿠폰을 발행할 수 있습니다.")
    row = insert_coupon(connection, business_id, body, user["id"])
    created(connection, request, user, festival_id, "COUPON", row)
    return success(request, row)


@router.post("/admin/festivals/{festival_id}/coupon-redemptions")
def redeem_coupon_on_site(festival_id: str, body: CouponRedeemIn, request: Request, _: Scope, user: Operator, connection: Db):
    """현장 운영자가 방문객 QR(사용 토큰)을 읽어 쿠폰을 사용 처리한다.

    상인용 경로(/merchant/coupon-issues/{issue_id}/redeem)는 업체 소유자로 범위가 묶여 있어
    운영자가 대신 처리할 수 없다. 여기서는 축제 범위로만 제한하고, 스캔한 토큰 하나로 발급
    건을 찾는다 — QR에 발급 ID까지 담지 않아도 되도록.
    """
    issue = one(connection, """SELECT ci.id,ci.status,ci.visitor_session_id,(ci.expires_at<=now()) AS expired,
        c.festival_business_id,c.name FROM coupon_issues ci JOIN coupons c ON c.id=ci.coupon_id
        JOIN festival_businesses fb ON fb.id=c.festival_business_id
        WHERE ci.issue_token_hash=%s AND fb.festival_id=%s FOR UPDATE OF ci""",
        (hash_token(body.issue_token), festival_id))
    if not issue:
        raise bad_request("INVALID_COUPON_TOKEN", "이 축제에서 발급된 쿠폰을 찾을 수 없습니다.")
    redemption = redeem_issue(connection, request, issue, user["id"], festival_id)
    return success(request, {**redemption, "couponName": issue["name"]})


@router.get("/admin/festivals/{festival_id}/reward-campaigns")
def reward_campaigns(festival_id: str, request: Request, _: Scope, connection: Db):
    """등록한 캠페인과 적립 행동을 다시 볼 수 있어야 운영자가 중복 등록을 피한다."""
    rows = all_rows(connection, """SELECT c.*, coalesce(jsonb_agg(jsonb_build_object(
            'id',a.id,'action_type',a.action_type,'verification_type',a.verification_type,
            'points',a.points,'per_user_limit',a.per_user_limit,'rule',a.rule)
            ORDER BY a.action_type) FILTER (WHERE a.id IS NOT NULL), '[]') AS actions
        FROM reward_campaigns c LEFT JOIN reward_actions a ON a.campaign_id=c.id
        WHERE c.festival_id=%s GROUP BY c.id ORDER BY c.starts_at DESC""", (festival_id,))
    return success(request, rows)


@router.post("/admin/festivals/{festival_id}/reward-campaigns", status_code=201)
def create_reward_campaign(festival_id: str, body: RewardCampaignIn, request: Request, _: Scope, user: Manager, connection: Db):
    row = one(connection, """INSERT INTO reward_campaigns(festival_id,name,starts_at,ends_at,daily_point_limit,created_by)
        VALUES(%s,%s,%s,%s,%s,%s) RETURNING *""", (festival_id, body.name, body.starts_at, body.ends_at, body.daily_point_limit, user["id"]))
    created(connection, request, user, festival_id, "REWARD_CAMPAIGN", row)
    return success(request, row)


@router.post("/admin/festivals/{festival_id}/reward-campaigns/{campaign_id}/actions", status_code=201)
def create_reward_action(festival_id: str, campaign_id: str, body: RewardActionIn, request: Request, _: Scope, user: Manager, connection: Db):
    # QR·현장 확인 리워드는 인증 값이 있어야 검증이 성립한다. rule.verificationKeys가 비어 있으면
    # 서버가 어떤 값이든 통과시켜서, 방문객이 현장에 가지 않고도 포인트를 받을 수 있었다.
    if body.verification_type != "SELF" and not (body.rule or {}).get("verificationKeys"):
        raise bad_request("VERIFICATION_KEYS_REQUIRED",
                          "SELF가 아닌 인증 방식은 rule.verificationKeys에 인증 값을 1개 이상 등록해야 합니다.")
    row = found(one(connection, """INSERT INTO reward_actions(campaign_id,action_type,verification_type,points,per_user_limit,rule)
        SELECT %s,%s,%s,%s,%s,%s WHERE EXISTS(SELECT 1 FROM reward_campaigns WHERE id=%s AND festival_id=%s) RETURNING *""",
        (campaign_id, body.action_type, body.verification_type, body.points, body.per_user_limit, jsonb(body.rule), campaign_id, festival_id)))
    created(connection, request, user, festival_id, "REWARD_ACTION", row)
    return success(request, row)
