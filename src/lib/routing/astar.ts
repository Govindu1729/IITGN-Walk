// A* path search using a great-circle heuristic. Equivalent to Dijkstra when
// heuristic=0; faster in practice when goal is well-localised (typical campus
// routes). Admissible heuristic = straight-line distance / max-walkable-speed.

import type { Graph } from "./types";
import type { CostFn } from "./cost";
import type { WalkingMode } from "./types";
import { haversine } from "../geo/geo";

const MAX_WALK_SPEED = 2.2; // m/s upper bound for admissibility (hurry + path)

interface HeapItem {
  f: number;
  cost: number;
  node: string;
}

class MinHeap {
  private h: HeapItem[] = [];
  push(item: HeapItem) {
    this.h.push(item);
    this.bubbleUp(this.h.length - 1);
  }
  pop(): HeapItem | undefined {
    if (this.h.length === 0) return undefined;
    const top = this.h[0];
    const last = this.h.pop()!;
    if (this.h.length) {
      this.h[0] = last;
      this.sinkDown(0);
    }
    return top;
  }
  get size() {
    return this.h.length;
  }
  private bubbleUp(i: number) {
    const item = this.h[i];
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.h[parent].f <= item.f) break;
      this.h[i] = this.h[parent];
      i = parent;
    }
    this.h[i] = item;
  }
  private sinkDown(i: number) {
    const n = this.h.length;
    const item = this.h[i];
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let smallest = i;
      if (l < n && this.h[l].f < this.h[smallest].f) smallest = l;
      if (r < n && this.h[r].f < this.h[smallest].f) smallest = r;
      if (smallest === i) break;
      this.h[i] = this.h[smallest];
      i = smallest;
    }
    this.h[i] = item;
  }
}

export interface AStarResult {
  cost: number;
  path: string[];
  edges: string[];
}

/** A* from `start` to `goal`. Returns null if no path. */
export function astar(
  graph: Graph,
  start: string,
  goal: string,
  costFn: CostFn,
  mode: WalkingMode,
  speed: number,
): AStarResult | null {
  if (!graph.nodes.has(start) || !graph.nodes.has(goal)) return null;
  if (start === goal) return { cost: 0, path: [start], edges: [] };

  const goalNode = graph.nodes.get(goal)!;
  const gScore = new Map<string, number>();
  const prev = new Map<string, { node: string; edge: string }>();
  const visited = new Set<string>();
  const heap = new MinHeap();

  const heuristic = (slug: string) => {
    const n = graph.nodes.get(slug);
    if (!n) return 0;
    return haversine({ lat: n.lat, lng: n.lng }, { lat: goalNode.lat, lng: goalNode.lng }) / MAX_WALK_SPEED;
  };

  gScore.set(start, 0);
  heap.push({ f: heuristic(start), cost: 0, node: start });

  while (heap.size) {
    const cur = heap.pop()!;
    if (visited.has(cur.node)) continue;
    visited.add(cur.node);
    if (cur.node === goal) break;

    const neighbors = graph.adj.get(cur.node) ?? [];
    for (const { edge, to } of neighbors) {
      if (visited.has(to)) continue;
      const stepCost = costFn(edge, mode, speed);
      if (!isFinite(stepCost)) continue;
      const tentative = cur.cost + stepCost;
      if (tentative < (gScore.get(to) ?? Infinity)) {
        gScore.set(to, tentative);
        prev.set(to, { node: cur.node, edge: edge.slug });
        heap.push({ f: tentative + heuristic(to), cost: tentative, node: to });
      }
    }
  }

  const finalCost = gScore.get(goal);
  if (finalCost === undefined) return null;

  const path: string[] = [goal];
  const edges: string[] = [];
  let curNode = goal;
  while (curNode !== start) {
    const p = prev.get(curNode);
    if (!p) return null;
    path.unshift(p.node);
    edges.unshift(p.edge);
    curNode = p.node;
  }
  return { cost: finalCost, path, edges };
}
