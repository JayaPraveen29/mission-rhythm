// lib/reports.js
//
// Builds the Mission Rhythm reports (Daily / Weekly / Monthly / Officer-wise)
// from the entries ALREADY stored in the app — nothing new is saved — and
// exports them to Word (.docx) or PDF in the same layout as the official
// sheets.
//
// buildReport(...)  -> a plain "model": { title, subtitle, header, columns, rows }
// downloadWord(m)   -> Word file, landscape A4
// downloadPdf(m)    -> PDF file, landscape A4
//
// The Word / PDF libraries are loaded only when a button is pressed, so they
// do not slow down the rest of the app.

// ---------- small helpers ----------

export const fmtDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  return y && m && d ? `${d}.${m}.${y}` : String(iso);
};

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];
export const fmtMonth = (ym) => {
  if (!ym) return "";
  const [y, m] = String(ym).split("-");
  return MONTHS[Number(m) - 1] ? `${MONTHS[Number(m) - 1]} ${y}` : String(ym);
};

const entryTime = (r) => r.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
const byEntryOrder = (a, b) => entryTime(a) - entryTime(b);
const clean = (v) => (v == null ? "" : String(v).trim());

// "ASC TPJ" already carries the post; "IPF" + post TJ -> "IPF/TJ".
export function officerLabel(row) {
  const name = clean(row.officerName);
  const rank = clean(row.officerRank);
  const post = clean(row.post);
  let rp = rank;
  if (rank && post && !rank.toUpperCase().includes(post.toUpperCase())) rp = `${rank}/${post}`;
  else if (!rank) rp = post;
  return rp ? `${name}\n${rp}` : name;
}

const statusText = (s) => (!s || s === "Not Reported" ? "" : s);

// 1 item -> plain text; several -> "1. ...", "2. ..." so the Assigned and
// Accomplished columns line up task by task.
function numbered(items) {
  if (items.every((t) => !t)) return "";
  if (items.length === 1) return items[0];
  return items
    .map((t, i) => (t ? `${i + 1}. ${t}` : ""))
    .filter(Boolean)
    .join("\n");
}

// ---------- model builders ----------

// One day, one Post -> one row per officer.
export function buildDaily(rows, post, date) {
  const list = rows.filter((r) => r.post === post && r.date === date).sort(byEntryOrder);

  const groups = [];
  const index = {};
  list.forEach((r) => {
    const k = clean(r.officerName).toLowerCase() + "|" + clean(r.officerRank);
    if (!(k in index)) {
      index[k] = groups.length;
      groups.push({ label: officerLabel(r), items: [] });
    }
    groups[index[k]].items.push(r);
  });

  const body = groups.map((g, i) => [
    String(i + 1).padStart(2, "0"),
    g.label,
    numbered(
      g.items.map((r) => {
        const t = clean(r.priorityTask);
        return clean(r.target) ? `${t}\n   Target: ${clean(r.target)}` : t;
      })
    ),
    numbered(
      g.items.map((r) => {
        const done = [statusText(r.status) && `[${r.status}]`, clean(r.achievement)].filter(Boolean).join(" ");
        return clean(r.result) ? `${done}${done ? " — " : ""}Result: ${clean(r.result)}` : done;
      })
    ),
    numbered(
      g.items.map((r) => [clean(r.carryForward), clean(r.remarks)].filter(Boolean).join(" | "))
    ),
  ]);

  return {
    title: "MISSION RHYTHM - MORNING TASKING TO EVENING OUTPUT",
    subtitle: `Analytical Performance Statement for ${fmtDate(date)}`,
    objective:
      "Objective: To present the one-day Mission Rhythm cycle as a direct task-result chain, showing officer-wise morning tasking, same-day field execution, measurable output and reporting closure.",
    header: [
      ["Date", fmtDate(date)],
      ["Post / Outpost", post],
    ],
    columns: [
      { h: "Sl. No.", w: 0.06 },
      { h: "Name of the Officer with Rank", w: 0.18 },
      { h: "Tasks Assigned in the Morning", w: 0.3 },
      { h: "Tasks Accomplished in the Evening", w: 0.3 },
      { h: "Remarks, if any", w: 0.16 },
    ],
    rows: body,
    fileName: `Mission_Rhythm_Daily_${post}_${fmtDate(date)}`,
  };
}

// One week, one Post.
export function buildWeekly(rows, post, weekStart, weekEnd) {
  const list = rows
    .filter((r) => r.post === post && r.weekStart === weekStart && (r.weekEnd || "") === (weekEnd || ""))
    .sort(byEntryOrder);

  const body = list.map((r, i) => [
    String(i + 1),
    clean(r.description) + (r.priority ? `\n   Priority: ${r.priority}` : ""),
    [statusText(r.status) && `[${r.status}]`, clean(r.weeklyAchievement)].filter(Boolean).join(" "),
    clean(r.result),
    clean(r.remarks),
  ]);

  return {
    title: "MISSION RHYTHM",
    subtitle: "WEEKLY SCHEDULE-CUM-ACHIEVEMENT REPORT",
    header: [
      ["Post / Outpost", post],
      ["Period", `From ${fmtDate(weekStart)} to ${fmtDate(weekEnd)}`],
    ],
    columns: [
      { h: "Sl. No.", w: 0.06 },
      { h: "Schedules Assigned on Monday", w: 0.3 },
      { h: "Schedules Achieved by Sunday", w: 0.28 },
      { h: "Results / Impact", w: 0.22 },
      { h: "Remarks, if any", w: 0.14 },
    ],
    rows: body,
    fileName: `Mission_Rhythm_Weekly_${post}_${fmtDate(weekStart)}-${fmtDate(weekEnd)}`,
  };
}

// One month, one Post.
export function buildMonthly(rows, post, month) {
  const list = rows.filter((r) => r.post === post && r.month === month).sort(byEntryOrder);

  const body = list.map((r, i) => [
    String(i + 1),
    clean(r.priorityTask) + (r.priority ? `\n   Priority: ${r.priority}` : ""),
    clean(r.target),
    [statusText(r.status) && `[${r.status}]`, clean(r.monthlyAchievement)].filter(Boolean).join(" "),
    clean(r.result),
    clean(r.carryForwardRemarks),
  ]);

  return {
    title: "MISSION RHYTHM",
    subtitle: "MONTHLY ACHIEVEMENT STATEMENT",
    header: [
      ["Name of Post / Outpost", post],
      ["Month", fmtMonth(month)],
    ],
    columns: [
      { h: "Sl. No.", w: 0.05 },
      { h: "Tasks Assigned During the Month", w: 0.25 },
      { h: "Target", w: 0.15 },
      { h: "Tasks Accomplished During the Month", w: 0.25 },
      { h: "Impact / Outcome", w: 0.18 },
      { h: "Remarks, if any", w: 0.12 },
    ],
    rows: body,
    fileName: `Mission_Rhythm_Monthly_${post}_${month}`,
  };
}

// Officer-wise statement built from the Daily entries in a date range.
//   post     : a Post code, or "" for every Post
//   officer  : an officerKey(...) value, or "" for every officer
export const officerKey = (r) => clean(r.officerName).toLowerCase() + "|" + clean(r.post);

export function listOfficers(dailyRows, post) {
  const map = new Map();
  [...dailyRows].sort(byEntryOrder).forEach((r) => {
    if (!clean(r.officerName)) return;
    if (post && r.post !== post) return;
    map.set(officerKey(r), { key: officerKey(r), label: officerLabel(r).replace("\n", " — ") });
  });
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function buildOfficerWise(dailyRows, { post, officer, from, to }) {
  const list = dailyRows
    .filter(
      (r) =>
        clean(r.officerName) &&
        (!post || r.post === post) &&
        (!officer || officerKey(r) === officer) &&
        (!from || r.date >= from) &&
        (!to || r.date <= to)
    )
    .sort((a, b) => (a.date === b.date ? byEntryOrder(a, b) : a.date < b.date ? -1 : 1));

  const groups = [];
  const index = {};
  list.forEach((r) => {
    const k = officerKey(r);
    if (!(k in index)) {
      index[k] = groups.length;
      groups.push({ label: officerLabel(r), items: [] });
    }
    groups[index[k]].items.push(r);
  });
  groups.sort((a, b) => a.label.localeCompare(b.label));

  const dated = (r, text) => `${fmtDate(r.date)} - ${text}`;

  const body = groups.map((g, i) => {
    const achieved = g.items.filter((r) => r.status === "Achieved").length;
    const partly = g.items.filter((r) => r.status === "Partly Achieved").length;
    const notAch = g.items.filter((r) => r.status === "Not Achieved").length;
    const pending = g.items.filter((r) => !r.status || r.status === "Not Reported").length;
    const summary =
      `Tasks: ${g.items.length}\nAchieved: ${achieved}` +
      (partly ? `\nPartly: ${partly}` : "") +
      (notAch ? `\nNot achieved: ${notAch}` : "") +
      (pending ? `\nNot reported: ${pending}` : "");

    return [
      String(i + 1),
      g.label,
      g.items.map((r) => "• " + dated(r, clean(r.priorityTask) + (clean(r.target) ? ` (Target: ${clean(r.target)})` : ""))).join("\n"),
      g.items
        .map((r) => {
          const t = [statusText(r.status) && `[${r.status}]`, clean(r.achievement)].filter(Boolean).join(" ");
          return t ? "• " + dated(r, t) : "";
        })
        .filter(Boolean)
        .join("\n"),
      summary,
      g.items
        .map((r) => (clean(r.result) ? "• " + dated(r, clean(r.result)) : ""))
        .filter(Boolean)
        .join("\n"),
      g.items
        .map((r) => {
          const t = [clean(r.carryForward), clean(r.remarks)].filter(Boolean).join(" | ");
          return t ? "• " + dated(r, t) : "";
        })
        .filter(Boolean)
        .join("\n"),
    ];
  });

  const single = groups.length === 1;
  const periodTxt = `From ${fmtDate(from)} to ${fmtDate(to)}`;
  return {
    title: "MISSION RHYTHM",
    subtitle: single ? "OFFICER-WISE ACHIEVEMENT STATEMENT" : "OFFICER-WISE ACHIEVEMENT STATEMENT",
    header: [
      ["Name of Post / Outpost", post || "All Posts"],
      ["Period", periodTxt],
    ],
    columns: [
      { h: "Sl. No.", w: 0.04 },
      { h: "Name of Officer with Rank", w: 0.12 },
      { h: "Tasks Assigned", w: 0.2 },
      { h: "Tasks Accomplished", w: 0.2 },
      { h: "Status Summary", w: 0.09 },
      { h: "Result / Impact", w: 0.18 },
      { h: "Remarks, if any", w: 0.17 },
    ],
    rows: body,
    fileName:
      "Mission_Rhythm_Officer_" +
      (single ? groups[0].label.split("\n")[0].replace(/[^A-Za-z0-9]+/g, "_") : post || "All") +
      `_${fmtDate(from)}-${fmtDate(to)}`,
  };
}

// ---------- file download ----------

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------- Word ----------

export async function downloadWord(model) {
  const {
    Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
    WidthType, AlignmentType, PageOrientation, ShadingType, BorderStyle,
  } = await import("docx");

  const FONT = "Arial";
  const TOTAL = 15100; // usable width in twips: A4 landscape minus 1.5 cm margins
  const line = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
  const borders = { top: line, bottom: line, left: line, right: line };

  const runs = (text, opts = {}) =>
    String(text)
      .split("\n")
      .map((t, i) => new TextRun({ text: t, break: i ? 1 : 0, font: FONT, size: 18, ...opts }));

  const cell = (text, width, opts = {}) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      borders,
      margins: { top: 60, bottom: 60, left: 90, right: 90 },
      shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: "auto" } : undefined,
      children: [
        new Paragraph({
          alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: runs(text, { bold: !!opts.bold }),
        }),
      ],
    });

  const centered = (text, size, bold = true, after = 80) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after },
      children: [new TextRun({ text, bold, font: FONT, size })],
    });

  // Header block (Date / Post / Period …)
  const labelW = 3000;
  const headerTable = new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: [labelW, TOTAL - labelW],
    rows: model.header.map(
      ([k, v]) =>
        new TableRow({
          children: [cell(k, labelW, { bold: true, fill: "E7ECF3" }), cell(v, TOTAL - labelW, { bold: true })],
        })
    ),
  });

  // Main table, column widths from the model fractions.
  const widths = model.columns.map((c) => Math.round(c.w * TOTAL));
  widths[widths.length - 1] += TOTAL - widths.reduce((a, b) => a + b, 0);

  const head = new TableRow({
    tableHeader: true,
    children: model.columns.map((c, i) => cell(c.h, widths[i], { bold: true, center: true, fill: "D9E2F3" })),
  });
  const body = model.rows.length
    ? model.rows.map(
        (r) =>
          new TableRow({
            cantSplit: false,
            children: r.map((t, i) => cell(t, widths[i], { center: i === 0 })),
          })
      )
    : [
        new TableRow({
          children: [
            new TableCell({
              columnSpan: model.columns.length,
              width: { size: TOTAL, type: WidthType.DXA },
              borders,
              margins: { top: 100, bottom: 100, left: 90, right: 90 },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: runs("No entries found for this selection.") })],
            }),
          ],
        }),
      ];

  const table = new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: widths,
    rows: [head, ...body],
  });

  const children = [
    centered(model.title, 30),
    centered(model.subtitle, 22, true, model.objective ? 80 : 160),
  ];
  if (model.objective) {
    children.push(
      new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: model.objective, font: FONT, size: 18, italics: true })] })
    );
  }
  children.push(headerTable, new Paragraph({ spacing: { after: 100 }, children: [] }), table);

  const doc = new Document({
    creator: "Mission Rhythm",
    title: model.fileName,
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE },
            margin: { top: 850, bottom: 850, left: 850, right: 850 },
          },
        },
        children,
      },
    ],
  });

  saveBlob(await Packer.toBlob(doc), model.fileName + ".docx");
}

// ---------- PDF ----------

export async function downloadPdf(model) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 36;
  const usable = pageW - margin * 2;
  let y = 40;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text(model.title, pageW / 2, y, { align: "center" });
  y += 18;
  pdf.setFontSize(11);
  pdf.text(model.subtitle, pageW / 2, y, { align: "center" });
  y += 14;

  if (model.objective) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(model.objective, usable);
    pdf.text(lines, margin, y + 6);
    y += 6 + lines.length * 11;
  }
  y += 8;

  autoTable(pdf, {
    startY: y,
    margin: { left: margin, right: margin },
    body: model.header,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 4, lineColor: [128, 128, 128], lineWidth: 0.5, textColor: 20 },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [231, 236, 243], cellWidth: 150 },
      1: { fontStyle: "bold" },
    },
  });

  autoTable(pdf, {
    startY: pdf.lastAutoTable.finalY + 10,
    margin: { left: margin, right: margin, bottom: 36 },
    head: [model.columns.map((c) => c.h)],
    body: model.rows.length
      ? model.rows
      : [[{ content: "No entries found for this selection.", colSpan: model.columns.length, styles: { halign: "center" } }]],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 4,
      valign: "top",
      overflow: "linebreak",
      lineColor: [128, 128, 128],
      lineWidth: 0.5,
      textColor: 20,
    },
    headStyles: { fillColor: [217, 226, 243], textColor: 20, halign: "center", fontStyle: "bold" },
    columnStyles: Object.fromEntries(
      model.columns.map((c, i) => [i, { cellWidth: c.w * usable, ...(i === 0 ? { halign: "center" } : {}) }])
    ),
    didDrawPage: () => {
      const n = pdf.internal.getNumberOfPages();
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Page ${n}`, pageW - margin, pdf.internal.pageSize.getHeight() - 16, { align: "right" });
    },
  });

  pdf.save(model.fileName + ".pdf");
}
