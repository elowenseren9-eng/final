"use strict";

const spaceState = {
  base: [],
  custom: [],
  favorites: new Set()
};

document.addEventListener("DOMContentLoaded", () => {
  readSpaceState();
  bindSpaceInterface();
  loadSpaces();
});

function readSpaceState() {
  const custom = CampusApp.storageRead("final-custom-spaces", []);
  const favorites = CampusApp.storageRead("final-favorite-spaces", []);
  spaceState.custom = Array.isArray(custom) ? custom : [];
  spaceState.favorites = new Set(Array.isArray(favorites) ? favorites : []);
}

function bindSpaceInterface() {
  ["keyword", "buildingFilter", "statusFilter", "seatNeed", "favoriteOnly"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderSpaces);
  });
  document.getElementById("resetFilters").addEventListener("click", () => {
    document.getElementById("keyword").value = "";
    document.getElementById("buildingFilter").value = "all";
    document.getElementById("statusFilter").value = "all";
    document.getElementById("seatNeed").value = "0";
    document.getElementById("favoriteOnly").checked = false;
    renderSpaces();
  });
  document.getElementById("spaceForm").addEventListener("submit", saveCustomSpace);
  document.getElementById("cancelEdit").addEventListener("click", resetSpaceForm);
}

async function loadSpaces() {
  try {
    const payload = await CampusApp.loadJson("data/spaces.json", (data) => {
      if (!data || !Array.isArray(data.spaces)) throw new Error("spaces.json 缺少 spaces 数组");
      data.spaces.forEach((space) => {
        if (!space.id || !space.name || !Number.isFinite(Number(space.seats))) throw new Error("空间记录的必填字段不完整");
      });
      return data;
    });
    spaceState.base = payload.spaces;
    fillBuildingFilter();
    renderSpaces();
    const message = CampusApp.stateMode === "empty" ? "空数据状态已启用；仍可显示自己新增的本地空间。" : `读取成功：${payload.source}。`;
    CampusApp.setStatus("spaceStatusMessage", message, CampusApp.stateMode === "empty" ? "warning" : "success");
  } catch (error) {
    console.warn("空间数据读取失败：", error.message);
    spaceState.base = [];
    fillBuildingFilter();
    renderSpaces();
    CampusApp.setStatus("spaceStatusMessage", `读取失败：${error.message}。请检查本地服务器和 data/spaces.json。自定义空间仍可使用。`, "error");
  }
}

function allSpaces() {
  return [...spaceState.base, ...spaceState.custom];
}

function fillBuildingFilter() {
  const select = document.getElementById("buildingFilter");
  const current = select.value;
  select.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());
  [...new Set(allSpaces().map((space) => space.building))].sort((a, b) => a.localeCompare(b, "zh-CN")).forEach((building) => {
    const option = document.createElement("option");
    option.value = building;
    option.textContent = building;
    select.append(option);
  });
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function renderSpaces() {
  const keyword = document.getElementById("keyword").value.trim().toLowerCase();
  const building = document.getElementById("buildingFilter").value;
  const status = document.getElementById("statusFilter").value;
  const seatNeed = Math.max(0, Number(document.getElementById("seatNeed").value) || 0);
  const favoriteOnly = document.getElementById("favoriteOnly").checked;
  const filtered = allSpaces().filter((space) => {
    const searchable = `${space.name} ${space.building} ${(space.features || []).join(" ")}`.toLowerCase();
    const available = Math.max(0, Number(space.seats) - Number(space.occupied));
    return (!keyword || searchable.includes(keyword)) && (building === "all" || space.building === building) && (status === "all" || space.status === status) && available >= seatNeed && (!favoriteOnly || spaceState.favorites.has(space.id));
  });

  const host = document.getElementById("spaceList");
  host.replaceChildren();
  document.getElementById("spaceResult").textContent = `共找到 ${filtered.length} 个空间，其中 ${spaceState.custom.length} 个是本地自定义记录。`;
  if (!filtered.length) {
    host.innerHTML = '<div class="empty-state"><strong>没有符合条件的空间。</strong><br>可以放宽筛选条件，或新增一条自己的空间记录。</div>';
    return;
  }
  filtered.forEach((space) => host.append(createSpaceCard(space)));
}

function createSpaceCard(space) {
  const available = Math.max(0, Number(space.seats) - Number(space.occupied));
  const ratio = Number(space.seats) ? Math.round((Number(space.occupied) / Number(space.seats)) * 100) : 0;
  const isCustom = Boolean(space.custom);
  const article = document.createElement("article");
  article.className = "space-card";
  article.innerHTML = `
    <div class="space-card-top"><div><span class="status-chip ${space.status === "开放" ? "status-open" : "status-closed"}">${CampusApp.escapeText(space.status)}</span>${isCustom ? ' <span class="custom-badge">自定义</span>' : ""}<h3>${CampusApp.escapeText(space.name)}</h3><p>${CampusApp.escapeText(space.building)} · ${CampusApp.escapeText(space.floor)} 楼 · ${CampusApp.escapeText(space.hours)}</p></div><strong class="availability">${available} 空位</strong></div>
    <div class="tag-list">${(space.features || []).map((item) => `<span class="tag">${CampusApp.escapeText(item)}</span>`).join("")}<span class="tag">安静度 ${CampusApp.escapeText(space.quiet)}/5</span></div>
    <div class="seat-meter" role="progressbar" aria-label="${CampusApp.escapeText(space.name)}座位使用率" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ratio}"><span style="width:${Math.min(100, ratio)}%"></span></div>
    <small class="result-meta mt-1">已使用 ${ratio}%（${CampusApp.escapeText(space.occupied)}/${CampusApp.escapeText(space.seats)}）</small>`;
  const actions = document.createElement("div");
  actions.className = "space-actions";
  const favorite = document.createElement("button");
  favorite.type = "button";
  favorite.className = `btn btn-sm ${spaceState.favorites.has(space.id) ? "btn-brand" : "btn-outline-brand"}`;
  favorite.textContent = spaceState.favorites.has(space.id) ? "★ 已收藏" : "☆ 收藏";
  favorite.setAttribute("aria-pressed", String(spaceState.favorites.has(space.id)));
  favorite.addEventListener("click", () => toggleFavorite(space.id));
  actions.append(favorite);
  if (isCustom) {
    const edit = document.createElement("button"); edit.type = "button"; edit.className = "btn btn-sm btn-outline-secondary"; edit.textContent = "编辑"; edit.addEventListener("click", () => editCustomSpace(space.id));
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "btn btn-sm btn-outline-danger"; remove.textContent = "删除"; remove.addEventListener("click", () => deleteCustomSpace(space.id));
    actions.append(edit, remove);
  }
  article.append(actions);
  return article;
}

function toggleFavorite(id) {
  if (spaceState.favorites.has(id)) spaceState.favorites.delete(id); else spaceState.favorites.add(id);
  CampusApp.storageWrite("final-favorite-spaces", [...spaceState.favorites]);
  renderSpaces();
}

function saveCustomSpace(event) {
  event.preventDefault();
  const name = document.getElementById("spaceName").value.trim();
  const building = document.getElementById("spaceBuilding").value.trim();
  const floor = Number(document.getElementById("spaceFloor").value);
  const seats = Number(document.getElementById("spaceSeats").value);
  const occupied = Number(document.getElementById("spaceOccupied").value);
  const hours = document.getElementById("spaceHours").value.trim();
  const error = document.getElementById("spaceFormError");
  error.textContent = "";
  if (name.length < 2 || !building || !hours || !Number.isInteger(floor) || !Number.isInteger(seats) || seats < 1 || !Number.isInteger(occupied) || occupied < 0) {
    error.textContent = "请完整填写名称、楼宇、楼层、座位和开放时间；座位数必须是正整数。";
    return;
  }
  if (occupied > seats) {
    error.textContent = "已占用座位不能大于总座位。";
    document.getElementById("spaceOccupied").focus();
    return;
  }
  const editingId = document.getElementById("editingId").value;
  const record = {
    id: editingId || `custom-${Date.now()}`,
    name, building, floor, seats, occupied,
    status: document.getElementById("spaceOpenStatus").value,
    hours,
    features: document.getElementById("spaceFeatures").value.split(/[,，]/).map((item) => item.trim()).filter(Boolean).slice(0, 6),
    quiet: Number(document.getElementById("spaceQuiet").value),
    custom: true
  };
  if (editingId) spaceState.custom = spaceState.custom.map((item) => item.id === editingId ? record : item);
  else spaceState.custom.unshift(record);
  CampusApp.storageWrite("final-custom-spaces", spaceState.custom);
  fillBuildingFilter();
  resetSpaceForm();
  renderSpaces();
  CampusApp.setStatus("spaceStatusMessage", `${editingId ? "修改" : "新增"}成功：${record.name} 已保存在当前浏览器。`, "success");
}

function editCustomSpace(id) {
  const item = spaceState.custom.find((space) => space.id === id);
  if (!item) return;
  document.getElementById("editingId").value = item.id;
  document.getElementById("spaceName").value = item.name;
  document.getElementById("spaceBuilding").value = item.building;
  document.getElementById("spaceFloor").value = item.floor;
  document.getElementById("spaceSeats").value = item.seats;
  document.getElementById("spaceOccupied").value = item.occupied;
  document.getElementById("spaceOpenStatus").value = item.status;
  document.getElementById("spaceQuiet").value = item.quiet;
  document.getElementById("spaceHours").value = item.hours;
  document.getElementById("spaceFeatures").value = (item.features || []).join(", ");
  document.getElementById("editorTitle").textContent = "修改自定义空间";
  bootstrap.Collapse.getOrCreateInstance(document.getElementById("spaceEditor")).show();
  document.getElementById("spaceName").focus();
}

function deleteCustomSpace(id) {
  const item = spaceState.custom.find((space) => space.id === id);
  if (!item || !window.confirm(`确定删除“${item.name}”吗？`)) return;
  spaceState.custom = spaceState.custom.filter((space) => space.id !== id);
  spaceState.favorites.delete(id);
  CampusApp.storageWrite("final-custom-spaces", spaceState.custom);
  CampusApp.storageWrite("final-favorite-spaces", [...spaceState.favorites]);
  fillBuildingFilter();
  renderSpaces();
  CampusApp.setStatus("spaceStatusMessage", `已删除自定义空间：${item.name}。`, "success");
}

function resetSpaceForm() {
  document.getElementById("spaceForm").reset();
  document.getElementById("editingId").value = "";
  document.getElementById("spaceFloor").value = "1";
  document.getElementById("spaceSeats").value = "40";
  document.getElementById("spaceOccupied").value = "0";
  document.getElementById("spaceHours").value = "08:00-22:00";
  document.getElementById("spaceQuiet").value = "3";
  document.getElementById("spaceFormError").textContent = "";
  document.getElementById("editorTitle").textContent = "新增自定义空间";
}

