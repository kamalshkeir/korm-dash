const ICON_SEARCH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`;
const ICON_CHEVRON = `<svg class="dropdown-icon" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>`;
const ICON_RESTART = `<svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`;
const ICON_LOGOUT = `<svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>`;

const THEME_PRESETS = [
    { color: '#4f46e5', label: 'Indigo' },
    { color: '#0ea5e9', label: 'Sky' },
    { color: '#10b981', label: 'Emerald' },
    { color: '#f59e0b', label: 'Amber' },
    { color: '#ef4444', label: 'Ruby' },
    { color: '#ec4899', label: 'Pink' },
];

class AppHeader extends HTMLElement {
    constructor() {
        super();
    }

    makeGetRequest(e, url) {
        e.preventDefault();
        fetch(url).catch(error => {
            Notif.New({
                title: 'Error',
                message: error.message,
                type: 'error'
            }).show();
        });
    }

    static get observedAttributes() {
        return ["titre", "username", "email", "logout", "restart"];
    }

    get titre() {
        return this.getAttribute("titre");
    }

    set titre(value) {
        return this.setAttribute("titre", value);
    }

    get restart() {
        return this.getAttribute("restart");
    }

    set restart(value) {
        return this.setAttribute("restart", value);
    }

    get username() {
        return this.getAttribute("username");
    }

    set username(value) {
        return this.setAttribute("username", value);
    }

    get email() {
        return this.getAttribute("email");
    }

    set email(value) {
        return this.setAttribute("email", value);
    }

    get logout() {
        return this.getAttribute("logout");
    }

    set logout(value) {
        return this.setAttribute("logout", value);
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();

        // Apply the persisted preferences before the first paint.
        const savedColor = localStorage.getItem('theme-color');
        if (savedColor) this.setTheme(savedColor);
        this.applyDarkMode(localStorage.getItem('darkMode') === 'true');
    }

    render() {
        const title = this.titre || 'Dashboard';
        const name = this.username || 'admin';
        const avatar = (name[0] || 'a').toUpperCase();
        const email = this.email || '';

        this.innerHTML = `
            <header class="top-header">
                <div class="breadcrumbs">${title}</div>
                <div class="header-actions">
                    <button class="icon-btn" id="openPalette" type="button" title="Search tables (⌘K)" aria-label="Search tables">
                        ${ICON_SEARCH}
                    </button>
                    <div class="user-menu">
                        <button class="user-button" id="userMenuBtn" type="button">
                            <span class="avatar">${avatar}</span>
                            <span class="username">${name}</span>
                            ${ICON_CHEVRON}
                        </button>
                        <div class="user-popup" id="userPopup">
                            <div class="popup-header">
                                <span class="avatar">${avatar}</span>
                                <div class="user-info">
                                    <div class="username">${name}</div>
                                    <div class="email">${email}</div>
                                </div>
                            </div>
                            <div class="popup-divider"></div>
                            <div class="theme-mode-toggle">
                                <label class="switch">
                                    <input type="checkbox" id="darkModeToggle">
                                    <span class="slider"></span>
                                </label>
                                <span>Dark mode</span>
                            </div>
                            <div class="popup-divider"></div>
                            <div class="theme-section">
                                <div class="theme-label">Accent color</div>
                                <div class="theme-presets">
                                    ${THEME_PRESETS.map(p => `<button class="theme-preset" type="button" data-color="${p.color}" title="${p.label}" style="background:${p.color}"></button>`).join('')}
                                </div>
                            </div>
                            <div class="popup-divider"></div>
                            <a href="#" class="popup-item restart-link">${ICON_RESTART} Restart</a>
                            <div class="popup-divider"></div>
                            <a href="${this.logout || '/admin/logout'}" class="popup-item danger">${ICON_LOGOUT} Logout</a>
                        </div>
                    </div>
                </div>
            </header>
        `;

        this.setupThemePresets();

        const darkModeToggle = this.querySelector('#darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.checked = localStorage.getItem('darkMode') === 'true';
            darkModeToggle.addEventListener('change', (e) => {
                const isDark = e.target.checked;
                localStorage.setItem('darkMode', isDark);
                this.applyDarkMode(isDark);
            });
        }

        this.querySelector('#openPalette')?.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('korm:open-palette'));
        });
    }

    setupThemePresets() {
        this.querySelectorAll('.theme-preset').forEach(preset => {
            preset.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setTheme(preset.dataset.color);
            });
        });
    }

    setTheme(color) {
        document.documentElement.style.setProperty('--theme-color', color);
        document.documentElement.style.setProperty('--theme-color-hover', this.adjustBrightness(color, -12));
        localStorage.setItem('theme-color', color);
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
        document.documentElement.classList.toggle('dark', isDark);
        document.body.classList.toggle('dark', isDark);
        document.body.classList.toggle('dark-mode', isDark);
        const toggle = this.querySelector('#darkModeToggle');
        if (toggle) toggle.checked = isDark;
    }

    setupEventListeners() {
        const userMenuBtn = this.querySelector('#userMenuBtn');
        const userPopup = this.querySelector('#userPopup');

        userMenuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenuBtn.classList.toggle('active');
            userPopup?.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            userMenuBtn?.classList.remove('active');
            userPopup?.classList.remove('show');
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                userMenuBtn?.classList.remove('active');
                userPopup?.classList.remove('show');
            }
        });

        const restartLink = this.querySelector('.restart-link');
        if (restartLink) {
            restartLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                Ask("Do you confirm you want to restart ?").then(ok => {
                    if (ok) {
                        this.makeGetRequest(e, this.restart || '/admin/restart');
                    }
                });
            });
        }
    }
}

customElements.define('app-header', AppHeader);
