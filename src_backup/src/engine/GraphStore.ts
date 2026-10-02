import type { GraphNode, GraphEdge, ParsedGraphData } from './CsvParser';

export interface AppState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cancelledEdges: Set<string>;
  manualEdges: GraphEdge[];
  history: any[]; // To store past 10 states
  
  // Actions
  setGraphData: (data: ParsedGraphData) => void;
  cancelEdge: (edgeId: string) => void;
  uncancelEdge: (edgeId: string) => void;
  addManualEdge: (edge: GraphEdge) => void;
  undo: () => void;
}

