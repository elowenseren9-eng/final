# GitHub 推送步骤

本地仓库名（文件夹名）是 **`final-project`**，路径为：

```text
D:\各科作业\软件开发\final-project
```

本地提交已经做好。你可以在 GitHub 新建一个空仓库，建议名称也用 `final-project`。新仓库不要勾选自动创建 README、`.gitignore` 或 License，避免第一次推送发生无关冲突。

在本地仓库文件夹打开 PowerShell，依次运行：

```powershell
git status
git log --oneline --decorate --graph --all
git remote add origin https://github.com/你的用户名/final-project.git
git push -u origin main
```

如果之前已经添加过 origin，不要重复执行 `git remote add`，先运行：

```powershell
git remote -v
```

地址不对时再运行：

```powershell
git remote set-url origin https://github.com/你的用户名/final-project.git
git push -u origin main
```

推送后刷新 GitHub 页面，确认能看到 `index.html`、`spaces.html`、`plans.html`、`insights.html`、`campus.html` 和 `docs/`。最后把真实仓库地址填进 Word 报告第六部分。

