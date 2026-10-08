"use strict";

const insightState = { campus: null, spaces: [], charts: [] };

document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("resize", resizeCharts);
  window.addEventListener("themechange", renderCharts);
  document.getElementById("downloadSummary").addEventListener("click", downloadSummary);
  loadInsights();
});

async function loadInsights() {
  if (typeof echarts === "undefined") {
    CampusApp.setStatus("insightStatus", "ECharts 本地文件未能加载，请检查 libs/echarts-5.6.0.min.js。", "error");
    return;
  }
  try {
    const [campus, spaces] = await Promise.all([
      CampusApp.loadJson("data/campus.json", validateCampusData),
      CampusApp.loadJson("data/spaces.json", validateSpaceData)
    ]);
    insightState.campus = campus;
    insightState.spaces = spaces.spaces;
    renderCharts();
    renderCheckTable();
    const kind = CampusApp.stateMode === "empty" ? "warning" : "success";
    CampusApp.setStatus("insightStatus", CampusApp.stateMode === "empty" ? "空数据演示已启用，三个图表都显示明确的暂无数据状态。" : `读取成功，数据更新时间：${campus.updated}。`, kind);
  } catch (error) {
    console.warn("图表数据读取失败：", error.message);
    insightState.campus = null;
    insightState.spaces = [];
    renderCharts();
    renderCheckTable();
    CampusApp.setStatus("insightStatus", `图表数据读取失败：${error.message}。请检查本地服务器和 JSON 格式。`, "error");
  }
}

function validateCampusData(data) {
  if (!data || !data.weekFlow || !Array.isArray(data.weekFlow.labels) || !Array.isArray(data.weekFlow.values)) throw new Error("weekFlow 的 labels 或 values 格式不正确");
  if (data.weekFlow.labels.length !== data.weekFlow.values.length) throw new Error("weekFlow 标签与数值数量不一致");
  if (!Array.isArray(data.studyTypes) || !Array.isArray(data.timeSlots)) throw new Error("studyTypes 或 timeSlots 格式不正确");
  return data;
}

function validateSpaceData(data) {
  if (!data || !Array.isArray(data.spaces)) throw new Error("spaces.json 缺少 spaces 数组");
  return data;
}

function chartTheme() {
  const night = document.documentElement.dataset.theme === "night";
  return { text: night ? "#ebf7f2" : "#173a32", muted: night ? "#b6c9c2" : "#5f746e", grid: night ? "rgba(255,255,255,.12)" : "rgba(20,64,53,.12)", brand: "#16785f", accent: "#efb84c" };
}

function renderCharts() {
  insightState.charts.forEach((chart) => chart.dispose());
  insightState.charts = [];
  if (typeof echarts === "undefined") return;
  const theme = chartTheme();
  const campus = insightState.campus || { weekFlow: { labels: [], values: [] }, studyTypes: [], timeSlots: [] };

  const flow = echarts.init(document.getElementById("flowChart"));
  flow.setOption({
    color: [theme.brand], tooltip: { trigger: "axis" }, grid: { left: 30, right: 20, top: 34, bottom: 28, containLabel: true },
    xAxis: { type: "category", data: campus.weekFlow.labels || [], axisLabel: { color: theme.muted }, axisLine: { lineStyle: { color: theme.grid } } },
    yAxis: { type: "value", name: "人次", nameTextStyle: { color: theme.muted }, axisLabel: { color: theme.muted }, splitLine: { lineStyle: { color: theme.grid } } },
    series: [{ type: "line", smooth: true, symbolSize: 9, data: campus.weekFlow.values || [], areaStyle: { color: "rgba(22,120,95,.18)" }, markPoint: { data: [{ type: "max", name: "最高" }] } }],
    graphic: (campus.weekFlow.values || []).length ? [] : emptyGraphic(theme.text)
  });

  const types = echarts.init(document.getElementById("typeChart"));
  types.setOption({
    color: ["#16785f", "#efb84c", "#6e8db7", "#b86e73", "#8464b8"], tooltip: { trigger: "item", formatter: "{b}：{c}%" }, legend: { bottom: 0, textStyle: { color: theme.muted } },
    series: [{ type: "pie", radius: ["42%", "67%"], center: ["50%", "43%"], avoidLabelOverlap: true, label: { color: theme.text, formatter: "{b}\n{d}%" }, data: campus.studyTypes || [] }],
    graphic: (campus.studyTypes || []).length ? [{ type: "text", left: "center", top: "38%", style: { text: "学习目的", fill: theme.text, fontSize: 15, textAlign: "center" } }] : emptyGraphic(theme.text)
  });

  const slots = echarts.init(document.getElementById("slotChart"));
  slots.setOption({
    color: [theme.accent], tooltip: { trigger: "axis" }, grid: { left: 30, right: 20, top: 25, bottom: 25, containLabel: true },
    xAxis: { type: "category", data: (campus.timeSlots || []).map((item) => item.name), axisLabel: { color: theme.muted }, axisLine: { lineStyle: { color: theme.grid } } },
    yAxis: { type: "value", max: 100, name: "热度", nameTextStyle: { color: theme.muted }, axisLabel: { color: theme.muted }, splitLine: { lineStyle: { color: theme.grid } } },
    series: [{ type: "bar", data: (campus.timeSlots || []).map((item) => item.value), barMaxWidth: 52, itemStyle: { borderRadius: [8, 8, 0, 0] } }],
    graphic: (campus.timeSlots || []).length ? [] : emptyGraphic(theme.text)
  });
  insightState.charts.push(flow, types, slots);
}

function emptyGraphic(color) {
  return [{ type: "text", left: "center", top: "middle", style: { text: "暂无可显示的数据", fill: color, fontSize: 16, textAlign: "center" } }];
}

function renderCheckTable() {
  const host = document.getElementById("checkTable");
  host.replaceChildren();
  const campus = insightState.campus;
  const open = insightState.spaces.filter((item) => item.status === "开放");
  const seats = open.reduce((sum, item) => sum + Number(item.seats || 0), 0);
  const occupied = open.reduce((sum, item) => sum + Number(item.occupied || 0), 0);
  const rows = [
    ["一周到访人次", campus?.weekFlow?.values?.join("、") || "暂无", "逐项对应周一至周日"],
    ["学习目的占比", campus?.studyTypes?.map((item) => `${item.name} ${item.value}%`).join("；") || "暂无", `合计 ${campus?.studyTypes?.reduce((sum, item) => sum + Number(item.value), 0) || 0}%`],
    ["开放空间与座位", `${open.length} 个，${seats} 席`, "筛选 status 为“开放”后求和"],
    ["剩余座位", `${Math.max(0, seats - occupied)} 席`, `${seats} - ${occupied}`]
  ];
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? "th" : "td");
      if (index === 0) cell.scope = "row";
      cell.textContent = value;
      tr.append(cell);
    });
    host.append(tr);
  });
}

function downloadSummary() {
  if (!insightState.campus) return CampusApp.setStatus("insightStatus", "当前没有可下载的统计数据。", "warning");
  const open = insightState.spaces.filter((item) => item.status === "开放");
  CampusApp.downloadJson("campus-insight-summary.json", {
    generatedAt: new Date().toISOString(), source: insightState.campus.source,
    openSpaceCount: open.length,
    availableSeats: open.reduce((sum, item) => sum + item.seats - item.occupied, 0),
    weekFlow: insightState.campus.weekFlow, studyTypes: insightState.campus.studyTypes, timeSlots: insightState.campus.timeSlots
  });
  CampusApp.setStatus("insightStatus", "统计摘要已经下载。", "success");
}

function resizeCharts() { insightState.charts.forEach((chart) => chart.resize()); }

