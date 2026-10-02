const fs = require('fs');
const path = require('path');

// 5 Geographic regions with real-world infrastructure sites
// 16 nodes each = 80 nodes total
// Most have meaningful site names with IP, 3 per region are purely an IP address
const regionsData = [
  {
    region: 'US-East',
    prefix: 'USE',
    nodes: [
      { name: 'NYC-HQ-GW1', ip: '10.1.1.1', role: 'Core' },
      { name: 'IAD-Ashburn', ip: '10.1.1.2', role: 'Core' },
      { name: 'JFK-PoP-01', ip: '10.1.2.1', role: 'Edge' },
      { name: 'EWR-DC-01', ip: '10.1.2.2', role: 'Edge' },
      { name: 'BOS-Metro-R1', ip: '10.1.2.3', role: 'Edge' },
      { name: 'PHL-Hub-01', ip: '10.1.2.4', role: 'Edge' },
      { name: 'MAN-Tower-RF', ip: '10.1.3.1', role: 'Dist' },
      { name: 'BKN-Dist-01', ip: '10.1.3.2', role: 'Dist' },
      { name: 'QNS-Switch-1', ip: '10.1.3.3', role: 'Dist' },
      { name: 'RIC-Relay-01', ip: '10.1.3.4', role: 'Dist' },
      { name: 'DCA-PoP-02', ip: '10.1.4.1', role: 'Node' },
      { name: 'BLT-Node-01', ip: '10.1.4.2', role: 'Node' },
      { name: 'PIT-Node-01', ip: '10.1.4.3', role: 'Node' },
      // Pure IP nodes
      { name: '', ip: '10.1.90.14', role: 'Node' },
      { name: '', ip: '10.1.90.15', role: 'Node' },
      { name: '', ip: '10.1.90.16', role: 'Node' }
    ]
  },
  {
    region: 'US-West',
    prefix: 'USW',
    nodes: [
      { name: 'SFO-Equinix1', ip: '10.2.1.1', role: 'Core' },
      { name: 'SEA-WestCore', ip: '10.2.1.2', role: 'Core' },
      { name: 'SJC-CiscoPoP', ip: '10.2.2.1', role: 'Edge' },
      { name: 'OAK-Tower-RF', ip: '10.2.2.2', role: 'Edge' },
      { name: 'LAX-PoP-01', ip: '10.2.2.3', role: 'Edge' },
      { name: 'PDX-Metro-R1', ip: '10.2.2.4', role: 'Edge' },
      { name: 'PAO-Campus-1', ip: '10.2.3.1', role: 'Dist' },
      { name: 'MTV-Cloud-GW', ip: '10.2.3.2', role: 'Dist' },
      { name: 'SMO-Dist-01', ip: '10.2.3.3', role: 'Dist' },
      { name: 'BERK-Node-01', ip: '10.2.3.4', role: 'Dist' },
      { name: 'SCZ-Subsea-1', ip: '10.2.4.1', role: 'Node' },
      { name: 'TAC-Node-01', ip: '10.2.4.2', role: 'Node' },
      { name: 'RNO-Relay-01', ip: '10.2.4.3', role: 'Node' },
      // Pure IP nodes
      { name: '', ip: '10.2.90.14', role: 'Node' },
      { name: '', ip: '10.2.90.15', role: 'Node' },
      { name: '', ip: '10.2.90.16', role: 'Node' }
    ]
  },
  {
    region: 'EU-West',
    prefix: 'EUW',
    nodes: [
      { name: 'LON-TH-Core1', ip: '10.3.1.1', role: 'Core' },
      { name: 'PAR-Equinix1', ip: '10.3.1.2', role: 'Core' },
      { name: 'LHR-Edge-GW1', ip: '10.3.2.1', role: 'Edge' },
      { name: 'DOCK-PoP-01', ip: '10.3.2.2', role: 'Edge' },
      { name: 'DUB-Subsea-1', ip: '10.3.2.3', role: 'Edge' },
      { name: 'CDG-PoP-01', ip: '10.3.2.4', role: 'Edge' },
      { name: 'SLG-DC-01', ip: '10.3.3.1', role: 'Dist' },
      { name: 'OXF-Tower-RF', ip: '10.3.3.2', role: 'Dist' },
      { name: 'CAM-Research', ip: '10.3.3.3', role: 'Dist' },
      { name: 'MAN-Dist-01', ip: '10.3.3.4', role: 'Dist' },
      { name: 'IDF-Metro-01', ip: '10.3.4.1', role: 'Node' },
      { name: 'BEL-PoP-01', ip: '10.3.4.2', role: 'Node' },
      { name: 'LYN-Node-01', ip: '10.3.4.3', role: 'Node' },
      // Pure IP nodes
      { name: '', ip: '10.3.90.14', role: 'Node' },
      { name: '', ip: '10.3.90.15', role: 'Node' },
      { name: '', ip: '10.3.90.16', role: 'Node' }
    ]
  },
  {
    region: 'EU-Central',
    prefix: 'EUC',
    nodes: [
      { name: 'FRA-CIX-Core', ip: '10.4.1.1', role: 'Core' },
      { name: 'AMS-Nikhef-1', ip: '10.4.1.2', role: 'Core' },
      { name: 'FRA-Equinix2', ip: '10.4.2.1', role: 'Edge' },
      { name: 'AMS-Equinix2', ip: '10.4.2.2', role: 'Edge' },
      { name: 'BER-Core-GW1', ip: '10.4.2.3', role: 'Edge' },
      { name: 'ZUR-Interx-1', ip: '10.4.2.4', role: 'Edge' },
      { name: 'MUC-Tower-RF', ip: '10.4.3.1', role: 'Dist' },
      { name: 'ROT-Port-GW1', ip: '10.4.3.2', role: 'Dist' },
      { name: 'VIE-VIX-PoP', ip: '10.4.3.3', role: 'Dist' },
      { name: 'GVA-CERN-01', ip: '10.4.3.4', role: 'Dist' },
      { name: 'PRG-Node-01', ip: '10.4.4.1', role: 'Node' },
      { name: 'WAW-Node-01', ip: '10.4.4.2', role: 'Node' },
      { name: 'CPH-Subsea-1', ip: '10.4.4.3', role: 'Node' },
      // Pure IP nodes
      { name: '', ip: '10.4.90.14', role: 'Node' },
      { name: '', ip: '10.4.90.15', role: 'Node' },
      { name: '', ip: '10.4.90.16', role: 'Node' }
    ]
  },
  {
    region: 'APAC',
    prefix: 'APC',
    nodes: [
      { name: 'TYO-Otemachi', ip: '10.5.1.1', role: 'Core' },
      { name: 'SIN-Equinix1', ip: '10.5.1.2', role: 'Core' },
      { name: 'HKG-MegaiAdv', ip: '10.5.2.1', role: 'Edge' },
      { name: 'SYD-Equinix1', ip: '10.5.2.2', role: 'Edge' },
      { name: 'NRT-PoP-01', ip: '10.5.2.3', role: 'Edge' },
      { name: 'SIN-Singtel1', ip: '10.5.2.4', role: 'Edge' },
      { name: 'OSA-Dist-01', ip: '10.5.3.1', role: 'Dist' },
      { name: 'HKG-Subsea-1', ip: '10.5.3.2', role: 'Dist' },
      { name: 'MEL-Metro-01', ip: '10.5.3.3', role: 'Dist' },
      { name: 'TPE-TaipeiIX', ip: '10.5.3.4', role: 'Dist' },
      { name: 'ICN-Core-GW1', ip: '10.5.4.1', role: 'Node' },
      { name: 'BKK-Node-01', ip: '10.5.4.2', role: 'Node' },
      { name: 'KUL-Node-01', ip: '10.5.4.3', role: 'Node' },
      // Pure IP nodes
      { name: '', ip: '10.5.90.14', role: 'Node' },
      { name: '', ip: '10.5.90.15', role: 'Node' },
      { name: '', ip: '10.5.90.16', role: 'Node' }
    ]
  }
];

const nodesByRegion = {};
const allNodes = [];

regionsData.forEach(reg => {
  nodesByRegion[reg.prefix] = [];
  reg.nodes.forEach(n => {
    const id = n.name ? `${n.name} (${n.ip})` : n.ip;
    const nodeObj = { id, name: n.name, ip: n.ip, region: reg.region, prefix: reg.prefix, role: n.role };
    nodesByRegion[reg.prefix].push(nodeObj);
    allNodes.push(nodeObj);
  });
});

console.log('Total nodes:', allNodes.length);

const edges = [];
const edgeSet = new Set();

function addEdge(from, to, type, region, cost) {
  const key = `${from.id}->${to.id}`;
  if (edgeSet.has(key)) return;
  edgeSet.add(key);
  edges.push({
    source: from.id,
    dest: to.id,
    type,
    region,
    cost
  });
}

// 1. Intra-region links (cost 1 or 2, mostly bidirectional)
// Dense local network inside each region (~71-72 directed rows per region = ~355 total)
regionsData.forEach(reg => {
  const rNodes = nodesByRegion[reg.prefix];
  const n = rNodes.length; // 16

  // Ring topology guaranteeing complete local connectivity (16 links = 32 directed edges)
  for (let i = 0; i < n; i++) {
    const u = rNodes[i];
    const v = rNodes[(i + 1) % n];
    const cost = (i % 3 === 0) ? 2 : 1;
    addEdge(u, v, 'Local', reg.region, cost);
    addEdge(v, u, 'Local', reg.region, cost);
  }

  // Dual-core star hub (14 links = 28 directed edges)
  const core1 = rNodes[0];
  const core2 = rNodes[1];
  for (let i = 2; i < n; i++) {
    const target = rNodes[i];
    if (i % 2 === 0) {
      addEdge(core1, target, 'Local', reg.region, 1);
      addEdge(target, core1, 'Local', reg.region, 1);
    } else {
      addEdge(core2, target, 'Local', reg.region, 2);
      addEdge(target, core2, 'Local', reg.region, 2);
    }
  }

  // Local chords inside region (6 links = ~11 directed edges)
  const chords = [
    [2, 5], [3, 7], [4, 9], [6, 11], [8, 13], [10, 14]
  ];
  chords.forEach(([i, j], idx) => {
    const u = rNodes[i];
    const v = rNodes[j];
    const cost = (idx % 2 === 0) ? 1 : 2;
    if (idx === 5) {
      // One simplex link to test directed pathfinding
      addEdge(u, v, 'Local', reg.region, cost);
    } else {
      addEdge(u, v, 'Local', reg.region, cost);
      addEdge(v, u, 'Local', reg.region, cost);
    }
  });
});

console.log('Intra-region directed edges:', edges.length);

// 2. Inter-region Transit Architecture:
// Strict geographic chain:
// [US-West] <=====> [US-East] <=====> [EU-West] <=====> [EU-Central] <=====> [APAC]
//
// Consequence:
// - US-West connects ONLY to US-East (to reach Europe or APAC, you MUST traverse US-East)
// - US-East connects to US-West and EU-West (to reach EU-Central or APAC, you MUST traverse EU-West)
// - EU-West connects to US-East and EU-Central (to reach APAC, you MUST traverse EU-Central)
// - EU-Central connects to EU-West and APAC (transit hub for Eurasia)
// - APAC connects ONLY to EU-Central
//
// Multiple rich interconnecting routes per adjacent pair (Fiber ~35-50, RF ~280-320):

const interLinks = [
  // --- Corridor 1: US-West <===> US-East (Transcontinental) ---
  // Primary Northern Fiber Trunk
  { from: nodesByRegion['USW'][1], to: nodesByRegion['USE'][0], type: 'Fiber', cost: 38, bi: true }, // SEA-WestCore <-> NYC-HQ-GW1
  // Secondary Southern Fiber Trunk
  { from: nodesByRegion['USW'][0], to: nodesByRegion['USE'][1], type: 'Fiber', cost: 40, bi: true }, // SFO-Equinix1 <-> IAD-Ashburn
  // Express Enterprise Fiber
  { from: nodesByRegion['USW'][4], to: nodesByRegion['USE'][5], type: 'Fiber', cost: 45, bi: true }, // LAX-PoP-01 <-> PHL-Hub-01
  // High-Altitude RF Microwave Backbone
  { from: nodesByRegion['USW'][3], to: nodesByRegion['USE'][6], type: 'RF', cost: 295, bi: true }, // OAK-Tower-RF <-> MAN-Tower-RF
  // Terrestrial RF Relay
  { from: nodesByRegion['USW'][12], to: nodesByRegion['USE'][9], type: 'RF', cost: 310, bi: true }, // RNO-Relay-01 <-> RIC-Relay-01

  // --- Corridor 2: US-East <===> EU-West (Transatlantic) ---
  // TAT-14 Subsea Fiber
  { from: nodesByRegion['USE'][0], to: nodesByRegion['EUW'][0], type: 'Fiber', cost: 42, bi: true }, // NYC-HQ-GW1 <-> LON-TH-Core1
  // Dunant Undersea Fiber
  { from: nodesByRegion['USE'][1], to: nodesByRegion['EUW'][1], type: 'Fiber', cost: 44, bi: true }, // IAD-Ashburn <-> PAR-Equinix1
  // Apollo North Express Fiber
  { from: nodesByRegion['USE'][2], to: nodesByRegion['EUW'][3], type: 'Fiber', cost: 46, bi: true }, // JFK-PoP-01 <-> DOCK-PoP-01
  // Celtic Subsea Cable
  { from: nodesByRegion['USE'][4], to: nodesByRegion['EUW'][4], type: 'Fiber', cost: 48, bi: true }, // BOS-Metro-R1 <-> DUB-Subsea-1
  // Transatlantic LEO Satellite RF Link
  { from: nodesByRegion['USE'][6], to: nodesByRegion['EUW'][7], type: 'RF', cost: 315, bi: true }, // MAN-Tower-RF <-> OXF-Tower-RF

  // --- Corridor 3: EU-West <===> EU-Central (Cross-Channel / Western-Central Europe) ---
  // Channel Tunnel Direct Fiber
  { from: nodesByRegion['EUW'][0], to: nodesByRegion['EUC'][1], type: 'Fiber', cost: 35, bi: true }, // LON-TH-Core1 <-> AMS-Nikhef-1
  // Rhine Express Fiber
  { from: nodesByRegion['EUW'][1], to: nodesByRegion['EUC'][0], type: 'Fiber', cost: 36, bi: true }, // PAR-Equinix1 <-> FRA-CIX-Core
  // Cross-Border Core Interconnect
  { from: nodesByRegion['EUW'][2], to: nodesByRegion['EUC'][2], type: 'Fiber', cost: 38, bi: true }, // LHR-Edge-GW1 <-> FRA-Equinix2
  // North Sea Ring Fiber
  { from: nodesByRegion['EUW'][3], to: nodesByRegion['EUC'][3], type: 'Fiber', cost: 39, bi: true }, // DOCK-PoP-01 <-> AMS-Equinix2
  // Alpine Microwave Line-of-Sight RF
  { from: nodesByRegion['EUW'][7], to: nodesByRegion['EUC'][6], type: 'RF', cost: 285, bi: true }, // OXF-Tower-RF <-> MUC-Tower-RF
  // Western Germany RF Relay
  { from: nodesByRegion['EUW'][6], to: nodesByRegion['EUC'][7], type: 'RF', cost: 298, bi: true }, // SLG-DC-01 <-> ROT-Port-GW1

  // --- Corridor 4: EU-Central <===> APAC (Eurasia Transit Corridor) ---
  // Eurasia Terrestrial Express Fiber
  { from: nodesByRegion['EUC'][0], to: nodesByRegion['APC'][0], type: 'Fiber', cost: 45, bi: true }, // FRA-CIX-Core <-> TYO-Otemachi
  // Sea-Me-We Indian Ocean Subsea Fiber
  { from: nodesByRegion['EUC'][1], to: nodesByRegion['APC'][1], type: 'Fiber', cost: 47, bi: true }, // AMS-Nikhef-1 <-> SIN-Equinix1
  // Silk Road Optical Link
  { from: nodesByRegion['EUC'][4], to: nodesByRegion['APC'][2], type: 'Fiber', cost: 49, bi: true }, // BER-Core-GW1 <-> HKG-MegaiAdv
  // Central Europe to Sydney Southern Fiber
  { from: nodesByRegion['EUC'][5], to: nodesByRegion['APC'][3], type: 'Fiber', cost: 54, bi: true }, // ZUR-Interx-1 <-> SYD-Equinix1
  // Geostationary Satellite Microwave RF Link
  { from: nodesByRegion['EUC'][6], to: nodesByRegion['APC'][6], type: 'RF', cost: 320, bi: true }, // MUC-Tower-RF <-> OSA-Dist-01
  // Alpine-Taipei High-Orbit RF Relay
  { from: nodesByRegion['EUC'][9], to: nodesByRegion['APC'][9], type: 'RF', cost: 315, bi: true }  // GVA-CERN-01 <-> TPE-TaipeiIX
];

interLinks.forEach(link => {
  addEdge(link.from, link.to, link.type, 'Inter-Region', link.cost);
  if (link.bi) {
    addEdge(link.to, link.from, link.type, 'Inter-Region', link.cost);
  }
});

console.log('Total directed edges (rows):', edges.length);

// Generate CSV
const header = 'Source,Destination,Medium,Region,Cost\r\n';
const rows = edges.map(e => `"${e.source}","${e.dest}",${e.type},${e.region},${e.cost}`).join('\r\n');
const csvContent = header + rows;

const targetFile = path.resolve('sample_network.csv');
fs.writeFileSync(targetFile, csvContent, 'utf-8');
console.log('Written to:', targetFile);

if (fs.existsSync('public')) {
  fs.writeFileSync(path.resolve('public', 'sample_network.csv'), csvContent, 'utf-8');
  console.log('Copied to public/sample_network.csv');
}
