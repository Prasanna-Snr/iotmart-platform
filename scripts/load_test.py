#!/usr/bin/env python3
"""Lightweight load test for the IoTMart backend.

Self-contained (asyncio + httpx, both already in the venv). Exercises the
public read endpoints with configurable concurrency and reports throughput,
latency percentiles, and error rate. Avoids auth/rate-limited endpoints.

Usage (from backend/):
    ./venv/bin/python ../scripts/load_test.py --concurrency 50 --requests 2000 --base http://localhost:8000
"""
from __future__ import annotations

import argparse
import asyncio
import random
import statistics
import time

import httpx

READ_PATHS = [
    "/api/health",
    "/api/products?page=1&page_size=20",
    "/api/products?featured=true&page_size=8",
    "/api/products?search=nodemcu",
    "/api/categories",
    "/api/brands",
    "/api/settings",
    "/api/tutorials?featured=true&published=true&page_size=3",
    "/api/tutorials?page=1&page_size=10",
]


async def worker(client: httpx.AsyncClient, sem, jobs, results, errors, start_evt):
    await start_evt.wait()
    while True:
        try:
            idx = jobs.get_nowait()
        except asyncio.QueueEmpty:
            return
        path = READ_PATHS[idx % len(READ_PATHS)]
        try:
            async with sem:
                t0 = time.perf_counter()
                r = await client.get(f"{client.base_url}{path}")
                elapsed_ms = (time.perf_counter() - t0) * 1000
            results.append(elapsed_ms)
            if r.status_code != 200:
                errors.append((path, r.status_code))
        except Exception as exc:  # noqa: BLE001
            errors.append((path, type(exc).__name__))


async def run(concurrency: int, requests: int, base: str) -> None:
    sem = asyncio.Semaphore(concurrency)
    jobs: asyncio.Queue = asyncio.Queue()
    for i in range(requests):
        jobs.put_nowait(i)

    results: list[float] = []
    errors: list[tuple] = []
    start_evt = asyncio.Event()

    limits = httpx.Limits(max_connections=200, max_keepalive_connections=50)
    async with httpx.AsyncClient(base_url=base, timeout=30.0, limits=limits) as client:
        workers = [asyncio.create_task(worker(client, sem, jobs, results, errors, start_evt))
                   for _ in range(concurrency)]
        start_evt.set()
        t0 = time.perf_counter()
        await asyncio.gather(*workers)
        total_s = time.perf_counter() - t0

    results.sort()
    n = len(results)
    rps = n / total_s
    p = lambda q: results[int(q * (n - 1))] if n else 0.0
    print(f"\n{'='*52}")
    print(f"base            : {base}")
    print(f"requests        : {n}   concurrency: {concurrency}")
    print(f"wall time       : {total_s:.2f}s   throughput: {rps:.1f} req/s")
    print(f"latency         : mean={statistics.mean(results):.1f}ms  "
          f"p50={p(0.50):.1f}ms  p95={p(0.95):.1f}ms  p99={p(0.99):.1f}ms  max={results[-1]:.1f}ms")
    print(f"errors          : {len(errors)}")
    for path, err in errors[:10]:
        print(f"    {err}  {path}")
    print("=" * 52)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--concurrency", type=int, default=50)
    ap.add_argument("--requests", type=int, default=2000)
    ap.add_argument("--base", default="http://localhost:8000")
    args = ap.parse_args()
    asyncio.run(run(args.concurrency, args.requests, args.base))


if __name__ == "__main__":
    main()
