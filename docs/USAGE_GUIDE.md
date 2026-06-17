# 博客使用指南

## 问题修复说明

之前后台管理的文章保存功能无法正常工作，原因是：
1. **GitHub Pages 是静态托管**，不支持通过 POST 请求写回 `articles.json` 文件
2. **app.js 模板字符串损坏**，导致前台页面 JavaScript 报错，文章无法正常渲染

## 已修复内容

### admin.js 修改
- 保存文章时自动下载更新后的 `articles.json` 文件
- 同时保存到浏览器 localStorage 作为备份
- 提示用户替换仓库文件并推送

### app.js 修复
- 修复了所有损坏的模板字符串（反引号丢失）
- 修复了 `createArticleCard` 方法中的链接跳转
- 修复了 `markdownToHtml` 中的正则表达式
- 修复了 `ArticlePage.render` 中的标题和元数据设置

## 使用流程

### 添加/编辑文章
1. 打开 `docs/admin/admin.html`
2. 输入密码登录（默认：`admin123`）
3. 点击"新建文章"或编辑已有文章
4. 填写标题、分类、标签、内容等信息
5. 点击"保存"按钮

### 保存后操作（重要！）
1. 浏览器会自动下载 `articles.json` 文件
2. 用下载的文件**替换** `docs/data/articles.json`
3. 在 Git 终端中执行：
   ```
   git add docs/data/articles.json
   git commit -m "更新博客文章数据"
   git push
   ```
4. GitHub Pages 会自动更新，前台网站即可看到新文章

### 登录密码
- 默认密码：`admin123`
- 可在后台"网站设置"中修改

## 文件结构
```
docs/
├── index.html          # 首页
├── article.html        # 文章详情页
├── admin/
│   └── admin.html      # 管理后台
├── js/
│   ├── app.js          # 前台脚本（已修复）
│   └── admin.js        # 后台脚本（已修复）
├── css/
│   ├── style.css       # 前台样式
│   └── admin.css       # 后台样式
└── data/
    └── articles.json   # 文章数据
