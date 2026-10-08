"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const validateSpaces = (payload) => {
    if (!payload || !Array.isArray(payload.spaces)) throw new Error("spaces.json 缺少 spaces 数组");
    return payload;
  };
  const validateCampus = (payload) => {
    if (!payload || !Array.isArray(payload.announcements)) throw new Error("campus.json 缺少 announcements 数组");
    return payload;
  };

  try {
    const [spacePayload, campusPayload] = await Promise.all([
      CampusApp.loadJson("data/spaces.json", validateSpaces),
      CampusApp.loadJson("data/campus.json", validateCampus)
    ]);
    renderMetrics(spacePayload.spaces);
    renderNotices(campusPayload);
    const modeText = CampusApp.stateMode === "empty" ? "已进入空数据演示状态，页面没有填充假结果。" : "本地 JSON 读取成功，概览已经更新。";
    CampusApp.setStatus("homeStatus", modeText, CampusApp.stateMode === "empty" ? "warning" : "success");
  } catch (error) {
    console.warn("首页数据读取失败：", error.message);
    renderMetrics([]);
    renderNotices({ announcements: [], updated: "暂无" });
    CampusApp.setStatus("homeStatus", `数据暂时不可用：${error.message}。请确认已通过本地 Web 服务器打开页面。`, "error");
  }
});

function renderMetrics(spaces) {
  const open = spaces.filter((item) => item.status === "开放");
  const seats = open.reduce((sum, item) => sum + Number(item.seats || 0), 0);
  const occupied = open.reduce((sum, item) => sum + Number(item.occupied || 0), 0);
  const tasks = CampusApp.storageRead("final-study-plans", []);
  document.getElementById("metricOpen").textContent = open.length;
  document.getElementById("metricAvailable").textContent = Math.max(0, seats - occupied);
  document.getElementById("metricRate").textContent = seats ? Math.round((occupied / seats) * 100) : 0;
  document.getElementById("metricPending").textContent = Array.isArray(tasks) ? tasks.filter((task) => !task.done).length : 0;
}

function renderNotices(payload) {
  const host = document.getElementById("noticeList");
  host.replaceChildren();
  document.getElementById("dataUpdated").textContent = `数据更新时间：${payload.updated || "暂无"}`;
  if (!payload.announcements.length) {
    host.innerHTML = '<div class="col-12"><div class="empty-state">当前没有公告数据。</div></div>';
    return;
  }
  payload.announcements.forEach((notice) => {
    const column = document.createElement("div");
    column.className = "col-md-4";
    column.innerHTML = `<article class="notice-card"><div class="notice-meta"><span class="notice-level">${CampusApp.escapeText(notice.level)}</span><time>${CampusApp.escapeText(notice.date)}</time></div><h3>${CampusApp.escapeText(notice.title)}</h3><p>${CampusApp.escapeText(notice.detail)}</p></article>`;
    host.append(column);
  });
}

