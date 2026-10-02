import type { GraphNode, GraphEdge } from './CsvParser';

export interface RouteResult {
  pathNodes: string[]; // Ordered list of node IDs
  pathEdges: string[]; // Ordered list of edge IDs
  totalCost: number;
}

const dijkstra = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  sourceId: string,
  destId: string,
  cancelledEdges: Set<string>,
  removedEdges: Set<string>,
  removedNodes: Set<string>
): RouteResult | null => {
  const adjList = new Map<string, { to: string; cost: number; edgeId: string }[]>();
  nodes.forEach(n => adjList.set(n.id, []));
  
  edges.forEach(e => {
    if (cancelledEdges.has(e.id) || removedEdges.has(e.id)) return;
    if (removedNodes.has(e.from) || removedNodes.has(e.to)) return;
    
    if (adjList.has(e.from)) {
      adjList.get(e.from)!.push({ to: e.to, cost: e.cost, edgeId: e.id });
    }
  });

  const distances = new Map<string, number>();
  const previous = new Map<string, { nodeId: string; edgeId: string } | null>();
  const unvisited = new Set<string>();

  nodes.forEach(n => {
    if (!removedNodes.has(n.id)) {
      distances.set(n.id, Infinity);
      previous.set(n.id, null);
      unvisited.add(n.id);
    }
  });

  distances.set(sourceId, 0);

  while (unvisited.size > 0) {
    let current: string | null = null;
    let minDistance = Infinity;
    
    for (const nodeId of unvisited) {
      const dist = distances.get(nodeId)!;
      if (dist < minDistance) {
        minDistance = dist;
        current = nodeId;
      }
    }

    if (current === null || current === destId) break;
    unvisited.delete(current);

    const neighbors = adjList.get(current) || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.to)) continue;

      const altDistance = distances.get(current)! + neighbor.cost;
      if (altDistance < distances.get(neighbor.to)!) {
        distances.set(neighbor.to, altDistance);
        previous.set(neighbor.to, { nodeId: current, edgeId: neighbor.edgeId });
      }
    }
  }

  if (distances.get(destId) === Infinity || distances.get(destId) === undefined) {
    return null;
  }

  const pathNodes: string[] = [];
  const pathEdges: string[] = [];
  let currNode = destId;

  while (currNode) {
    pathNodes.unshift(currNode);
    const prev = previous.get(currNode);
    if (prev) {
      pathEdges.unshift(prev.edgeId);
      currNode = prev.nodeId;
    } else {
      break;
    }
  }

  return { pathNodes, pathEdges, totalCost: distances.get(destId)! };
};

export const calculateShortestPaths = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  sourceId: string,
  destId: string,
  cancelledEdges: Set<string> = new Set(),
  maxPaths: number = 10
): RouteResult[] => {
  const A: RouteResult[] = [];
  const B = new Map<string, RouteResult>();

  const firstPath = dijkstra(nodes, edges, sourceId, destId, cancelledEdges, new Set(), new Set());
  if (!firstPath) return [];
  A.push(firstPath);

  for (let k = 1; k < maxPaths; k++) {
    const prevPath = A[k - 1];
    
    for (let i = 0; i < prevPath.pathNodes.length - 1; i++) {
      const spurNode = prevPath.pathNodes[i];
      const rootPathNodes = prevPath.pathNodes.slice(0, i + 1);
      const rootPathEdges = prevPath.pathEdges.slice(0, i);
      
      const removedEdges = new Set<string>();
      for (const p of A) {
        if (p.pathNodes.slice(0, i + 1).join(',') === rootPathNodes.join(',')) {
          removedEdges.add(p.pathEdges[i]);
        }
      }
      
      const removedNodes = new Set<string>();
      for (const n of rootPathNodes) {
        if (n !== spurNode) removedNodes.add(n);
      }

      const spurPath = dijkstra(nodes, edges, spurNode, destId, cancelledEdges, removedEdges, removedNodes);
      
      if (spurPath) {
        const totalPathNodes = [...rootPathNodes.slice(0, -1), ...spurPath.pathNodes];
        const totalPathEdges = [...rootPathEdges, ...spurPath.pathEdges];
        
        let totalCost = 0;
        totalPathEdges.forEach(eId => {
          const edge = edges.find(e => e.id === eId);
          if (edge) totalCost += edge.cost;
        });

        const pathKey = totalPathEdges.join(',');
        if (!B.has(pathKey)) {
          B.set(pathKey, { pathNodes: totalPathNodes, pathEdges: totalPathEdges, totalCost });
        }
      }
    }
    
    if (B.size === 0) break;

    const sortedB = Array.from(B.values()).sort((a, b) => a.totalCost - b.totalCost);
    const nextPath = sortedB[0];
    
    // Strict requirement: stop searching if cost is not EXACTLY the minimum cost
    if (Math.abs(nextPath.totalCost - A[0].totalCost) > 1e-9) {
      break;
    }

    A.push(nextPath);
    B.delete(nextPath.pathEdges.join(','));
  }

  return A;
};
