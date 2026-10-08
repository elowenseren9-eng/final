"use strict";

const CampusApp = (() => {
  const stateMode = new URLSearchParams(window.location.search).get("state") || "normal";

  function storageRead(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed === null ? fallback : parsed;
    } catch (error) {
      console.warn(`本地记录 ${key} 无法解析，已使用默认值。`, error.message);
      return fallback;
    }
  }

  function storageWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`本地记录 ${key} 保存失败。`, error.message);
      return false;
    }
  }

  function setStatus(target, message, kind = "info") {
    const host = typeof target === "string" ? document.getElementById(target) : target;
    if (!host) return;
    host.textContent = message;
    host.dataset.kind = kind;
  }

  function escapeText(value) {
    const node = document.createElement("span");
    node.textContent = String(value ?? "");
    return node.innerHTML;
  }

  async function loadJson(url, validator) {
    if (stateMode === "offline") throw new Error("已通过地址参数模拟网络失败");
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (stateMode === "malformed") return validator({ unexpected: true });
    if (stateMode === "empty") {
      if (Array.isArray(payload.spaces)) payload.spaces = [];
      if (Array.isArray(payload.announcements)) payload.announcements = [];
      if (payload.weekFlow) payload.weekFlow.values = [];
      if (Array.isArray(payload.studyTypes)) payload.studyTypes = [];
      if (Array.isArray(payload.timeSlots)) payload.timeSlots = [];
      if (Array.isArray(payload.landmarks)) payload.landmarks = [];
    }
    return validator(payload);
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function initShell() {
    const page = document.body.dataset.page;
    document.querySelectorAll("[data-nav]").forEach((link) => {
      const active = link.dataset.nav === page;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
    });
    document.querySelectorAll("[data-current-year]").forEach((node) => { node.textContent = new Date().getFullYear(); });

    const savedTheme = localStorage.getItem("final-theme") || "day";
    document.documentElement.dataset.theme = savedTheme;
    const button = document.getElementById("themeToggle");
    const updateThemeLabel = () => {
      if (!button) return;
      button.textContent = document.documentElement.dataset.theme === "night" ? "☀ 日间" : "◐ 夜间";
      button.setAttribute("aria-pressed", String(document.documentElement.dataset.theme === "night"));
    };
    updateThemeLabel();
    button?.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "night" ? "day" : "night";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("final-theme", next);
      updateThemeLabel();
      window.dispatchEvent(new CustomEvent("themechange"));
    });
  }

  document.addEventListener("DOMContentLoaded", initShell);
  return { stateMode, storageRead, storageWrite, setStatus, escapeText, loadJson, downloadJson };
})();

