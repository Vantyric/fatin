(function() {
  try {
    var theme = localStorage.getItem('fatin_theme');
    var isDark = true;
    if (theme === 'light') {
      isDark = false;
    } else if (theme === 'dark') {
      isDark = true;
    } else {
      isDark = !window.matchMedia('(prefers-color-scheme: light)').matches;
    }
    if (!isDark) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  } catch (e) {}
})();
