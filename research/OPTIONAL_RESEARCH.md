# 选做研究记录

## 1. Lighthouse 无障碍检查

我先保留了一个专门的“修正前实验快照” `accessibility-before.html`，用它复现几个常见问题：页面缺少语言声明、图片没有替代文本、搜索框没有关联标签、收藏按钮只有星号、标题从 h1 跳到 h3、说明文字对比度偏低。这个页面只用于实验，不是正式入口。

对应的 `accessibility-after.html` 做了六处调整：补 `lang="zh-CN"`、补图片 `alt`、使用 `label for`、给按钮明确名称和 `aria-pressed`、把标题改成连续的 h1/h2、提高文字颜色对比度。Lighthouse 13.5.0 实测结果如下：

| 页面 | Accessibility | Performance | Best Practices |
| --- | ---: | ---: | ---: |
| 修正前实验页 | 68 | 100 | 96 |
| 修正后实验页 | 100 | 100 | 96 |
| 最终项目首页 | 100 | 90 | 100 |

正式首页第一次检查是 96 分，原因是浅绿色区块中的灰字对比度只有 4.49:1，刚好低于 4.5:1。我把全局次要文字色从 `#5f746e` 调深为 `#526c64`，再次检查后无障碍分数变为 100。原始 JSON 报告保存在 `research/results/lighthouse-*.json`。

## 2. 普通脚本与 defer 加载对比

实验页加载同一组本地 jQuery、ECharts 和 Three.js。`loading-blocking.html` 把普通 `<script>` 放在 `head`，`loading-defer.html` 给脚本加 `defer`。测试条件为 Chrome headless、禁用缓存、40 ms 延迟、约 2.56 Mbps 下载速度，每个页面运行 3 次取中位数。

| 策略 | DOM 可交互中位数 | DOMContentLoaded 中位数 | load 中位数 |
| --- | ---: | ---: | ---: |
| 普通阻塞脚本 | 5810.6 ms | 5811.0 ms | 5811.4 ms |
| defer | 82.5 ms | 5875.1 ms | 5875.3 ms |

`defer` 让 HTML 先完成解析，DOM 可交互时间提前约 5728.1 ms，改善约 98.6%。DOMContentLoaded 没有提前，是因为 defer 脚本仍要在该事件前按顺序执行。正式页面把脚本放在 `body` 末尾并使用 `defer`，依赖顺序固定为第三方库、`common.js`、页面脚本。原始数据见 `research/results/loading-measurement.json`。

## 3. W3C HTML 验证

第一次检查发现两处：主页给普通 `div` 使用了 `aria-label` 但没有相应角色；三维页的场景 `section` 没有合格标题。处理方式是给概览容器补 `role="group"`，并把场景说明改成真正的 h2 标题。

再次通过 Nu HTML Checker 验证：

- `index.html`：0 error、0 warning
- `spaces.html`：0 error、0 warning
- `plans.html`：0 error、0 warning
- `insights.html`：0 error、0 warning
- `campus.html`：0 error、0 warning

最终响应保存在 `research/results/w3c-*.json`。

## 结论

这三项检查对最终项目确实有用：Lighthouse 找到了肉眼不容易注意到的临界对比度问题；加载实验说明 defer 改善的是解析过程，不代表所有资源更快下载；W3C 验证则帮我改正了 ARIA 和语义结构。以后我会先保证标签和结构正确，再用工具检查，而不是最后只看一个总分。

