"use strict";

const planState = { items: [], filter: "all" };

document.addEventListener("DOMContentLoaded", () => {
  const saved = CampusApp.storageRead("final-study-plans", []);
  planState.items = Array.isArray(saved) ? saved : [];
  setDefaultPlanDate();
  bindPlanInterface();
  loadPlanPlaces();
  renderPlans();
});

function bindPlanInterface() {
  document.getElementById("planForm").addEventListener("submit", savePlan);
  document.getElementById("cancelPlanEdit").addEventListener("click", resetPlanForm);
  document.querySelectorAll("[data-plan-filter]").forEach((button) => button.addEventListener("click", () => {
    planState.filter = button.dataset.planFilter;
    document.querySelectorAll("[data-plan-filter]").forEach((item) => {
      item.classList.toggle("btn-brand", item === button);
      item.classList.toggle("btn-outline-brand", item !== button);
    });
    renderPlans();
  }));
  document.getElementById("exportPlans").addEventListener("click", () => {
    if (!planState.items.length) return CampusApp.setStatus("planStatus", "当前没有可导出的计划。", "warning");
    CampusApp.downloadJson("study-plans.json", { exportedAt: new Date().toISOString(), plans: planState.items });
    CampusApp.setStatus("planStatus", "计划已导出为 JSON 文件。", "success");
  });
  document.getElementById("importPlans").addEventListener("change", importPlans);
}

async function loadPlanPlaces() {
  try {
    const payload = await CampusApp.loadJson("data/spaces.json", (data) => {
      if (!data || !Array.isArray(data.spaces)) throw new Error("spaces 字段格式不正确");
      return data;
    });
    const custom = CampusApp.storageRead("final-custom-spaces", []);
    const places = [...payload.spaces, ...(Array.isArray(custom) ? custom : [])].filter((item) => item.status === "开放");
    const select = document.getElementById("planPlace");
    places.forEach((space) => {
      const option = document.createElement("option");
      option.value = space.name;
      option.textContent = space.name;
      select.append(option);
    });
  } catch (error) {
    console.warn("计划页地点数据读取失败：", error.message);
    CampusApp.setStatus("planStatus", `地点列表未能读取：${error.message}。不影响手动选择“待决定”和管理计划。`, "warning");
  }
}

function savePlan(event) {
  event.preventDefault();
  const title = document.getElementById("planTitle").value.trim();
  const date = document.getElementById("planDate").value;
  const minutes = Number(document.getElementById("planMinutes").value);
  const error = document.getElementById("planFormError");
  error.textContent = "";
  if (title.length < 2 || !date || !Number.isFinite(minutes) || minutes < 15 || minutes > 720) {
    error.textContent = "请填写至少 2 个字的计划内容、有效日期，以及 15—720 分钟的时长。";
    return;
  }
  const id = document.getElementById("planId").value;
  const old = planState.items.find((item) => String(item.id) === id);
  const record = {
    id: id || Date.now(),
    title,
    date,
    minutes,
    place: document.getElementById("planPlace").value,
    category: document.getElementById("planCategory").value,
    priority: document.getElementById("planPriority").value,
    note: document.getElementById("planNote").value.trim(),
    done: old?.done || false
  };
  if (id) planState.items = planState.items.map((item) => String(item.id) === id ? record : item);
  else planState.items.push(record);
  persistPlans();
  resetPlanForm();
  renderPlans();
  CampusApp.setStatus("planStatus", `${id ? "修改" : "新增"}成功：${record.title}。`, "success");
}

function renderPlans() {
  const host = document.getElementById("planList");
  host.replaceChildren();
  const sorted = [...planState.items].sort((a, b) => a.done - b.done || a.date.localeCompare(b.date));
  const filtered = sorted.filter((item) => planState.filter === "all" || (planState.filter === "done" ? item.done : !item.done));
  if (!filtered.length) {
    host.innerHTML = '<li class="empty-state"><strong>这个分组还没有计划。</strong><br>可以在左侧添加一项，或切换其他状态。</li>';
  } else {
    filtered.forEach((plan) => host.append(createPlanItem(plan)));
  }
  const done = planState.items.filter((item) => item.done).length;
  const pending = planState.items.length - done;
  const percent = planState.items.length ? Math.round(done / planState.items.length * 100) : 0;
  document.getElementById("planDone").textContent = done;
  document.getElementById("planPending").textContent = pending;
  document.getElementById("planProgress").style.width = `${percent}%`;
  document.querySelector(".progress").setAttribute("aria-valuenow", String(percent));
}

function createPlanItem(plan) {
  const item = document.createElement("li");
  item.className = "task-card";
  item.dataset.done = String(plan.done);
  const checkbox = document.createElement("input");
  checkbox.className = "form-check-input";
  checkbox.type = "checkbox";
  checkbox.checked = plan.done;
  checkbox.setAttribute("aria-label", `标记“${plan.title}”为${plan.done ? "未完成" : "已完成"}`);
  checkbox.addEventListener("change", () => {
    plan.done = checkbox.checked;
    persistPlans();
    renderPlans();
    CampusApp.setStatus("planStatus", `已将“${plan.title}”标记为${plan.done ? "完成" : "待完成"}。`, "success");
  });
  const content = document.createElement("div");
  content.innerHTML = `<span class="task-title">${CampusApp.escapeText(plan.title)}</span><span class="task-meta">${CampusApp.escapeText(plan.date)} · ${CampusApp.escapeText(plan.place)} · ${CampusApp.escapeText(plan.minutes)} 分钟 · ${CampusApp.escapeText(plan.category)} · ${CampusApp.escapeText(plan.priority)}</span>${plan.note ? `<span class="task-meta">备注：${CampusApp.escapeText(plan.note)}</span>` : ""}`;
  const actions = document.createElement("div");
  actions.className = "task-actions";
  const edit = document.createElement("button"); edit.type = "button"; edit.className = "btn btn-sm btn-outline-secondary"; edit.textContent = "编辑"; edit.addEventListener("click", () => startPlanEdit(plan.id));
  const remove = document.createElement("button"); remove.type = "button"; remove.className = "btn btn-sm btn-outline-danger"; remove.textContent = "删除"; remove.addEventListener("click", () => deletePlan(plan.id));
  actions.append(edit, remove);
  item.append(checkbox, content, actions);
  return item;
}

function startPlanEdit(id) {
  const plan = planState.items.find((item) => item.id === id);
  if (!plan) return;
  document.getElementById("planId").value = plan.id;
  document.getElementById("planTitle").value = plan.title;
  document.getElementById("planDate").value = plan.date;
  document.getElementById("planMinutes").value = plan.minutes;
  const place = document.getElementById("planPlace");
  if (![...place.options].some((option) => option.value === plan.place)) place.add(new Option(plan.place, plan.place));
  place.value = plan.place;
  document.getElementById("planCategory").value = plan.category;
  document.getElementById("planPriority").value = plan.priority;
  document.getElementById("planNote").value = plan.note || "";
  document.getElementById("planFormTitle").textContent = "修改计划";
  document.getElementById("planTitle").focus();
}

function deletePlan(id) {
  const plan = planState.items.find((item) => item.id === id);
  if (!plan || !window.confirm(`确定删除“${plan.title}”吗？`)) return;
  planState.items = planState.items.filter((item) => item.id !== id);
  persistPlans();
  renderPlans();
  CampusApp.setStatus("planStatus", `已删除：${plan.title}。`, "success");
}

async function importPlans(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (!payload || !Array.isArray(payload.plans)) throw new Error("文件中缺少 plans 数组");
    const valid = payload.plans.filter((item) => item && typeof item.title === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date || ""));
    if (!valid.length && payload.plans.length) throw new Error("没有符合格式的计划记录");
    planState.items = valid.map((item, index) => ({
      id: Date.now() + index, title: item.title.trim().slice(0, 40), date: item.date,
      minutes: Math.min(720, Math.max(15, Number(item.minutes) || 60)), place: String(item.place || "待决定").slice(0, 40),
      category: String(item.category || "其他"), priority: String(item.priority || "普通"), note: String(item.note || "").slice(0, 120), done: Boolean(item.done)
    }));
    persistPlans();
    renderPlans();
    CampusApp.setStatus("planStatus", `导入成功，共读取 ${valid.length} 项计划。`, "success");
  } catch (error) {
    CampusApp.setStatus("planStatus", `导入失败：${error.message}。请选择由本页面导出的 JSON 文件。`, "error");
  } finally {
    event.target.value = "";
  }
}

function persistPlans() { CampusApp.storageWrite("final-study-plans", planState.items); }

function resetPlanForm() {
  document.getElementById("planForm").reset();
  document.getElementById("planId").value = "";
  document.getElementById("planMinutes").value = "60";
  document.getElementById("planFormTitle").textContent = "添加一项计划";
  document.getElementById("planFormError").textContent = "";
  setDefaultPlanDate();
}

function setDefaultPlanDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  document.getElementById("planDate").value = date.toISOString().slice(0, 10);
}

