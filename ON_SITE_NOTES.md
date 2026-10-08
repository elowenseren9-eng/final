# 现场抽查速记

## 先记住数据流

1. 页面加载后，页面脚本调用 `CampusApp.loadJson()`。
2. `common.js` 用 `fetch()` 读取 `data/spaces.json` 或 `data/campus.json`，并执行字段检查。
3. 读取成功后保存到当前页面的状态对象，再调用 `render...()` 生成卡片、表格、图表或三维模型。
4. 收藏、自定义空间和学习计划不写回 JSON，而是存进浏览器 `localStorage`。
5. 失败时进入 catch 分支，页面显示可读错误；`?state=` 参数是为了现场演示异常流程。

## 可能被问到的函数

- `assets/js/common.js` 的 `loadJson()`：统一处理 fetch、HTTP 状态、空数据和模拟错误。
- `assets/js/spaces.js` 的 `renderSpaces()`：把关键词、楼宇、状态、空位、收藏五个条件合在一次筛选里。
- `saveCustomSpace()`：先检查输入，再根据有没有 `editingId` 决定新增还是修改。
- `assets/js/plans.js` 的 `renderPlans()`：排序、按状态筛选，并计算完成率。
- `assets/js/insights.js` 的 `renderCharts()`：从同一份 JSON 生成折线、环形和柱状三种 ECharts 配置。
- `assets/js/campus.js` 的 `pickLandmark()`：把鼠标坐标转换成 Three.js 标准坐标，用 Raycaster 找到被点中的模型。

## 能现场改的小地方

- 改主题色：`assets/css/app.css` 顶部 `--brand`、`--accent`。
- 增加一条空间：编辑 `data/spaces.json` 的 `spaces` 数组，注意逗号和必填字段。
- 改卡片排列：修改 `.space-grid` 的 `grid-template-columns`。
- 增加筛选条件：在 `spaces.html` 增加输入控件，在 `renderSpaces()` 的 return 条件中加入判断。
- 改图表类型：`insights.js` 的 `series.type`，同时考虑数据结构是否适合。
- 调整三维建筑位置：`data/campus.json` 中地标的 `x`、`z`；高度是 `height`。

## 容易答错的点

- 这些座位、到访人次不是学校实时数据，要明确说是教学演示数据。
- 直接双击 HTML 可能读不到 JSON，所以使用本地 Web 服务器。
- `defer` 不是让文件下载速度变快，而是减少脚本阻塞 HTML 解析。
- Canvas 图表和 3D 场景都有页面文字说明；颜色不是唯一的信息表达方式。
- GitHub 推送和全屏截图要由本人完成，报告中相关位置不能提前写成已完成。

