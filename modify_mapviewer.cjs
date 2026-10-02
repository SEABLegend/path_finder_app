const fs = require('fs');

const code = `    // Convert our internal data structure to vis-network DataSets
    const allNodes = new Map();
    const mergedEdges = new Map();

    const addNode = (node, sourceMap) => {
      if (allNodes.has(node.id)) {
        allNodes.get(node.id).sources.push(sourceMap);
      } else {
        allNodes.set(node.id, { ...node, sources: [sourceMap] });
      }
    };

    data.nodes.forEach(n => addNode(n, 'A'));
    if (showComparedMap && dataB) {
      dataB.nodes.forEach(n => addNode(n, 'B'));
    }

    const visNodes = new DataSet(
      Array.from(allNodes.values()).map(node => {
        let borderColor = '#4f46e5';
        let bgColor = '#18181b';
        if (showComparedMap) {
          if (node.sources.includes('A') && !node.sources.includes('B')) {
            borderColor = '#fb923c'; // Orange (only in A)
          } else if (!node.sources.includes('A') && node.sources.includes('B')) {
            borderColor = '#10b981'; // Green (only in B)
          }
        }

        return {
          id: node.id,
          label: node.label.replace(' (', '\\n('),
          originalLabel: node.label.replace(' (', '\\n('),
          title: node.title,
          shape: 'box',
          margin: { top: 8, bottom: 8, left: 12, right: 12 },
          shapeProperties: {
            borderRadius: 6
          },
          borderWidth: 2,
          color: {
            background: bgColor,
            border: borderColor,
            highlight: {
              background: '#312e81',
              border: borderColor
            }
          },
          font: {
            color: '#e4e4e7',
            size: 13,
            face: 'Outfit',
            align: 'center'
          }
        };
      })
    );

    const addEdge = (edge, sourceMap) => {
      const isHighCost = edge.cost > 100;
      const edgeKey1 = \`\${edge.from}-\${edge.to}\`;
      const edgeKey2 = \`\${edge.to}-\${edge.from}\`;
      
      let targetKey = edgeKey1;
      let existing = mergedEdges.get(edgeKey1);
      if (!existing && mergedEdges.has(edgeKey2)) {
        targetKey = edgeKey2;
        existing = mergedEdges.get(edgeKey2);
      }

      if (existing) {
        if (!existing.actualIds.includes(edge.id)) {
           existing.actualIds.push(edge.id);
        }
        if (targetKey === edgeKey2) {
          existing.arrows.from = { enabled: true, scaleFactor: 0.5 };
        }
        if (existing.originalCost !== edge.cost) {
          existing.label = \`\${existing.originalCost} / \${edge.cost}\`;
        }
        if (!existing.sources.includes(sourceMap)) {
           existing.sources.push(sourceMap);
        }
      } else {
        mergedEdges.set(edgeKey1, {
          id: edgeKey1,
          actualIds: [edge.id],
          sources: [sourceMap],
          from: edge.from,
          to: edge.to,
          label: edge.cost.toString(),
          originalCost: edge.cost,
          isHighCost: isHighCost,
          width: 1.5,
          dashes: isHighCost,
          shadow: { enabled: false },
          smooth: false,
          arrows: {
            to: {
              enabled: true,
              scaleFactor: 0.5
            }
          },
          length: edge.cost <= 5 ? 90 : edge.cost <= 40 ? 200 : 400
        });
      }
    };

    data.edges.forEach(e => addEdge(e, 'A'));
    if (showComparedMap && dataB) {
      dataB.edges.forEach(e => addEdge(e, 'B'));
    }

    const finalEdges = Array.from(mergedEdges.values()).map(edge => {
      let color = edge.isHighCost ? '#ef4444' : '#6366f1';
      if (showComparedMap) {
        if (edge.sources.includes('A') && !edge.sources.includes('B')) {
          color = '#fb923c';
        } else if (!edge.sources.includes('A') && edge.sources.includes('B')) {
          color = '#10b981';
        }
      }
      return {
        ...edge,
        font: {
          color: '#ffffff',
          size: 10,
          strokeWidth: 0,
          strokeColor: 'transparent',
          face: 'Outfit',
          align: 'horizontal'
        },
        color: {
          color: color,
          highlight: '#06b6d4',
          hover: '#fbbf24'
        }
      };
    });

    const visEdges = new DataSet(finalEdges);`;

let content = fs.readFileSync('src/components/MapViewer.tsx', 'utf8');
const lines = content.split('\n');
// We need to replace lines 68 to 161 (0-indexed lines 68-161, which is 69 to 162 in 1-indexed)
// wait, line 69 was "// Convert our internal data structure to vis-network DataSets"
// line 161 was "const visEdges = new DataSet(Array.from(mergedEdges.values()));"

// Let's dynamically find it instead of using hardcoded index!
const startIdx = lines.findIndex(l => l.includes('// Convert our internal data structure to vis-network DataSets'));
const endIdx = lines.findIndex(l => l.includes('const visEdges = new DataSet(Array.from(mergedEdges.values()));'));

if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx + 1, code);
  fs.writeFileSync('src/components/MapViewer.tsx', lines.join('\n'), 'utf8');
  console.log('Done modifying MapViewer.tsx');
} else {
  console.log('Could not find start or end index', startIdx, endIdx);
}
