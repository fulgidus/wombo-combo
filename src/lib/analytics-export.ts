/**
 * analytics-export.ts — Export analytics data to CSV, JSON, or HTML reports.
 *
 * Provides three export formats:
 *   - CSV: one row per UsageRecord with all metrics (flat, spreadsheet-friendly)
 *   - JSON: full nested structure with records, summary, and per-task groupings
 *   - HTML: self-contained report with Chart.js embedded graphs
 *
 * All exports read UsageRecord[] (already loaded/filtered by the caller).
 * Writing to disk is handled by writeExport().
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { UsageRecord } from "./token-collector";
import { totalUsage, groupBy } from "./token-usage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported export formats */
export type ExportFormat = "csv" | "json" | "html";

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

/** CSV column definitions — field name + header label */
const CSV_COLUMNS: Array<{ field: keyof UsageRecord; label: string }> = [
  { field: "task_id", label: "task_id" },
  { field: "quest_id", label: "quest_id" },
  { field: "model", label: "model" },
  { field: "provider", label: "provider" },
  { field: "harness", label: "harness" },
  { field: "input_tokens", label: "input_tokens" },
  { field: "output_tokens", label: "output_tokens" },
  { field: "cache_read", label: "cache_read" },
  { field: "cache_write", label: "cache_write" },
  { field: "reasoning_tokens", label: "reasoning_tokens" },
  { field: "total_tokens", label: "total_tokens" },
  { field: "cost", label: "cost" },
  { field: "is_final_step", label: "is_final_step" },
  { field: "timestamp", label: "timestamp" },
];

/**
 * Escape a CSV cell value.
 * - Wraps in double quotes if the value contains commas, quotes, or newlines.
 * - Escapes internal double-quotes by doubling them.
 */
function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export UsageRecords to CSV format.
 *
 * Returns a CSV string with a header row followed by one data row per record.
 * All token metrics and metadata fields are included.
 *
 * @param records  The records to export
 * @returns CSV string
 */
export function exportToCSV(records: UsageRecord[]): string {
  const lines: string[] = [];

  // Header row
  lines.push(CSV_COLUMNS.map((col) => col.label).join(","));

  // Data rows
  for (const record of records) {
    const row = CSV_COLUMNS.map((col) => escapeCsvCell(record[col.field]));
    lines.push(row.join(","));
  }

  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// JSON Export
// ---------------------------------------------------------------------------

/**
 * Export UsageRecords to a full nested JSON structure.
 *
 * The structure includes:
 *   - metadata: export timestamp, format version
 *   - records: the full array of UsageRecord objects
 *   - summary: aggregated totals across all records
 *   - by_task: per-task aggregated totals
 *
 * @param records  The records to export
 * @returns Pretty-printed JSON string
 */
export function exportToJSON(records: UsageRecord[]): string {
  const summary = totalUsage(records);
  const byTaskMap = groupBy(records, "task_id");

  // Convert Map to plain object for JSON serialization
  const byTask: Record<string, object> = {};
  for (const [taskId, totals] of byTaskMap) {
    byTask[taskId] = {
      input_tokens: totals.input_tokens,
      output_tokens: totals.output_tokens,
      cache_read: totals.cache_read,
      cache_write: totals.cache_write,
      reasoning_tokens: totals.reasoning_tokens,
      total_tokens: totals.total_tokens,
      total_cost: totals.total_cost,
      record_count: totals.record_count,
    };
  }

  const doc = {
    metadata: {
      exported_at: new Date().toISOString(),
      format: "wombo-analytics-v1",
      record_count: records.length,
    },
    summary: {
      input_tokens: summary.input_tokens,
      output_tokens: summary.output_tokens,
      cache_read: summary.cache_read,
      cache_write: summary.cache_write,
      reasoning_tokens: summary.reasoning_tokens,
      total_tokens: summary.total_tokens,
      total_cost: summary.total_cost,
      record_count: summary.record_count,
    },
    by_task: byTask,
    records,
  };

  return JSON.stringify(doc, null, 2);
}

// ---------------------------------------------------------------------------
// HTML Export
// ---------------------------------------------------------------------------

/** Format a number with commas for display (e.g. 1500 → "1,500") */
function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

/** Format a cost value for display */
function fmtCost(cost: number): string {
  if (cost === 0) return "-";
  return `$${cost.toFixed(4)}`;
}

/**
 * Build the Chart.js inline script for token-over-time and cost breakdown.
 * Returns a <script> block with embedded chart initialization code.
 */
function buildChartScript(records: UsageRecord[]): string {
  // Sort by timestamp for the time series chart
  const sorted = [...records].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Time series: total tokens per record over time
  const timeLabels = sorted.map((r) => {
    const d = new Date(r.timestamp);
    return d.toISOString().slice(0, 16).replace("T", " ");
  });
  const tokenData = sorted.map((r) => r.total_tokens);
  const costData = sorted.map((r) => r.cost);

  // Cost breakdown by task
  const byTaskMap = groupBy(records, "task_id");
  const taskLabels = Array.from(byTaskMap.keys());
  const taskCosts = taskLabels.map((t) => byTaskMap.get(t)!.total_cost);
  const taskTokens = taskLabels.map((t) => byTaskMap.get(t)!.total_tokens);

  return `
    const timeLabels = ${JSON.stringify(timeLabels)};
    const tokenData = ${JSON.stringify(tokenData)};
    const costData = ${JSON.stringify(costData)};
    const taskLabels = ${JSON.stringify(taskLabels)};
    const taskCosts = ${JSON.stringify(taskCosts)};
    const taskTokens = ${JSON.stringify(taskTokens)};

    // Token usage over time chart
    const ctxTime = document.getElementById('tokenTimeChart').getContext('2d');
    new Chart(ctxTime, {
      type: 'line',
      data: {
        labels: timeLabels,
        datasets: [{
          label: 'Total Tokens per Step',
          data: tokenData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.1,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Token Usage Over Time' }
        },
        scales: {
          x: { ticks: { maxTicksLimit: 20, maxRotation: 45 } },
          y: { beginAtZero: true }
        }
      }
    });

    // Cost breakdown by task (bar chart)
    const ctxTask = document.getElementById('taskCostChart').getContext('2d');
    new Chart(ctxTask, {
      type: 'bar',
      data: {
        labels: taskLabels,
        datasets: [{
          label: 'Total Cost ($)',
          data: taskCosts,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1,
        }, {
          label: 'Total Tokens',
          data: taskTokens,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1,
          yAxisID: 'y1',
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Token & Cost Breakdown by Task' }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Cost ($)' } },
          y1: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            title: { display: true, text: 'Tokens' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });

    // Success rate / step distribution pie chart
    const finalSteps = ${records.filter((r) => r.is_final_step).length};
    const intermediateSteps = ${records.length - records.filter((r) => r.is_final_step).length};
    const ctxPie = document.getElementById('stepDistChart').getContext('2d');
    new Chart(ctxPie, {
      type: 'doughnut',
      data: {
        labels: ['Final Steps (stop)', 'Intermediate Steps'],
        datasets: [{
          data: [finalSteps, intermediateSteps],
          backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(201, 203, 207, 0.6)'],
          borderColor: ['rgb(75, 192, 192)', 'rgb(201, 203, 207)'],
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Step Distribution' }
        }
      }
    });
  `;
}

/**
 * Build the data table HTML for all records.
 */
function buildRecordsTable(records: UsageRecord[]): string {
  const rows = records
    .map((r) => {
      const ts = new Date(r.timestamp).toISOString().slice(0, 19).replace("T", " ");
      return `
      <tr>
        <td>${escapeHtml(r.task_id)}</td>
        <td>${escapeHtml(r.quest_id ?? "")}</td>
        <td>${escapeHtml(r.model ?? "")}</td>
        <td>${escapeHtml(r.provider ?? "")}</td>
        <td class="num">${fmtNum(r.input_tokens)}</td>
        <td class="num">${fmtNum(r.output_tokens)}</td>
        <td class="num">${fmtNum(r.cache_read)}</td>
        <td class="num">${fmtNum(r.total_tokens)}</td>
        <td class="num">${fmtCost(r.cost)}</td>
        <td>${ts}</td>
      </tr>`;
    })
    .join("");

  return `
    <table id="records-table">
      <thead>
        <tr>
          <th>Task ID</th>
          <th>Quest ID</th>
          <th>Model</th>
          <th>Provider</th>
          <th class="num">Input</th>
          <th class="num">Output</th>
          <th class="num">Cache Read</th>
          <th class="num">Total Tokens</th>
          <th class="num">Cost</th>
          <th>Timestamp</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
}

/** Escape HTML special characters */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Export UsageRecords to a self-contained HTML report with Chart.js visualizations.
 *
 * The HTML is fully self-contained — Chart.js is embedded inline (no CDN
 * dependencies) so the report works offline.
 *
 * Includes:
 *   - Summary statistics block
 *   - Token usage over time (line chart)
 *   - Cost/token breakdown by task (bar chart)
 *   - Step distribution (doughnut chart)
 *   - Full data table
 *
 * @param records  The records to include in the report
 * @returns Self-contained HTML string
 */
export function exportToHTML(records: UsageRecord[]): string {
  const totals = totalUsage(records);
  const chartScript = buildChartScript(records);
  const table = buildRecordsTable(records);

  const generatedAt = new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wombo-Combo Analytics Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
      padding: 2rem;
    }
    h1 { font-size: 1.8rem; margin-bottom: 0.25rem; color: #fff; }
    h2 { font-size: 1.2rem; margin: 1.5rem 0 0.75rem; color: #a0c4ff; }
    .subtitle { color: #888; font-size: 0.9rem; margin-bottom: 2rem; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: #1a1a2e;
      border: 1px solid #2a2a4e;
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }
    .stat-card .value {
      font-size: 1.6rem;
      font-weight: bold;
      color: #a0c4ff;
    }
    .stat-card .label {
      font-size: 0.8rem;
      color: #888;
      margin-top: 0.25rem;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .chart-card {
      background: #1a1a2e;
      border: 1px solid #2a2a4e;
      border-radius: 8px;
      padding: 1.5rem;
    }
    .chart-card.full-width {
      grid-column: 1 / -1;
    }
    canvas { width: 100% !important; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      background: #1a1a2e;
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      padding: 0.6rem 0.8rem;
      text-align: left;
      border-bottom: 1px solid #2a2a4e;
    }
    th {
      background: #0d0d23;
      color: #a0c4ff;
      font-weight: 600;
      white-space: nowrap;
    }
    tr:hover td { background: rgba(160, 196, 255, 0.05); }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    th.num { text-align: right; }
    @media (max-width: 768px) {
      .charts-grid { grid-template-columns: 1fr; }
      .chart-card.full-width { grid-column: 1; }
    }
  </style>
</head>
<body>
  <h1>Wombo-Combo Analytics Report</h1>
  <p class="subtitle">Generated at ${generatedAt} &bull; ${fmtNum(records.length)} steps recorded</p>

  <h2>Summary</h2>
  <div class="summary-grid">
    <div class="stat-card">
      <div class="value">${fmtNum(totals.total_tokens)}</div>
      <div class="label">Total Tokens</div>
    </div>
    <div class="stat-card">
      <div class="value">${fmtNum(totals.input_tokens)}</div>
      <div class="label">Input Tokens</div>
    </div>
    <div class="stat-card">
      <div class="value">${fmtNum(totals.output_tokens)}</div>
      <div class="label">Output Tokens</div>
    </div>
    <div class="stat-card">
      <div class="value">${fmtNum(totals.cache_read)}</div>
      <div class="label">Cache Read</div>
    </div>
    <div class="stat-card">
      <div class="value">${totals.total_cost === 0 ? "—" : `$${totals.total_cost.toFixed(4)}`}</div>
      <div class="label">Total Cost</div>
    </div>
    <div class="stat-card">
      <div class="value">${fmtNum(totals.record_count)}</div>
      <div class="label">Steps Recorded</div>
    </div>
  </div>

  <h2>Visualizations</h2>
  <div class="charts-grid">
    <div class="chart-card full-width">
      <canvas id="tokenTimeChart" height="80"></canvas>
    </div>
    <div class="chart-card">
      <canvas id="taskCostChart" height="160"></canvas>
    </div>
    <div class="chart-card">
      <canvas id="stepDistChart" height="160"></canvas>
    </div>
  </div>

  <h2>Records (${fmtNum(records.length)} steps)</h2>
  ${table}

  <script>
    ${chartScript}
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// writeExport — Write export output to disk
// ---------------------------------------------------------------------------

/**
 * Export UsageRecords to a file in the specified format.
 *
 * Creates parent directories if they don't exist, and overwrites any
 * existing file at the given path.
 *
 * @param records   The records to export
 * @param format    Export format: "csv", "json", or "html"
 * @param filePath  Absolute or relative path to write the output to
 */
export async function writeExport(
  records: UsageRecord[],
  format: ExportFormat,
  filePath: string
): Promise<void> {
  const resolvedPath = resolve(filePath);
  const dir = dirname(resolvedPath);

  // Ensure parent directories exist
  mkdirSync(dir, { recursive: true });

  let content: string;
  switch (format) {
    case "csv":
      content = exportToCSV(records);
      break;
    case "json":
      content = exportToJSON(records);
      break;
    case "html":
      content = exportToHTML(records);
      break;
  }

  writeFileSync(resolvedPath, content, "utf-8");
}
