window.themeManager = {
    getTheme: function() {
        const theme = localStorage.getItem('pokerhub-theme');
        return theme === 'light' ? false : true; // default to dark
    },
    setTheme: function(isDark) {
        localStorage.setItem('pokerhub-theme', isDark ? 'dark' : 'light');
    }
};
