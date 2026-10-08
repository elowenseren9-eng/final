"use strict";
window.loadingProbe = { executedAt: performance.now(), dependenciesReady: Boolean(window.jQuery && window.echarts && window.THREE) };

