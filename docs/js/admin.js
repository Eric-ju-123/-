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

  // ===== Toast Notifications =====
  function toast(msg, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 3000);
  }

  // ===== Auth Manager =====
  const Auth = {
    init: function() {
      var stored = localStorage.getItem(CONFIG.PASSWORD_KEY);
      if (!stored) localStorage.setItem(CONFIG.PASSWORD_KEY, CONFIG.DEFAULT_PASS);
      this.checkSession();
    },
    checkSession: function() {
      if (sessionStorage.getItem('admin-logged')) {
        this.showDashboard();
      } else {
        this.showLogin();
      }
    },
    login: function(password) {
      var stored = localStorage.getItem(CONFIG.PASSWORD_KEY);
      if (password === stored) {
        sessionStorage.setItem('admin-logged', '1');
        this.showDashboard();
        return true;
      }
      return false;
    },
    logout: function() {
      sessionStorage.removeItem('admin-logged');
      window.location.reload();
    },
    showLogin: function() {
      document.getElementById('loginPage').style.display = 'block';
      document.getElementById('dashboard').style.display = 'none';
    },
    showDashboard: function() {
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
        // Try fetching from remote URL
        try {
          const res = await fetch(CONFIG.DATA_URL);
          if (res.ok) {
            this.articles = await res.json();
          } else {
            throw new Error('Fetch failed');
          }
        } catch(e) {
          // Fallback: try localStorage backup
          const backup = localStorage.getItem('blog-articles-backup');
          if (backup) {
            this.articles = JSON.parse(backup);
            console.log('Loaded from localStorage backup');
          } else {
            this.articles = [];
          }
        }
        this.settings = JSON.parse(localStorage.getItem(CONFIG.SETTINGS_KEY)) || this.getDefaultSettings();
      } catch (e) {
        console.error('Failed to load data:', e);
        this.articles = [];
        this.settings = this.getDefaultSettings();
      }
    },

    getDefaultSettings: function() {
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
    },

    async save() {
      try {
        const res = await fetch(CONFIG.DATA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.articles, null, 2)
        });
        if (res.ok) {
          toast('文章数据已保存到服务器', 'success');
        } else {
          throw new Error('Save failed');
        }
      } catch (e) {
        console.warn('Server save failed, saving to localStorage:', e.message);
        // Fallback: save to localStorage
        localStorage.setItem('blog-articles-backup', JSON.stringify(this.articles));
        toast('已保存到浏览器本地存储（GitHub Pages 不支持直接写入文件）', 'warning');
      }
    }
  };

  // ===== Page Router =====
  const Router = {
    init: function() {
      document.querySelectorAll('.nav-item[data-page]').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          var page = link.dataset.page;
          Router.navigateTo(page);
        });
      });
    },

    navigateTo: function(page) {
      document.querySelectorAll('.nav-item[data-page]').forEach(function(n) { n.classList.remove('active'); });
      var activeNav = document.querySelector('.nav-item[data-page="' + page + '"]');
      if (activeNav) activeNav.classList.add('active');

      document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
      var targetPage = document.getElementById('page-' + page);
      if (targetPage) targetPage.classList.add('active');

      var titles = { articles: '文章管理', editor: '新建文章', settings: '网站设置' };
      document.getElementById('pageTitle').textContent = titles[page] || '管理后台';

      if (page === 'articles') ArticlesList.refresh();
      if (page === 'settings') SettingsPage.load();
    }
  };

  // ===== Articles List =====
  const ArticlesList = {
    search: '',
    category: 'all',

    init: function() {
      var searchInput = document.getElementById('adminSearch');
      if (searchInput) {
        searchInput.addEventListener('input', (function(e) {
          this.search = e.target.value;
          this.refresh();
        }).bind(this));
      }

      var catFilter = document.getElementById('adminCategoryFilter');
      if (catFilter) {
        catFilter.addEventListener('change', (function(e) {
          this.category = e.target.value;
          this.refresh();
        }).bind(this));
      }

      var newBtn = document.getElementById('newArticleBtn');
      if (newBtn) newBtn.addEventListener('click', function() { Editor.openNew(); });

      var exportBtn = document.getElementById('exportBtn');
      if (exportBtn) exportBtn.addEventListener('click', function() { DataIO.exportJSON(); });

      var importFile = document.getElementById('importFile');
      if (importFile) importFile.addEventListener('change', function(e) { DataIO.importJSON(e); });

      this.refresh();
    },

    refresh: function() {
      var self = this;
      var filtered = Store.articles.filter(function(a) {
        var matchSearch = !self.search ||
          a.title.toLowerCase().indexOf(self.search.toLowerCase()) !== -1 ||
          a.tags.some(function(t) { return t.toLowerCase().indexOf(self.search.toLowerCase()) !== -1; });
        var matchCat = self.category === 'all' || a.category === self.category;
        return matchSearch && matchCat;
      });

      filtered.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
      this.renderTable(filtered);
      this.updateStats();
    },

    renderTable: function(articles) {
      var tbody = document.getElementById('articlesTableBody');
      if (!tbody) return;

      if (articles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">暂无文章</td></tr>';
        return;
      }

      var html = articles.map(function(a) {
        var tagsStr = a.tags.join(', ');
        return '<tr data-id="' + a.id + '">' +
          '<td class="article-title-cell">' + ArticlesList.escapeHtml(a.title) + '</td>' +
          '<td><span class="category-badge">' + ArticlesList.escapeHtml(a.category) + '</span></td>' +
          '<td>' + a.date + '</td>' +
          '<td>' + (a.readTime || 0) + ' 分钟</td>' +
          '<td><div class="action-btns">' +
          '<button class="action-btn" onclick="Editor.open(' + a.id + ')">编辑</button>' +
          '<button class="action-btn delete" onclick="ArticlesList.delete(' + a.id + ')">删除</button>' +
          '</div></td></tr>';
      }).join('');
      tbody.innerHTML = html;
    },

    updateStats: function() {
      var cats = {};
      var tags = {};
      Store.articles.forEach(function(a) {
        cats[a.category] = true;
        a.tags.forEach(function(t) { tags[t] = true; });
      });

      document.getElementById('statTotal').textContent = Store.articles.length;
      document.getElementById('statCategories').textContent = Object.keys(cats).length;
      document.getElementById('statReadTime').textContent = Store.articles.reduce(function(s, a) { return s + (a.readTime || 0); }, 0);
      document.getElementById('statTags').textContent = Object.keys(tags).length;
    },

    delete: function(id) {
      if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) return;
      Store.articles = Store.articles.filter(function(a) { return a.id !== id; });
      Store.save().then(function() { ArticlesList.refresh(); });
    },

    escapeHtml: function(str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  };

  // ===== Article Editor =====
  var Editor = {
    isEdit: false,

    open: function(id) {
      Router.navigateTo('editor');
      this.isEdit = !!id;

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

      var article = Store.articles.find(function(a) { return a.id === id; });
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

    openNew: function() {
      this.open(null);
    },

    save: function(e) {
      e.preventDefault();

      var data = {
        id: this.isEdit ? parseInt(document.getElementById('editId').value) : (Store.articles.length ? Math.max.apply(null, Store.articles.map(function(a) { return a.id; })) + 1 : 1),
        title: document.getElementById('articleTitle').value.trim(),
        slug: document.getElementById('articleSlug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
        category: document.getElementById('articleCategory').value.trim(),
        date: document.getElementById('articleDate').value || new Date().toISOString().split('T')[0],
        tags: document.getElementById('articleTags').value.split(/[,，]/).map(function(t) { return t.trim(); }).filter(Boolean),
        readTime: parseInt(document.getElementById('articleReadTime').value) || 5,
        cover: document.getElementById('articleCover').value.trim() || ('https://picsum.photos/seed/' + Date.now() + '/800/400'),
        excerpt: document.getElementById('articleExcerpt').value.trim(),
        content: document.getElementById('articleContent').value.trim()
      };

      if (this.isEdit) {
        var idx = Store.articles.findIndex(function(a) { return a.id === data.id; });
        if (idx !== -1) Store.articles[idx] = data;
      } else {
        Store.articles.push(data);
      }

      Store.save().then(function() {
        Router.navigateTo('articles');
      });
    },

    preview: function() {
      var title = document.getElementById('articleTitle').value;
      var content = document.getElementById('articleContent').value;
      var previewWin = window.open('', '_blank');
      var rendered = content
        .replace(/## (.+)/g, '<h2></h2>')
        .replace(/### (.+)/g, '<h3></h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong></strong>')
        .replace(/\n/g, '<br>');
      var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>预览 - ' + title + '</title>' +
        '<style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.8;}' +
        'h1{font-size:2rem;margin-bottom:20px;}h2{margin-top:30px;}h3{margin-top:24px;}' +
        'pre{background:#f4f4f4;padding:16px;border-radius:8px;overflow-x:auto;}code{font-family:monospace;}' +
        'blockquote{border-left:3px solid #6366f1;padding-left:16px;color:#666;}</style></head>' +
        '<body><h1>' + title + '</h1>' + rendered + '</body></html>';
      previewWin.document.write(html);
      previewWin.document.close();
    }
  };

  // ===== Data Import/Export =====
  var DataIO = {
    exportJSON: function() {
      var data = JSON.stringify(Store.articles, null, 2);
      var blob = new Blob([data], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'blog-articles-' + new Date().toISOString().split('T')[0] + '.json';
      a.click();
      URL.revokeObjectURL(url);
      toast('数据已导出到下载文件夹', 'success');
    },

    importJSON: function(event) {
      var file = event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var imported = JSON.parse(e.target.result);
          if (!Array.isArray(imported)) throw new Error('格式错误');
          Store.articles = imported;
          Store.save().then(function() {
            toast('成功导入 ' + imported.length + ' 篇文章', 'success');
            Router.navigateTo('articles');
          });
        } catch (err) {
          toast('导入失败：文件格式错误 — ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }
  };

  // ===== Settings Page =====
  var SettingsPage = {
    load: function() {
      if (!Store.settings) return;
      var s = Store.settings;
      document.getElementById('settingAccentColor').value = s.accentColor || '#6366f1';
      document.getElementById('settingThemeMode').value = s.themeMode || 'auto';
      document.getElementById('settingCardsPerPage').value = s.cardsPerPage || 12;
      document.getElementById('settingSiteTitle').value = s.siteTitle || "Eric's Blog";
      document.getElementById('settingSiteDesc').value = s.siteDesc || '';
      document.getElementById('settingAuthor').value = s.author || '';
      document.getElementById('settingGithub').value = s.github || '';
      document.getElementById('settingEmail').value = s.email || '';
    },

    save: function() {
      var newPass = document.getElementById('settingNewPassword').value;
      var confirmPass = document.getElementById('settingConfirmPassword').value;

      if (newPass && newPass !== confirmPass) {
        toast('两次密码输入不一致', 'error');
        return;
      }

      if (newPass) {
        localStorage.setItem(CONFIG.PASSWORD_KEY, newPass);
        toast('密码已修改，请重新登录', 'success');
        setTimeout(function() { Auth.logout(); }, 1500);
        return;
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

    reset: function() {
      if (!confirm('确定要重置所有设置吗？')) return;
      Store.settings = Store.getDefaultSettings();
      localStorage.removeItem(CONFIG.SETTINGS_KEY);
      this.load();
      toast('设置已重置', 'warning');
    }
  };

  // ===== Toolbar Actions =====
  var Toolbar = {
    init: function() {
      document.querySelectorAll('.toolbar-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var action = btn.dataset.action;
          var textarea = document.getElementById('articleContent');
          var start = textarea.selectionStart;
          var end = textarea.selectionEnd;
          var selected = textarea.value.substring(start, end);
          var insert = '';
          var cursorOffset = 0;

          switch (action) {
            case 'h2': insert = '\n## ' + (selected || '标题') + '\n'; break;
            case 'h3': insert = '\n### ' + (selected || '标题') + '\n'; break;
            case 'bold': insert = '**' + (selected || '粗体') + '**'; cursorOffset = selected ? 0 : -2; break;
            case 'italic': insert = '*' + (selected || '斜体') + '*'; cursorOffset = selected ? 0 : -2; break;
            case 'ul': insert = '\n- ' + (selected || '列表项') + '\n'; break;
            case 'ol': insert = '\n1. ' + (selected || '列表项') + '\n'; break;
            case 'code': insert = '' + (selected || '代码') + ''; cursorOffset = selected ? 0 : -2; break;
            case 'pre': insert = '\n`\n' + (selected || '代码块') + '\n`\n'; break;
            case 'link': insert = '[' + (selected || '链接文字') + '](url)'; cursorOffset = -1; break;
            case 'quote': insert = '\n> ' + (selected || '引用内容') + '\n'; break;
          }

          textarea.value = textarea.value.substring(0, start) + insert + textarea.value.substring(end);
          var newCursor = start + insert.length + cursorOffset;
          textarea.setSelectionRange(newCursor, newCursor);
          textarea.focus();
        });
      });
    }
  };

  // ===== Populate Category Filter =====
  function populateCategories() {
    var filterSelect = document.getElementById('adminCategoryFilter');
    if (!filterSelect) return;

    var cats = {};
    CONFIG.CATEGORIES.forEach(function(c) { cats[c] = true; });
    Store.articles.forEach(function(a) { cats[a.category] = true; });

    filterSelect.innerHTML = '<option value="all">全部分类</option>';
    Object.keys(cats).sort().forEach(function(c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      filterSelect.appendChild(opt);
    });

    var datalist = document.getElementById('categoryList');
    if (datalist) {
      datalist.innerHTML = '';
      Object.keys(cats).sort().forEach(function(c) {
        var opt = document.createElement('option');
        opt.value = c;
        datalist.appendChild(opt);
      });
    }
  }

  // ===== Initialize =====
  function init() {
    Auth.init();

    // Login form
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var pass = document.getElementById('password').value;
        if (!Auth.login(pass)) {
          toast('密码错误，请重试', 'error');
          document.getElementById('password').value = '';
          document.getElementById('password').focus();
        }
      });
    }

    // Logout
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', function() { Auth.logout(); });

    // Router
    Router.init();

    // Editor form
    var articleForm = document.getElementById('articleForm');
    if (articleForm) articleForm.addEventListener('submit', function(e) { Editor.save(e); });

    var cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', function() { Router.navigateTo('articles'); });

    var previewBtn = document.getElementById('previewBtn');
    if (previewBtn) previewBtn.addEventListener('click', function() { Editor.preview(); });

    // Settings
    var saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', function() { SettingsPage.save(); });

    var resetSettingsBtn = document.getElementById('resetSettingsBtn');
    if (resetSettingsBtn) resetSettingsBtn.addEventListener('click', function() { SettingsPage.reset(); });

    // Toolbar
    Toolbar.init();

    // Load data
    Store.load().then(function() {
      populateCategories();
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

