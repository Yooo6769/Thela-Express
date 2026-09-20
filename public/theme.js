/**
 * ThelaExpress Universal Theme Engine
 * Controls White (Light), Black (Dark), and System Default across all 5 applications.
 */

(function () {
  const THEME_STORAGE_KEY = 'thela_theme_mode';

  // Get current raw mode from localStorage ('white', 'black', 'system')
  function getThemeMode() {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'white' || saved === 'black' || saved === 'system') {
        return saved;
      }
    } catch (e) {}
    return 'system';
  }

  // Resolve actual visual state ('light' or 'dark')
  function resolveVisualState(mode) {
    if (mode === 'white') return 'light';
    if (mode === 'black') return 'dark';
    // System preference fallback
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  // Apply theme classes and meta attributes
  function applyTheme(mode, persist = true) {
    if (persist) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch (e) {}
    }

    const resolved = resolveVisualState(mode);
    const root = document.documentElement;

    root.classList.remove('dark', 'light');
    root.classList.add(resolved);
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-resolved-theme', resolved);

    // Update meta color-scheme
    let metaScheme = document.querySelector('meta[name="color-scheme"]');
    if (!metaScheme) {
      metaScheme = document.createElement('meta');
      metaScheme.name = 'color-scheme';
      document.head.appendChild(metaScheme);
    }
    metaScheme.content = resolved;

    // Update meta theme-color for mobile address bars
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = resolved === 'dark' ? '#09090b' : '#ffffff';

    // Update rendered UI widgets
    updateThemeWidgetUI(mode, resolved);

    // Dispatch custom event for apps to hook into if needed
    window.dispatchEvent(new CustomEvent('thela:theme-changed', {
      detail: { mode, resolved }
    }));
  }

  // Helper translations for theme labels
  function getThemeText(key, defaultText) {
    if (typeof t === 'function') {
      const translated = t(key);
      if (translated && translated !== key) return translated;
    }
    return defaultText;
  }

  // Render dropdown HTML
  function renderThemeDropdownWidget() {
    const currentMode = getThemeMode();
    const resolved = resolveVisualState(currentMode);

    let currentIcon = 'fa-solid fa-desktop text-blue-500';
    let currentLabel = getThemeText('theme_system', 'System');
    if (currentMode === 'white') {
      currentIcon = 'fa-solid fa-sun text-amber-500';
      currentLabel = getThemeText('theme_white', 'White');
    } else if (currentMode === 'black') {
      currentIcon = 'fa-solid fa-moon text-indigo-400';
      currentLabel = getThemeText('theme_black', 'Black');
    }

    return `
      <div class="thela-theme-container relative inline-block text-left shrink-0">
        <button type="button" onclick="ThelaTheme.toggleMenu(event)" 
          class="thela-theme-btn flex items-center justify-center space-x-1 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap shrink-0"
          title="${getThemeText('theme_selector', 'Choose Theme / थीम चुनें')}">
          <i class="${currentIcon} text-sm"></i>
          <span class="theme-current-label hidden md:inline font-extrabold text-[11px] sm:text-xs">${currentLabel}</span>
          <i class="fa-solid fa-chevron-down text-[8px] opacity-60"></i>
        </button>

        <div class="thela-theme-menu hidden absolute right-0 mt-2 w-48 rounded-2xl shadow-2xl p-2 z-50">
          <div class="px-2 py-1 text-[10px] font-black opacity-50 uppercase tracking-wider border-b border-gray-200/20 mb-1">
            <span data-i18n="theme_selector">${getThemeText('theme_selector', 'Theme')}</span>
          </div>
          <div class="space-y-1">
            <button type="button" onclick="ThelaTheme.setMode('white')" 
              class="thela-theme-option ${currentMode === 'white' ? 'active' : ''}">
              <span class="flex items-center space-x-2">
                <i class="fa-solid fa-sun text-amber-500 text-sm"></i>
                <span data-i18n="theme_white">${getThemeText('theme_white', 'White (Light)')}</span>
              </span>
              ${currentMode === 'white' ? '<i class="fa-solid fa-check text-xs text-orange-600"></i>' : ''}
            </button>

            <button type="button" onclick="ThelaTheme.setMode('black')" 
              class="thela-theme-option ${currentMode === 'black' ? 'active' : ''}">
              <span class="flex items-center space-x-2">
                <i class="fa-solid fa-moon text-indigo-400 text-sm"></i>
                <span data-i18n="theme_black">${getThemeText('theme_black', 'Black (Dark)')}</span>
              </span>
              ${currentMode === 'black' ? '<i class="fa-solid fa-check text-xs text-orange-500"></i>' : ''}
            </button>

            <button type="button" onclick="ThelaTheme.setMode('system')" 
              class="thela-theme-option ${currentMode === 'system' ? 'active' : ''}">
              <span class="flex items-center space-x-2">
                <i class="fa-solid fa-desktop text-blue-500 text-sm"></i>
                <span data-i18n="theme_system">${getThemeText('theme_system', 'System Default')}</span>
              </span>
              ${currentMode === 'system' ? '<i class="fa-solid fa-check text-xs text-orange-500"></i>' : ''}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Update existing widget DOM elements without re-rendering everything
  function updateThemeWidgetUI(mode, resolved) {
    document.querySelectorAll('.thela-theme-container').forEach(container => {
      const labelEl = container.querySelector('.theme-current-label');
      const iconEl = container.querySelector('.thela-theme-btn > i:first-child');
      
      let iconClass = 'fa-solid fa-desktop text-blue-500';
      let labelText = getThemeText('theme_system', 'System');
      if (mode === 'white') {
        iconClass = 'fa-solid fa-sun text-amber-500';
        labelText = getThemeText('theme_white', 'White');
      } else if (mode === 'black') {
        iconClass = 'fa-solid fa-moon text-indigo-400';
        labelText = getThemeText('theme_black', 'Black');
      }

      if (labelEl) labelEl.textContent = labelText;
      if (iconEl) iconEl.className = `${iconClass} text-sm`;

      // Update checkmarks and active states
      const options = container.querySelectorAll('.thela-theme-option');
      options.forEach(opt => {
        const isWhite = opt.getAttribute('onclick')?.includes("'white'");
        const isBlack = opt.getAttribute('onclick')?.includes("'black'");
        const isSystem = opt.getAttribute('onclick')?.includes("'system'");
        
        let isActive = (mode === 'white' && isWhite) || (mode === 'black' && isBlack) || (mode === 'system' && isSystem);
        opt.classList.toggle('active', isActive);

        const checkEl = opt.querySelector('.fa-check');
        if (isActive && !checkEl) {
          const check = document.createElement('i');
          check.className = 'fa-solid fa-check text-xs text-orange-500';
          opt.appendChild(check);
        } else if (!isActive && checkEl) {
          checkEl.remove();
        }
      });
    });
  }

  // Mount widgets into .themeSelectorMount elements
  function mountThemeWidgets() {
    const mounts = document.querySelectorAll('.themeSelectorMount');
    mounts.forEach(mount => {
      mount.innerHTML = renderThemeDropdownWidget();
    });
  }

  // Dropdown menu toggle
  function toggleThemeMenu(event) {
    if (event) event.stopPropagation();
    const btn = event.currentTarget || event.target.closest('button');
    const menu = btn?.parentElement?.querySelector('.thela-theme-menu');
    if (menu) {
      const isHidden = menu.classList.contains('hidden');
      document.querySelectorAll('.thela-theme-menu').forEach(m => m.classList.add('hidden'));
      if (isHidden) {
        menu.classList.remove('hidden');
      }
    }
  }

  // Close menus on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.thela-theme-container')) {
      document.querySelectorAll('.thela-theme-menu').forEach(m => m.classList.add('hidden'));
    }
  });

  // Listen for system theme changes (OS dark/light toggle)
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getThemeMode() === 'system') {
        applyTheme('system', false);
      }
    });
  }

  // Multi-tab sync
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_STORAGE_KEY) {
      applyTheme(e.newValue || 'system', false);
    }
  });

  // Listen for language changes to re-translate theme labels
  window.addEventListener('thela:language-changed', () => {
    updateThemeWidgetUI(getThemeMode(), resolveVisualState(getThemeMode()));
  });
  window.addEventListener('thela_language_changed', () => {
    updateThemeWidgetUI(getThemeMode(), resolveVisualState(getThemeMode()));
  });

  // Public API
  window.ThelaTheme = {
    setMode: function (mode) {
      applyTheme(mode, true);
      document.querySelectorAll('.thela-theme-menu').forEach(m => m.classList.add('hidden'));
    },
    getMode: getThemeMode,
    getResolved: function () {
      return resolveVisualState(getThemeMode());
    },
    toggleMenu: toggleThemeMenu,
    mount: mountThemeWidgets,
    apply: applyTheme
  };

  // Immediate execution on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyTheme(getThemeMode(), false);
      mountThemeWidgets();
    });
  } else {
    applyTheme(getThemeMode(), false);
    mountThemeWidgets();
  }
})();
