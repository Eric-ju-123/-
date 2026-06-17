// ===== Blog Application =====
(function() {
  'use strict';
  // ===== Theme Management =====
  const ThemeManager = {
    init() {
      const saved = localStorage.getItem('blog-theme');
      if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      this.updateIcon();
      this.bindEvents();
    },
    toggle() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('blog-theme', next);
      this.updateIcon();
    },
    updateIcon() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const icon = document.querySelector('.theme-icon');
      if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    },
    bindEvents() {
      const btn = document.getElementById('themeToggle');
      if (btn) btn.addEventListener('click', () => this.toggle());
    }
  };
  // ===== Data Manager =====
  const DataManager = {
    articles: [],
    categories: new Set(),
    async load() {
      try {
        const response = await fetch('data/articles.json');
        if (!response.ok) throw new Error('Failed to load articles');
        this.articles = await response.json();
        this.articles.forEach(a => this.categories.add(a.category));
        return this.articles;
      } catch (error) {
        console.error('Error loading articles:', error);
        this.articles = [];
        return [];
      }
    },
    getFiltered(searchTerm = '', category = 'all') {
      return this.articles.filter(article => {
        const matchesSearch = !searchTerm ||
          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = category === 'all' || article.category === category;
        return matchesSearch && matchesCategory;
      });
    },
    getBySlug(slug) {
      return this.articles.find(a => a.slug === slug) || null;
    },
    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    },
    getStats() {
      return {
        total: this.articles.length,
        categories: this.categories.size,
        readTime: this.articles.reduce((sum, a) => sum + (a.readTime || 0), 0)
      };
    }
  };
  // ===== Renderer =====
  const Renderer = {
    createArticleCard(article, index) {
      const card = document.createElement('article');
      card.className = 'article-card';
      card.style.animationDelay = (index * 0.08) + "s";
      card.onclick = () => {
        window.location.href = "article.html?slug=" + article.slug;
      };
      const tagsHtml = article.tags.map(function(t) {
        return "<span class=\"card-tag\">" + t + "</span>";
      }).join("");
      card.innerHTML = 
        "<div class=\"card-cover\">" +
          "<img src=\"" + article.cover + "\" alt=\"" + article.title + "\" loading=\"lazy\" " +
          "onerror=\"this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 800 400%22><rect fill=%22%236366f1%22 width=%22800%22 height=%22400%22/><text x=%22400%22 y=%22200%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2240%22>\U0001f4dd</text></svg>'\">" +
          "<span class=\"card-category\">" + article.category + "</span>" +
        "</div>" +
        "<div class=\"card-body\">" +
          "<div class=\"card-meta\">" +
            "<span class=\"card-date\">\U0001f4c5 </span>" +
            "<span class=\"card-readtime\">\u2311 " + article.readTime + " \u5206\u949f</span>" +
          "</div>" +
          "<h3 class=\"card-title\">" + article.title + "</h3>" +
          "<p class=\"card-excerpt\">" + article.excerpt + "</p>" +
          "<div class=\"card-tags\">" + tagsHtml + "</div>" +
        "</div>";
      ;
      return card;
    },
    renderArticles(filtered) {
      const grid = document.getElementById('articlesGrid');
      const emptyState = document.getElementById('emptyState');
      if (!grid) return;
      grid.innerHTML = '';
      if (filtered.length === 0) {
        emptyState.style.display = 'block';
        return;
      }
      emptyState.style.display = 'none';
      filtered.forEach((article, i) => {
        grid.appendChild(this.createArticleCard(article, i));
      });
    },
    renderCategories() {
      const container = document.getElementById('categoryFilters');
      if (!container) return;
      DataManager.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.category = cat;
        btn.textContent = cat;
        container.appendChild(btn);
      });
    },
    updateStats() {
      const stats = DataManager.getStats();
      const elTotal = document.getElementById('totalArticles');
      const elCategories = document.getElementById('totalCategories');
      const elReadTime = document.getElementById('totalReadTime');
      if (elTotal) elTotal.textContent = stats.total;
      if (elCategories) elCategories.textContent = stats.categories;
      if (elReadTime) elReadTime.textContent = stats.readTime;
    }
  };
  // ===== Search & Filter =====
  const SearchFilter = {
    searchTerm: '',
    category: 'all',
    debounceTimer: null,
    init() {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => {
            this.searchTerm = e.target.value;
            this.apply();
          }, 300);
        });
      }
      document.getElementById('categoryFilters')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
          document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          this.category = e.target.dataset.category;
          this.apply();
        }
      });
    },
    apply() {
      const filtered = DataManager.getFiltered(this.searchTerm, this.category);
      Renderer.renderArticles(filtered);
    }
  };
  // ===== Reset Filters =====
  window.resetFilters = function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === 'all');
    });
    SearchFilter.searchTerm = '';
    SearchFilter.category = 'all';
    SearchFilter.apply();
  };
  // ===== Article Page =====
  const ArticlePage = {
    init() {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('slug');
      if (!slug) {
        window.location.href = 'index.html';
        return;
      }
      const article = DataManager.getBySlug(slug);
      if (!article) {
        window.location.href = 'index.html';
        return;
      }
      this.render(article);
    },
    render(article) {
      document.title = article.title + " | Eric's Blog";
      const meta = document.querySelector('.article-meta');
      if (meta) {
        meta.innerHTML = 
          "<span>\U0001f4c5 </span>" +
          "<span>\U0001f4c2 </span>" +
          "<span>\u2311 " + article.readTime + " \u5206\u949f\u9605\u8bfb</span>";
        ;
      }
      const cover = document.querySelector('.article-cover img');
      if (cover) cover.src = article.cover;
      const titleEl = document.querySelector('.article-header h1');
      if (titleEl) titleEl.textContent = article.title;
      const contentEl = document.querySelector('.article-content');
      if (contentEl) {
        contentEl.innerHTML = this.markdownToHtml(article.content);
      }
      const tagsContainer = document.querySelector('.article-tags');
      if (tagsContainer) {
        tagsContainer.innerHTML = article.tags.map(function(t) {
          return "<span class=\"card-tag\">" + t + "</span>";
        }).join("");
      }
    },
    markdownToHtml(text) {
      return text
        .replace(/^### (.+)$/gm, '<h3></h3>')
        .replace(/^## (.+)$/gm, '<h2></h2>')
        .replace(/^# (.+)$/gm, '<h1></h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong></strong>')
        .replace(/\*(.+?)\*/g, '<em></em>')
        .replace(/`(.+?)`/g, '<code></code>')
        .replace(/^`([\s\S]*?)`/g, '<pre><code></code></pre>')
        .replace(/^> (.+)$/gm, '<blockquote></blockquote>')
        .replace(/^- (.+)$/gm, '<li></li>')
        .replace(/^\d+\. (.+)$/gm, '<li></li>')
        .replace(/(\s*){2,}/g, '</p><p>')
        .replace(/\n/g, "<br>");
    }
  };
// ===== Related Articles Rendering =====
  const RelatedArticles = {
    init() {
      const params = new URLSearchParams(window.location.search);
      const currentSlug = params.get('slug');
      if (!currentSlug) return;
      const related = DataManager.articles
        .filter(a => a.slug !== currentSlug)
        .slice(0, 3);
      const grid = document.getElementById('relatedGrid');
      if (!grid || related.length === 0) return;
      related.forEach(article => {
        const card = document.createElement('div');
        card.className = 'related-card';
        card.onclick = () => {
          window.location.href = `article.html?slug=${article.slug}`;
        };
        card.innerHTML = `
          <h4>${article.title}</h4>
          <div class="related-meta">
            \U0001f4c5 ${DataManager.formatDate(article.date)} · ⏱ ${article.readTime} \u5206\u949f
          </div>
          <p class="related-excerpt">${article.excerpt}</p>
        `;
        grid.appendChild(card);
      });
    }
  };
  // ===== Initialize =====
  function init() {
    ThemeManager.init();
    if (document.querySelector('.articles-grid')) {
      // Home page
      DataManager.load().then(articles => {
        if (articles.length > 0) {
          Renderer.updateStats();
          Renderer.renderCategories();
          Renderer.renderArticles(articles);
          SearchFilter.init();
        } else {
          document.getElementById('articlesGrid').innerHTML =
            '<div class="empty-state"><p>暂无文章</p></div>';
        }
      });
    } else if (document.querySelector('.article-header')) {
      // Article page
      ArticlePage.init();
      RelatedArticles.init();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

