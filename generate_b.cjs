const fs = require('fs');
const lines = fs.readFileSync('sample_network.csv', 'utf8').split('\n').map(l => l.trim()).filter(l => l !== '');
const header = lines[0];
let data = lines.slice(1);

// Remove some edges (simulate link down)
// "NYC-HQ-GW1 (10.1.1.1)","LON-TH-Core1 (10.3.1.1)",Fiber,Inter-Region,42
data = data.filter(l => !l.includes('NYC-HQ-GW1 (10.1.1.1)","LON-TH-Core1 (10.3.1.1)'));
data = data.filter(l => !l.includes('LON-TH-Core1 (10.3.1.1)","NYC-HQ-GW1 (10.1.1.1)'));

// Modify some edge costs (simulate congestion)
data = data.map(line => {
  if (line.includes('IAD-Ashburn (10.1.1.2)","PAR-Equinix1 (10.3.1.2)')) {
    return line.replace(',44', ',99');
  }
  if (line.includes('PAR-Equinix1 (10.3.1.2)","IAD-Ashburn (10.1.1.2)')) {
    return line.replace(',44', ',99');
  }
  return line;
});

// Add new edges (simulate new capacity)
data.push('"BOS-Metro-R1 (10.1.2.3)","LON-TH-Core1 (10.3.1.1)",Fiber,Inter-Region,39');
data.push('"LON-TH-Core1 (10.3.1.1)","BOS-Metro-R1 (10.1.2.3)",Fiber,Inter-Region,39');

const finalCsv = [header, ...data].join('\r\n');
fs.writeFileSync('sample_network_b.csv', finalCsv, 'utf8');
console.log('Created sample_network_b.csv');
