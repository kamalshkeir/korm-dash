class ThemePicker extends HTMLElement {
    constructor() {
        super();
        this.darkMode = localStorage.getItem('darkMode') === 'true';
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.loadTheme();
        this.applyDarkMode(this.darkMode);
    }

    render() {
        this.innerHTML = `
            <div class="theme-picker">
                <button class="theme-button">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                    </svg>
                    Theme
                </button>
                <div class="theme-popup">
                    <div class="theme-mode-toggle">
                        <label class="switch">
                            <input type="checkbox" id="darkModeToggle" ${this.darkMode ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <span>Dark Mode</span>
                    </div>
                    <div class="popup-divider"></div>
                    <div class="color-picker">
                        <input type="color" id="themeColor" value="#18181b">
                        <label for="themeColor">Pick Theme Color</label>
                    </div>
                    <div class="theme-presets">
                        <button class="preset" data-color="#18181b">Black</button>
                        <button class="preset" data-color="#1e40af">Blue</button>
                        <button class="preset" data-color="#166534">Green</button>
                        <button class="preset" data-color="#9f1239">Red</button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const button = this.querySelector('.theme-button');
        const popup = this.querySelector('.theme-popup');
        const colorPicker = this.querySelector('#themeColor');
        const presets = this.querySelectorAll('.preset');

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            popup.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!this.contains(e.target)) {
                popup.classList.remove('show');
            }
        });

        colorPicker.addEventListener('input', (e) => {
            this.setTheme(e.target.value);
        });

        presets.forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                colorPicker.value = color;
                this.setTheme(color);
            });
        });

        const darkModeToggle = this.querySelector('#darkModeToggle');
        darkModeToggle.addEventListener('change', (e) => {
            this.darkMode = e.target.checked;
            this.applyDarkMode(this.darkMode);
            localStorage.setItem('darkMode', this.darkMode);
        });
    }

    setTheme(color) {
        document.documentElement.style.setProperty('--theme-color', color);
        document.documentElement.style.setProperty('--theme-color-hover', this.adjustBrightness(color, -10));
        localStorage.setItem('theme-color', color);
    }

    loadTheme() {
        const savedColor = localStorage.getItem('theme-color');
        if (savedColor) {
            this.querySelector('#themeColor').value = savedColor;
            this.setTheme(savedColor);
        }
    }

    adjustBrightness(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16)
            .slice(1);
    }

    applyDarkMode(isDark) {
        if (isDark) {
            document.body.style.filter = 'invert(1) hue-rotate(180deg)';
            // Prevent images and videos from being inverted
            document.querySelectorAll('img, video').forEach(el => {
                el.style.filter = 'invert(1) hue-rotate(180deg)';
            });
        } else {
            document.body.style.filter = '';
            document.querySelectorAll('img, video').forEach(el => {
                el.style.filter = '';
            });
        }
    }
}

customElements.define('theme-picker', ThemePicker); 