import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface EstimateItem {
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
}

interface ParsedEstimate {
  summary: string;
  location: string;
  items: EstimateItem[];
  netTotal: string;
  grossTotal: string;
}

function strip(s: string): string {
  return s
    .replace(/\*\*/g, "")
    .replace(/\[/g, "")
    .replace(/\]/g, "")
    .replace(/^\*\s?/, "")
    .replace(/\*$/, "")
    .trim();
}

function parseEstimateData(raw: string): ParsedEstimate {
  const lines = raw.split("\n").map(strip).filter(Boolean);

  let summary = "";
  let location = "";
  const items: EstimateItem[] = [];
  let netTotal = "";
  let grossTotal = "";

  for (const line of lines) {
    if (line.startsWith("Projekt összefoglaló:")) {
      summary = line.replace("Projekt összefoglaló:", "").trim();
    } else if (line.startsWith("Helyszín:")) {
      location = line.replace("Helyszín:", "").trim();
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      const itemText = line.replace(/^[-•]\s*/, "");
      const match = itemText.match(/^(.+?):\s*(.+?)\s*[×x]\s*(.+?)\s*=\s*(.+)$/i);
      if (match) {
        items.push({
          description: match[1].trim(),
          quantity: match[2].trim(),
          unitPrice: match[3].trim(),
          total: match[4].trim(),
        });
      } else {
        items.push({ description: itemText, quantity: "-", unitPrice: "-", total: "-" });
      }
    } else if (/nettó összeg/i.test(line)) {
      netTotal = line.replace(/.*nettó összeg[:\s]*/i, "").trim();
    } else if (/bruttó összeg/i.test(line)) {
      grossTotal = line.replace(/.*bruttó összeg[^:]*:\s*/i, "").trim();
    }
  }

  return { summary, location, items, netTotal, grossTotal };
}

export function exportToPDF(raw: string, withPrices = true, clientName = "") {
  const data = parseEstimateData(raw);
  const date = new Date().toLocaleDateString("hu-HU");

  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:9px 8px;border-bottom:1px solid #f0f0f0;">${item.description}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
        ${withPrices ? `<td style="padding:9px 8px;border-bottom:1px solid #f0f0f0;text-align:right;">${item.unitPrice}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${item.total}</td>` : ""}
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Becsült Ajánlat – Offerflow</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; color:#333; padding:40px; font-size:13px; line-height:1.5; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:16px; border-bottom:2.5px solid #f97316; }
    .logo { font-size:22px; font-weight:700; color:#f97316; }
    .logo-sub { font-size:11px; color:#aaa; margin-top:3px; }
    .meta-date { font-size:12px; color:#888; }
    .meta-title { font-size:13px; font-weight:700; color:#f97316; margin-top:4px; text-align:right; }
    .badge { display:inline-block; background:#fff7ed; color:#ea580c; border:1px solid #fdba74; border-radius:20px; padding:3px 12px; font-size:11px; margin-bottom:20px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px; }
    .info-block .label { font-size:10px; color:#aaa; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:3px; }
    .info-block .value { font-size:13px; color:#111; font-weight:500; }
    table { width:100%; border-collapse:collapse; margin-bottom:20px; }
    thead tr { background:#f97316; }
    thead th { padding:10px 8px; color:#fff; font-size:11px; font-weight:600; text-align:left; letter-spacing:0.3px; }
    thead th:nth-child(2) { text-align:center; }
    thead th:nth-child(3) { text-align:right; }
    thead th:last-child { text-align:right; }
    tbody tr:nth-child(even) { background:#fafafa; }
    .totals { text-align:right; padding:8px 0; }
    .totals .net { font-size:13px; color:#555; margin-bottom:6px; }
    .totals .gross { font-size:17px; font-weight:700; color:#f97316; }
    .disclaimer { margin-top:28px; padding:12px 16px; background:#fff7ed; border-left:3px solid #f97316; border-radius:0 6px 6px 0; font-size:11px; color:#888; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Offerflow</div>
      <div class="logo-sub">Építőipari ajánlatkérő rendszer</div>
    </div>
    <div>
      <div class="meta-date">Kelt: ${date}</div>
      <div class="meta-title">BECSÜLT AJÁNLAT</div>
    </div>
  </div>

  <div class="badge">Tájékoztató jellegű becslés</div>

  <div class="info-grid">
    <div class="info-block">
      <div class="label">Projekt összefoglaló</div>
      <div class="value">${data.summary}</div>
    </div>
    ${data.location ? `<div class="info-block">
      <div class="label">Helyszín</div>
      <div class="value">${data.location}</div>
    </div>` : ""}
    ${clientName ? `<div class="info-block">
      <div class="label">Megrendelő</div>
      <div class="value">${clientName}</div>
    </div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>Munkanem</th>
        <th style="text-align:center;">Mennyiség</th>
        ${withPrices ? `<th style="text-align:right;">Egységár</th>
        <th style="text-align:right;">Összeg</th>` : ""}
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  ${withPrices ? `<div class="totals">
    <div class="net">Becsült nettó összeg: <strong>${data.netTotal}</strong></div>
    <div class="gross">Becsült bruttó összeg (27% ÁFA): ${data.grossTotal}</div>
  </div>` : ""}

  <div class="disclaimer">
    Ez egy tájékoztató jellegű becslés. A pontos ár helyszíni felmérés után határozható meg.
    Az ajánlat az Offerflow rendszerben készült – ${date}
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export function exportToExcel(raw: string, withPrices = true, clientName = "") {
  const data = parseEstimateData(raw);
  const date = new Date().toLocaleDateString("hu-HU");

  const rows: (string | number)[][] = [
    ["BECSÜLT AJÁNLAT – OFFERFLOW"],
    [`Kelt: ${date}`],
    ...(clientName ? [["Megrendelő:", clientName]] : []),
    [],
    ["Projekt összefoglaló:", data.summary],
    ...(data.location ? [["Helyszín:", data.location]] : []),
    [],
    withPrices
      ? ["Munkanem", "Mennyiség", "Egységár", "Összeg"]
      : ["Munkanem", "Mennyiség"],
    ...data.items.map((item) =>
      withPrices
        ? [item.description, item.quantity, item.unitPrice, item.total]
        : [item.description, item.quantity]
    ),
    [],
    ...(withPrices
      ? [
          ["", "", "Becsült nettó összeg:", data.netTotal],
          ["", "", "Becsült bruttó összeg (27% ÁFA):", data.grossTotal],
        ]
      : []),
    [],
    [
      "Ez egy tájékoztató jellegű becslés. A pontos ár helyszíni felmérés után határozható meg.",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 45 }, { wch: 15 }, { wch: 30 }, { wch: 20 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ajánlat");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buf], { type: "application/octet-stream" });
  saveAs(blob, `offerflow-ajanlat-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
