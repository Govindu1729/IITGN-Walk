// Dijkstra shortest-path on the IITGN walking graph with a pluggable cost fn.
// Min-heap via binary array. O((V+E) log V).

import type { Graph } from "./types";
import type { CostFn } from "./cost";
import type { WalkingMode } from "./types";

interface HeapItem {
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
      if (this.h[parent].cost <= item.cost) break;
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
      if (l < n && this.h[l].cost < this.h[smallest].cost) smallest = l;
      if (r < n && this.h[r].cost < this.h[smallest].cost) smallest = r;
      if (smallest === i) break;
      this.h[i] = this.h[smallest];
      i = smallest;
    }
    this.h[i] = item;
  }
}

export interface DijkstraResult {
  cost: number;
  path: string[]; // node slugs
  edges: string[]; // edge slugs traversed
}

/** Dijkstra from `start` to `goal`. Returns null if no path. */
export function dijkstra(
  graph: Graph,
  start: string,
  goal: string,
  costFn: CostFn,
  mode: WalkingMode,
  speed: number,
): DijkstraResult | null {
  if (!graph.nodes.has(start) || !graph.nodes.has(goal)) return null;
  if (start === goal) return { cost: 0, path: [start], edges: [] };

  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; edge: string }>();
  const visited = new Set<string>();
  const heap = new MinHeap();

  dist.set(start, 0);
  heap.push({ cost: 0, node: start });

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
      const alt = cur.cost + stepCost;
      if (alt < (dist.get(to) ?? Infinity)) {
        dist.set(to, alt);
        prev.set(to, { node: cur.node, edge: edge.slug });
        heap.push({ cost: alt, node: to });
      }
    }
  }

  if (!dist.has(goal)) return null;

  // reconstruct
  const path: string[] = [goal];
  const edges: string[] = [];
  let curNode: string = goal;
  while (curNode !== start) {
    const p = prev.get(curNode);
    if (!p) return null;
    path.unshift(p.node);
    edges.unshift(p.edge);
    curNode = p.node;
  }
  return { cost: dist.get(goal)!, path, edges };
}
