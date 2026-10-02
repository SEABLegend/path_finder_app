import type { GraphNode, GraphEdge } from './CsvParser';

export interface RouteResult {
  pathNodes: string[]; // Ordered list of node IDs
  pathEdges: string[]; // Ordered list of edge IDs
  totalCost: number;
}

export const calculateShortestPath = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  sourceId: string,
  destId: string,
  cancelledEdges: Set<string> = new Set()
): RouteResult | null => {
  // Build adjacency list
  // Graph is directed based on edges (from -> to)
  const adjList = new Map<string, { to: string; cost: number; edgeId: string }[]>();
  
  nodes.forEach(n => adjList.set(n.id, []));
  
  edges.forEach(e => {
    if (cancelledEdges.has(e.id)) return;
    
    // Add forward edge (from -> to)
    if (adjList.has(e.from)) {
      adjList.get(e.from)!.push({ to: e.to, cost: e.cost, edgeId: e.id });
    }
  });

  const distances = new Map<string, number>();
  const previous = new Map<string, { nodeId: string; edgeId: string } | null>();
  const unvisited = new Set<string>();

  nodes.forEach(n => {
    distances.set(n.id, Infinity);
    previous.set(n.id, null);
    unvisited.add(n.id);
  });

  distances.set(sourceId, 0);

  while (unvisited.size > 0) {
    // Find node with minimum distance
    let current: string | null = null;
    let minDistance = Infinity;
    
    for (const nodeId of unvisited) {
      const dist = distances.get(nodeId)!;
      if (dist < minDistance) {
        minDistance = dist;
        current = nodeId;
      }
    }

    if (current === null || current === destId) {
      break; // Reached destination or remaining nodes are inaccessible
    }

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

  // Backtrack to find path
  if (distances.get(destId) === Infinity) {
    return null; // No path found
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

  return {
    pathNodes,
    pathEdges,
    totalCost: distances.get(destId)!
  };
};
