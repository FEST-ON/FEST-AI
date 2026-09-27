"""전용 잡 워커 프로세스.

기본은 API 프로세스 안의 데몬 스레드(app.jobs.start_worker)다. 보고서 생성처럼 무거운
잡이 API와 CPU·커넥션을 나눠 쓰는 게 부담이 되면, 이 스크립트를 별도 서비스로 띄우고
API 쪽은 `RUN_INLINE_WORKER=false`로 둔다. 둘 다 켜 두어도 `FOR UPDATE SKIP LOCKED`가
중복 처리를 막지만, 그러면 분리한 의미가 없다.
"""
import logging

from app.db import pool
from app.jobs import start_worker


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    pool.open(wait=True)
    stopped, thread = start_worker()
    try:
        thread.join()
    except KeyboardInterrupt:
        stopped.set()
        thread.join(timeout=2)
    finally:
        pool.close()


if __name__ == "__main__":
    main()
