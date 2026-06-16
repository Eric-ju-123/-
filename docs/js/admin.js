// ===== Blog Admin Application =====
(function() {
  'use strict';

  // ===== Configuration =====
  const CONFIG = {
    DATA_URL: '../data/articles.json',
    SETTINGS_KEY: 'blog-settings',
    PASSWORD_KEY: 'blog-admin-pass',
    DEFAULT_PASS: 'admin123',
    CATEGORIES: ['技术', '生活', '旅行', '阅读', '商业']
  };

  // ===== Auth Manager =====
  const Auth = {
    init() {
      const stored = localStorage.getItem(CONFIG.PASSWORD_KEY);
      if (!stored) localStorage.setItem(CONFIG.PASSWORD_KEY, CONFIG.DEFAULT_PASS);
      this.checkSession();
    },

    checkSession() {
      if (sessionStorage.getItem('admin-logged')) {
        this.showDashboard();
      } else {
        this.showLogin();
      }
    },

    login(password) {
      const stored = localStorage.getItem(CONFIG.PASSWORD_KEY);
      if (password === stored) {
        sessionStorage.setItem('admin-logged', '1');
        this.showDashboard();
        return true;
      }
      return false;
    },

    logout() {
      sessionStorage.removeItem('admin-logged');
      window.location.reload();
    },

    showLogin() {
      document.getElementById('loginPage').style.display = 'block';
      document.getElementById('dashboard').style.display = 'none';
    },

    showDashboard() {
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('dashboard').style.display = 'flex';
    }
  };

  // ===== Data Store =====
  const Store = {
    articles: [],
    settings: null,

    async load() {
      try {
        const res = await fetch(CONFIG.DATA_URL);
        this.articles = await res.json();
        this.settings = JSON.parse(localStorage.getItem(CONFIG.SETTINGS_KEY)) || this.getDefaultSettings();
      } catch (e) {
        console.error('Failed to load data:', e);
        this.articles = [];
        this.settings = this.getDefaultSettings();
      }
    },

    async save() {
      try {
        const res = await fetch(CONFIG.DATA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.articles, null, 2)
        });
        if (res.ok) {
          toast('文章数据已保存', 'success');
        } else {
          toast('保存失败：无法写入远程文件', 'error');
        }
      } catch (e) {
        toast('保存失败：' + e.message, 'error');
        // Fallback: save to localStorage
        localStorage.setItem('blog-articles-backup', JSON.stringify(this.articles));
        toast('已保存到浏览器本地存储', 'warning');
      }
    },

    getDefaultSettings() {
      return {
        accentColor: '#6366f1',
        themeMode: 'auto',
        cardsPerPage: 12,
        siteTitle: "Eric's Blog",
        siteDesc: '探索 · 学习 · 分享',
        author: 'Eric',
        github: 'https://github.com/Eric-ju-123',
        email: ''
      };
    }
  };

  // ===== Toast Notifications =====
  function toast(msg, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const t = document.createElement('div');
    t.className = 	oast ;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ===== Page Router =====
  const Router = {
    init() {
      document.querySelectorAll('.nav-item[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const page = link.dataset.page;
          this.navigateTo(page);
        });
      });
    },

    navigateTo(page) {
      // Update nav
      document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.remove('active'));
      document.querySelector(.nav-item[data-page=""])?.classList.add('active');

      // Update page
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(page-)?.classList.add('active');

      // Update title
      const titles = { articles: '文章管理', editor: '新建文章', settings: '网站设置' };
      document.getElementById('pageTitle').textContent = titles[page] || '管理后台';

      // Refresh data
      if (page === 'articles') ArticlesList.refresh();
      if (page === 'settings') SettingsPage.load();
    }
  };

  // ===== Articles List =====
  const ArticlesList = {
    search: '',
    category: 'all',

    init() {
      document.getElementById('adminSearch').addEventListener('input', (e) => {
        this.search = e.target.value;
        this.refresh();
      });

      document.getElementById('adminCategoryFilter').addEventListener('change', (e) => {
        this.category = e.target.value;
        this.refresh();
      });

      document.getElementById('newArticleBtn').addEventListener('click', () => Editor.openNew());
      document.getElementById('exportBtn').addEventListener('click', () => DataIO.exportJSON());
      document.getElementById('importFile').addEventListener('change', (e) => DataIO.importJSON(e));

      this.refresh();
    },

    refresh() {
      let filtered = Store.articles.filter(a => {
        const matchSearch = !this.search ||
          a.title.toLowerCase().includes(this.search.toLowerCase()) ||
          a.tags.some(t => t.toLowerCase().includes(this.search.toLowerCase()));
        const matchCat = this.category === 'all' || a.category === this.category;
        return matchSearch && matchCat;
      });

      // Sort by date descending
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

      this.renderTable(filtered);
      this.updateStats();
    },

    renderTable(articles) {
      const tbody = document.getElementById('articlesTableBody');
      if (articles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">暂无文章</td></tr>';
        return;
      }

      tbody.innerHTML = articles.map(a => 
        <tr data-id="">
          <td class="article-title-cell"></td>
          <td><span class="category-badge"></span></td>
          <td></td>
          <td> 分钟</td>
          <td>
            <div class="action-btns">
              <button class="action-btn" onclick="Editor.open()">编辑</button>
              <button class="action-btn delete" onclick="ArticlesList.delete()">删除</button>
            </div>
          </td>
        </tr>
      ).join('');
    },

    updateStats() {
      const cats = new Set(Store.articles.map(a => a.category));
      const tags = new Set();
      Store.articles.forEach(a => a.tags.forEach(t => tags.add(t)));

      document.getElementById('statTotal').textContent = Store.articles.length;
      document.getElementById('statCategories').textContent = cats.size;
      document.getElementById('statReadTime').textContent = Store.articles.reduce((s, a) => s + (a.readTime || 0), 0);
      document.getElementById('statTags').textContent = tags.size;
    },

    delete(id) {
      if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) return;
      Store.articles = Store.articles.filter(a => a.id !== id);
      Store.save().then(() => this.refresh());
    },

    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  };

  // ===== Article Editor =====
  const Editor = {
    isEdit: false,

    open(id = null) {
      Router.navigateTo('editor');
      this.isEdit = !!id;

      // Clear form if new
      if (!id) {
        document.getElementById('editId').value = '';
        document.getElementById('articleTitle').value = '';
        document.getElementById('articleSlug').value = '';
        document.getElementById('articleCategory').value = '';
        document.getElementById('articleDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('articleTags').value = '';
        document.getElementById('articleReadTime').value = 5;
        document.getElementById('articleCover').value = '';
        document.getElementById('articleExcerpt').value = '';
        document.getElementById('articleContent').value = '';
        return;
      }

      // Fill form with article data
      const article = Store.articles.find(a => a.id === id);
      if (!article) return;

      document.getElementById('editId').value = id;
      document.getElementById('articleTitle').value = article.title;
      document.getElementById('articleSlug').value = article.slug;
      document.getElementById('articleCategory').value = article.category;
      document.getElementById('articleDate').value = article.date;
      document.getElementById('articleTags').value = article.tags.join(', ');
      document.getElementById('articleReadTime').value = article.readTime || 5;
      document.getElementById('articleCover').value = article.cover || '';
      document.getElementById('articleExcerpt').value = article.excerpt;
      document.getElementById('articleContent').value = article.content;
    },

    openNew() {
      this.open(null);
    },

    save(e) {
      e.preventDefault();

      const data = {
        id: this.isEdit ? parseInt(document.getElementById('editId').value) : (Store.articles.length ? Math.max(...Store.articles.map(a => a.id)) + 1 : 1),
        title: document.getElementById('articleTitle').value.trim(),
        slug: document.getElementById('articleSlug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
        category: document.getElementById('articleCategory').value.trim(),
        date: document.getElementById('articleDate').value || new Date().toISOString().split('T')[0],
        tags: document.getElementById('articleTags').value.split(/[,，]/).map(t => t.trim()).filter(Boolean),
        readTime: parseInt(document.getElementById('articleReadTime').value) || 5,
        cover: document.getElementById('articleCover').value.trim() || https://picsum.photos/seed//800/400,
        excerpt: document.getElementById('articleExcerpt').value.trim(),
        content: document.getElementById('articleContent').value.trim()
      };

      if (this.isEdit) {
        const idx = Store.articles.findIndex(a => a.id === data.id);
        if (idx !== -1) Store.articles[idx] = data;
      } else {
        Store.articles.push(data);
      }

      Store.save().then(() => {
        Router.navigateTo('articles');
      });
    },

    preview() {
      const title = document.getElementById('articleTitle').value;
      const content = document.getElementById('articleContent').value;
      const previewWin = window.open('', '_blank');
      const html = <!DOCTYPE html><html><head><meta charset="UTF-8"><title>预览</title>
        <style>body{font-family:'Noto Sans SC',sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.8;}
        h1{font-size:2rem;margin-bottom:20px;}</style></head>
        <body><h1></h1></body></html>;
      previewWin.document.write(html);
      previewWin.document.close();
    }
  };

  // ===== Data Import/Export =====
  const DataIO = {
    exportJSON() {
      const data = JSON.stringify(Store.articles, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = log-articles-.json;
      a.click();
      URL.revokeObjectURL(url);
      toast('数据已导出', 'success');
    },

    importJSON(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (!Array.isArray(imported)) throw new Error('格式错误');

          // Merge or replace
          const maxId = imported.length ? Math.max(...imported.map(i => i.id)) : 0;
          Store.articles = imported;

          // Re-save with new IDs
          Store.save().then(() => {
            toast(成功导入  篇文章, 'success');
            Router.navigateTo('articles');
          });
        } catch (err) {
          toast('导入失败：文件格式错误', 'error');
        }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset input
    }
  };

  // ===== Settings Page =====
  const SettingsPage = {
    load() {
      if (!Store.settings) return;
      const s = Store.settings;
      document.getElementById('settingAccentColor').value = s.accentColor || '#6366f1';
      document.getElementById('settingThemeMode').value = s.themeMode || 'auto';
      document.getElementById('settingCardsPerPage').value = s.cardsPerPage || 12;
      document.getElementById('settingSiteTitle').value = s.siteTitle || "Eric's Blog";
      document.getElementById('settingSiteDesc').value = s.siteDesc || '';
      document.getElementById('settingAuthor').value = s.author || '';
      document.getElementById('settingGithub').value = s.github || '';
      document.getElementById('settingEmail').value = s.email || '';
    },

    save() {
      const newPass = document.getElementById('settingNewPassword').value;
      const confirmPass = document.getElementById('settingConfirmPassword').value;

      if (newPass && newPass !== confirmPass) {
        toast('两次密码输入不一致', 'error');
        return;
      }

      if (newPass) {
        localStorage.setItem(CONFIG.PASSWORD_KEY, newPass);
        toast('密码已修改', 'success');
      }

      Store.settings = {
        accentColor: document.getElementById('settingAccentColor').value,
        themeMode: document.getElementById('settingThemeMode').value,
        cardsPerPage: parseInt(document.getElementById('settingCardsPerPage').value),
        siteTitle: document.getElementById('settingSiteTitle').value,
        siteDesc: document.getElementById('settingSiteDesc').value,
        author: document.getElementById('settingAuthor').value,
        github: document.getElementById('settingGithub').value,
        email: document.getElementById('settingEmail').value
      };

      localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify(Store.settings));
      toast('设置已保存', 'success');
    },

    reset() {
      if (!confirm('确定要重置所有设置吗？')) return;
      Store.settings = Store.getDefaultSettings();
      localStorage.removeItem(CONFIG.SETTINGS_KEY);
      this.load();
      toast('设置已重置', 'warning');
    }
  };

  // ===== Toolbar Actions =====
  const Toolbar = {
    init() {
      document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          const textarea = document.getElementById('articleContent');
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const selected = textarea.value.substring(start, end);

          let insert = '';
          let cursorOffset = 0;

          switch (action) {
            case 'h2': insert = \n## \n; break;
            case 'h3': insert = \n### \n; break;
            case 'bold': insert = ****; cursorOffset = selected ? 0 : -2; break;
            case 'italic': insert = **; cursorOffset = selected ? 0 : -2; break;
            case 'ul': insert = \n- \n; break;
            case 'ol': insert = \n1. \n; break;
            case 'code': insert = \${selected || '代码'}\`; cursorOffset = selected ? 0 : -2; break;
            case 'pre': insert = \n\\\\n\n\\\\n; break;
            case 'link': insert = [](url); cursorOffset = -1; break;
            case 'quote': insert = \n> \n; break;
          }

          textarea.value = textarea.value.substring(0, start) + insert + textarea.value.substring(end);
          const newCursor = start + insert.length + cursorOffset;
          textarea.setSelectionRange(newCursor, newCursor);
          textarea.focus();
        });
      });
    }
  };

  // ===== Initialize =====
  function init() {
    Auth.init();

    // Login form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const pass = document.getElementById('password').value;
      if (!Auth.login(pass)) {
        toast('密码错误，请重试', 'error');
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
      }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());

    // Router
    Router.init();

    // Editor form
    document.getElementById('articleForm').addEventListener('submit', (e) => Editor.save(e));
    document.getElementById('cancelEditBtn').addEventListener('click', () => Router.navigateTo('articles'));
    document.getElementById('previewBtn').addEventListener('click', () => Editor.preview());

    // Settings
    document.getElementById('saveSettingsBtn').addEventListener('click', () => SettingsPage.save());
    document.getElementById('resetSettingsBtn').addEventListener('click', () => SettingsPage.reset());

    // Populate category filter
    const filterSelect = document.getElementById('adminCategoryFilter');
    const cats = new Set(Store.CATEGORIES);
    Store.articles.forEach(a => cats.add(a.category));
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      filterSelect.appendChild(opt);
    });

    // Populate datalist
    const datalist = document.getElementById('categoryList');
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      datalist.appendChild(opt);
    });

    // Toolbar
    Toolbar.init();

    // Load data
    Store.load().then(() => {
      ArticlesList.refresh();
      ArticlesList.init();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
