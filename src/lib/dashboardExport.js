// lib/dashboardExport.js
//
// Builds the export model for the Command Dashboard and writes the Excel file.
// Word and PDF reuse downloadWord / downloadPdf from lib/reports.js, so the
// dashboard exports look the same as the Reports page.
//
// Closure % = Achieved / (Total - Not Applicable)

import { fmtDate, fmtMonth, downloadWord, downloadPdf } from "./reports";

const GROUPS = [
  ["Daily", "Entries"],
  ["Weekly", "Tasks"],
  ["Monthly", "Tasks"],
];

// scope: "all" | "daily" | "weekly" | "monthly"
const SCOPES = { all: [0, 1, 2], daily: [0], weekly: [1], monthly: [2] };
// Sub-headings copied from the official Mission Rhythm sheets.
const SCOPE_SUBTITLE = {
  all: "COMMAND DASHBOARD",
  daily: "DAILY SCHEDULE-CUM-ACHIEVEMENT SHEET",
  weekly: "WEEKLY SCHEDULE-CUM-ACHIEVEMENT REPORT",
  monthly: "MONTHLY ACHIEVEMENT STATEMENT",
};

// summaries = [dailySummary, weeklySummary, monthlySummary]
// each: { [post]: { tasks, closures, na } }
export function buildDashboardModel({ posts, summaries: allSummaries, pct, weekStart, weekEnd, month, scope = "all" }) {
  const empty = { tasks: 0, closures: 0, na: 0 };
  const idx = SCOPES[scope] || SCOPES.all;
  const summaries = idx.map((i) => allSummaries[i]);

  const nCols = 1 + idx.length * 3;
  const w = 1 / nCols;
  const columns = [{ h: "Post / OP", w }];
  idx.forEach((i) => {
    const [g, t] = GROUPS[i];
    columns.push({ h: `${g} ${t}`, w }, { h: `${g} Closures`, w }, { h: `${g} Closure %`, w });
  });

  const rows = posts.map((p) => {
    const r = [p];
    summaries.forEach((s) => {
      const x = s[p] || empty;
      r.push(String(x.tasks), String(x.closures), `${pct(x.closures, x.tasks, x.na)}%`);
    });
    return r;
  });

  // Overall row (all posts together, same formula).
  const total = ["TOTAL"];
  summaries.forEach((s) => {
    const t = posts.reduce(
      (a, p) => {
        const x = s[p] || empty;
        return { tasks: a.tasks + x.tasks, closures: a.closures + x.closures, na: a.na + x.na };
      },
      { ...empty }
    );
    total.push(String(t.tasks), String(t.closures), `${pct(t.closures, t.tasks, t.na)}%`);
  });
  if (rows.length) rows.push(total);

  const stamp = new Date();
  const iso = `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, "0")}-${String(stamp.getDate()).padStart(2, "0")}`;

  return {
    title: "MISSION RHYTHM",
    subtitle: SCOPE_SUBTITLE[scope] || SCOPE_SUBTITLE.all,
    header: [
      ...(idx.includes(0) || idx.includes(1)
        ? [["Period", `From ${fmtDate(weekStart)} to ${fmtDate(weekEnd)}`]]
        : []),
      ...(idx.includes(2) ? [["Month", fmtMonth(month)]] : []),
    ],
    numeric: true, // summary table: write numbers/percentages as real numbers in Excel
    sheetName: "Dashboard",
    columns,
    rows,
    fileName: `Command_Dashboard_${scope}_${iso}`,
  };
}

// ---------- Excel ----------

const thin = { style: "thin", color: { argb: "FF808080" } };
const box = { top: thin, bottom: thin, left: thin, right: thin };
const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

function addSheet(wb, model, usedNames) {
  // Excel sheet names: max 31 chars, none of  \ / ? * [ ] :   and unique.
  let base = String(model.sheetName || model.subtitle || "Sheet").replace(/[\\/?*[\]:]/g, "-").slice(0, 28);
  let name = base;
  for (let i = 2; usedNames.has(name.toLowerCase()); i++) name = `${base.slice(0, 26)} ${i}`;
  usedNames.add(name.toLowerCase());

  const n = model.columns.length;
  const ws = wb.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: model.header.length + 4 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.mergeCells(1, 1, 1, n);
  ws.getCell(1, 1).value = model.title;
  ws.getCell(1, 1).font = { bold: true, size: 15, color: { argb: "FF10243E" } };
  ws.getCell(1, 1).alignment = { horizontal: "center" };
  ws.mergeCells(2, 1, 2, n);
  ws.getCell(2, 1).value = model.subtitle;
  ws.getCell(2, 1).font = { bold: true, size: 11 };
  ws.getCell(2, 1).alignment = { horizontal: "center" };

  model.header.forEach(([k, v], i) => {
    const r = 4 + i;
    ws.getCell(r, 1).value = k;
    ws.getCell(r, 1).font = { bold: true };
    ws.getCell(r, 1).fill = fill("FFE7ECF3");
    ws.getCell(r, 1).border = box;
    ws.mergeCells(r, 2, r, Math.min(n, 4));
    ws.getCell(r, 2).value = v;
    ws.getCell(r, 2).font = { bold: true };
  });

  const headRow = 4 + model.header.length + 1;
  model.columns.forEach((c, i) => {
    const cell = ws.getCell(headRow, i + 1);
    cell.value = c.h;
    cell.font = { bold: true, color: { argb: model.numeric ? "FFFFFFFF" : "FF000000" } };
    cell.fill = fill(model.numeric ? "FF10243E" : "FFD9E2F3");
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = box;
  });
  ws.getRow(headRow).height = 30;

  model.rows.forEach((row, ri) => {
    const isTotal = model.numeric && row[0] === "TOTAL";
    row.forEach((v, ci) => {
      const cell = ws.getCell(headRow + 1 + ri, ci + 1);
      if (model.numeric && ci > 0 && typeof v === "string" && v.endsWith("%")) {
        cell.value = parseFloat(v) / 100;
        cell.numFmt = "0%";
      } else if (model.numeric && ci > 0) {
        cell.value = Number(v);
      } else {
        cell.value = v;
      }
      cell.border = box;
      if (model.numeric) {
        cell.alignment = { horizontal: ci === 0 ? "left" : "center" };
      } else {
        cell.alignment = { horizontal: ci === 0 ? "center" : "left", vertical: "top", wrapText: true };
      }
      if (isTotal) {
        cell.font = { bold: true };
        cell.fill = fill("FFD9E2F3");
      }
    });
  });

  if (model.numeric) {
    ws.getColumn(1).width = 18;
    for (let i = 2; i <= n; i++) ws.getColumn(i).width = 14;
  } else {
    model.columns.forEach((c, i) => {
      ws.getColumn(i + 1).width = Math.max(8, Math.round(c.w * 150));
    });
  }
}

// Builds the .xlsx as a Blob (separate from the download so it can be tested).
// models: one model, or an array (one worksheet each).
export async function makeExcelBlob(models) {
  const list = Array.isArray(models) ? models : [models];
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Mission Rhythm";
  const used = new Set();
  list.forEach((m) => addSheet(wb, m, used));
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

async function downloadExcelMany(models, fileName) {
  const blob = await makeExcelBlob(models);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName + ".xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// kind: "excel" | "pdf" | "word"; model: the export model.
export async function exportModel(kind, model) {
  if (kind === "excel") return downloadExcelMany([model], model.fileName);
  if (kind === "pdf") return downloadPdf(model);
  return downloadWord(model);
}
