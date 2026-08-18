#!/usr/bin/env python3
"""Seed demo completed journeys WITH synthesized GPS traces (sampled along
the route path with small jitter) so the journey-history / replay feature is
immediately demonstrable. Idempotent-ish: adds new journeys each run."""
import json
import random
import urllib.request

BASE = "http://localhost:3000"

def post(url, body, method="POST"):
    if url.startswith("/"):
        url = BASE + url
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def synth_trace(path, n=None):
    if len(path) < 2:
        return []
    if n is None:
        n = max(4, len(path) * 2)
    trace = []
    for i in range(n):
        t = i / max(1, n - 1)
        seg_t = t * (len(path) - 1)
        idx = int(seg_t)
        frac = seg_t - idx
        if idx >= len(path) - 1:
            a = b = path[-1]
        else:
            a = path[idx]
            b = path[idx + 1]
        lng = a[0] + (b[0] - a[0]) * frac + (random.random() - 0.5) * 0.00003
        lat = a[1] + (b[1] - a[1]) * frac + (random.random() - 0.5) * 0.00003
        ts = "2026-08-18T09:%02d:%02d.000Z" % (int(i * 6 / 60) % 60, int(i * 6) % 60)
        trace.append({
            "lat": lat, "lng": lng,
            "accuracyM": 5 + random.random() * 8,
            "capturedTs": ts,
        })
    return trace

PAIRS = [
    ("hostel-3", "ab1", "NORMAL"),
    ("hostel-1", "library", "HURRY"),
    ("dining-hall", "library", "NORMAL"),
    ("hostel-4", "ab3", "RELAXED"),
    ("hostel-5", "ab1", "NORMAL"),
]

for frm, to, mode in PAIRS:
    routes = post("/api/route-compute", {"from": frm, "to": to, "mode": mode})
    r = routes.get("fastest") or routes.get("shortest") or {}
    if not r:
        print(f"  {frm}->{to} {mode}: no route, skipping")
        continue
    path = r.get("path", [])
    dist = r.get("distanceM", 300)
    pred = r.get("durationS", 300)
    trace = synth_trace(path)
    actual = int(pred * (0.9 + 0.25 * random.random()))
    jid = post("/api/journeys", {
        "from": frm, "to": to, "mode": mode, "predictedS": pred,
    })["journeyId"]
    post(f"/api/journeys/{jid}", {
        "status": "COMPLETED", "actualS": actual, "actualM": dist, "gpsTrace": trace,
    }, method="PATCH")
    print(f"  {frm}->{to} {mode}: pred={pred}s actual={actual}s dist={dist}m trace_pts={len(trace)}")

print("seeding complete")
