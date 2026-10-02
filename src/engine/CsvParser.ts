import Papa from 'papaparse';

export interface GraphNode {
  id: string;
  label: string;
  title?: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  cost: number;
}

export interface ParsedGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ColumnMapping {
  sourceCol: number;
  destCol: number;
  costCol: number;
}

/**
 * Parses a CSV file and extracts nodes and edges based on the provided column mapping.
 * Default mapping: Source=0, Dest=1, Cost=4 (0-indexed for columns 1, 2, and 5)
 */
export const parseCsvToGraph = (
  file: File,
  mapping: ColumnMapping = { sourceCol: 0, destCol: 1, costCol: 4 },
  onComplete: (data: ParsedGraphData) => void,
  onError: (error: Error) => void
) => {
  Papa.parse(file, {
    skipEmptyLines: true,
    complete: (results) => {
      const { data } = results;
      
      const nodesMap = new Map<string, GraphNode>();
      const edges: GraphEdge[] = [];

      // Assume first row is header if it doesn't parse as expected, but let's just parse all rows
      // We will skip rows that don't have enough columns or where cost is not a number
      let isFirstRow = true;

      data.forEach((row: any, index) => {
        if (!Array.isArray(row)) return;

        // Optionally skip header row if detected, here we just do a simple check
        if (isFirstRow && isNaN(Number(row[mapping.costCol]))) {
          isFirstRow = false;
          return;
        }
        isFirstRow = false;

        const sourceStr = row[mapping.sourceCol]?.toString().trim();
        const destStr = row[mapping.destCol]?.toString().trim();
        const costStr = row[mapping.costCol]?.toString().trim();

        if (!sourceStr || !destStr || !costStr) return;

        const cost = parseFloat(costStr);
        if (isNaN(cost)) return;

        const parseNodeString = (rawStr: string) => {
          const ipRegex = /(?:[0-9]{1,3}\.){3}[0-9]{1,3}/;
          const ipMatch = rawStr.match(ipRegex);
          let label = rawStr;
          
          if (ipMatch) {
            const ip = ipMatch[0];
            let nameWithoutIp = rawStr.replace(ip, '');
            // Strip surrounding punctuation (brackets, parentheses, dashes, underscores, whitespace)
            nameWithoutIp = nameWithoutIp.replace(/^[\s\-_()[\]{}]+|[\s\-_()[\]{}]+$/g, '');
            
            if (nameWithoutIp.length > 0) {
              label = nameWithoutIp;
            } else {
              label = ip;
            }
          }
          
          if (label.length > 12) {
            label = label.substring(0, 12) + '...';
          }

          return { id: rawStr, label, title: rawStr };
        };

        // Add nodes
        if (!nodesMap.has(sourceStr)) {
          nodesMap.set(sourceStr, parseNodeString(sourceStr));
        }
        if (!nodesMap.has(destStr)) {
          nodesMap.set(destStr, parseNodeString(destStr));
        }

        // Add edge
        edges.push({
          id: `e_${index}`, // Simple unique ID
          from: sourceStr,
          to: destStr,
          cost: cost,
        });
      });

      const parsedNodes = Array.from(nodesMap.values());
      if (parsedNodes.length === 0) {
        onError(new Error("No valid nodes found in CSV. Please verify that your column mapping numbers (e.g. Column 1, 2, 5) match your CSV file structure."));
        return;
      }

      onComplete({
        nodes: parsedNodes,
        edges: edges,
      });
    },
    error: (error: Error) => {
      onError(error);
    }
  });
};
