window.themeManager = {
    getTheme: function() {
        const theme = localStorage.getItem('pokerhub-theme');
        return theme === 'dark' ? true : false; // default to light
    },
    setTheme: function(isDark) {
        localStorage.setItem('pokerhub-theme', isDark ? 'dark' : 'light');
    }
};
