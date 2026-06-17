# 博客使用指南

## 问题修复

- **admin.js**: 保存文章时自动下载 `articles.json`
- **app.js**: 修复所有模板字符串语法错误
- **update_articles.bat**: 一键更新脚本

## 添加文章流程（三步完成）

### 第一步：在后台创建文章
1. 打开 `docs/admin/admin.html`
2. 密码登录（默认: `admin123`）
3. 填写文章信息，点击"保存"
4. 浏览器自动下载 `articles.json`

### 第二步：运行一键更新脚本
双击项目根目录的 **`update_articles.bat`**
- 自动从下载文件夹找到 `articles.json`
- 复制到 `docs/data/`
- 自动 git commit + push

### 第三步：等待刷新
GitHub Pages 通常 1-2 分钟自动更新

## 手动更新（如果脚本失败）
```
copy %USERPROFILE%\Downloadsrticles.json docs\datagit add docs\datarticles.json
git commit -m "更新文章"
git push
```

## 后台管理
- URL: `docs/admin/admin.html`
- 默认密码: `admin123`
- 可在设置中修改密码
- 支持新建/编辑/删除/导入文章
