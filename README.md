# 云大学习空间助手

这是《软件开发综合实践》期末大作业的本地仓库。项目围绕“校园公共信息与数据展示中心”主题，帮助学生查询学习空间、安排学习计划、查看统计趋势并浏览三维校园地标。它是纯前端应用，不需要数据库或后端服务。

## 功能页面

- `index.html`：项目首页、数据概览和校园提醒。
- `spaces.html`：空间搜索、楼宇/状态/空位筛选、收藏，以及自定义空间的新增、修改、删除。
- `plans.html`：学习计划的新增、修改、完成、删除、筛选、JSON 导出和导入。
- `insights.html`：一周趋势折线图、学习目的环形图、分时热度柱状图和数据核验表。
- `campus.html`：可旋转、缩放、点击选择的 Three.js 校园地标场景。

全部业务数据由 `data/*.json` 加载；收藏、自定义空间、学习计划和主题偏好保存在浏览器 `localStorage` 中。地址加入 `?state=empty`、`?state=malformed` 或 `?state=offline` 可以复现异常状态。

## 技术范围

- HTML5、CSS3、JavaScript
- Bootstrap 5.3.8、jQuery 3.7.1
- ECharts 5.6.0
- Three.js 0.128.0 + OrbitControls

所有第三方库均保存在 `libs/`，业务数据保存在 `data/`，不依赖 CDN。

## 本地运行

不能直接双击 HTML，因为浏览器通常会拦截 `file://` 页面读取 JSON。请在仓库根目录打开 PowerShell：

```powershell
python -m http.server 8098
```

然后访问 `http://127.0.0.1:8098/`。如果电脑只有 Python Launcher，也可以运行：

```powershell
py -m http.server 8098
```

关闭服务器时回到终端按 `Ctrl + C`。

## 从另一台电脑运行

```powershell
git clone <你的GitHub仓库地址>
cd final-project
python -m http.server 8098
```

打开 `http://127.0.0.1:8098/` 即可。若 8098 端口被占用，可改为 8080，并同步修改浏览器地址。

## 目录说明

```text
assets/      自定义 CSS、JavaScript 和原创 SVG
data/        本地 JSON 演示数据
libs/        Bootstrap、jQuery、ECharts、Three.js 本地文件
docs/        填写后的期末总结报告
research/    无障碍、脚本加载和 W3C 选做研究
qa/          质量检查说明
```

## 数据与素材说明

- 空间记录由课程统一自习室数据整理，补充字段仅用于课堂演示，不代表校园实时信息。
- 校园提醒、学习趋势、用途占比和时段热度为本项目的教学演示数据。
- `assets/img/logo.svg` 与 `assets/img/hero-campus.svg` 为本项目绘制的原创 SVG。
- Bootstrap、jQuery、ECharts、Three.js 和 OrbitControls 的版本写在 `libs/` 文件名中。

## 质量检查

- 375、768、1200 px 三种宽度下检查 5 个正式页面，无横向溢出、无控制台错误。
- 三类图表均能生成 Canvas，Three.js 场景能生成 WebGL Canvas。
- W3C Nu HTML Checker：5 个正式页面均为 0 error、0 warning。
- Lighthouse 最终首页：Accessibility 100、Best Practices 100、Performance 90（本地测试结果会受机器环境影响）。

详细结果见 [TESTING.md](TESTING.md)、[research/OPTIONAL_RESEARCH.md](research/OPTIONAL_RESEARCH.md) 和 [SCREENSHOT_CHECKLIST.md](SCREENSHOT_CHECKLIST.md)。

## 使用说明与诚信说明

本项目开发过程中使用了编程辅助工具帮助整理需求、生成部分初稿和运行自动化检查。我对代码结构、数据流和主要交互做了逐项检查；提交前还需要继续熟悉全部代码，以便完成教师的现场解释和修改。没有把演示数据写成真实校园统计，也没有伪造截图、同伴反馈或 GitHub 推送记录。


