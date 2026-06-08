const testLine = "20mm        MS500F               25s Finale Box: Hammer Barrage (Simul)                           2          $0.00    $0.00   0        0";

const size = "20mm";
let afterSize = testLine.substring(testLine.indexOf(size) + size.length).trim();
console.log("After size:", afterSize);

const partNumberMatch = afterSize.match(/^([A-Z0-9][-A-Z0-9_]+)/i);
const partNumber = partNumberMatch[1];
console.log("Part number:", partNumber);

let afterPartNum = afterSize.substring(afterSize.indexOf(partNumber) + partNumber.length);
console.log("After part num:", afterPartNum);

const parts = afterPartNum.split(/\s{2,}/);
console.log("Parts:", parts);
console.log("Description (parts[0]):", parts[0]);
