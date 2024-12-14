class AppHeader extends HTMLElement {
    constructor() {
        super();
    }

    static get defaultStyles() {
        return `
            <style>
                app-header {
                    display: block;
                }

                app-header .top-header {
                    height: var(--header-height, 64px);
                    padding: 0 1.5rem;
                    background: white;
                    border-bottom: 1px solid var(--border-color, #e2e8f0);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                app-header .breadcrumbs {
                    font-weight: 600;
                    color: #0f172a;
                    font-size: 1.25rem;
                    letter-spacing: -0.025em;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    flex: 1;
                    min-width: 0;
                    padding-right: 1rem;
                }

                app-header .user-menu {
                    position: relative;
                }

                app-header .user-button {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem;
                    border: none;
                    background: none;
                    cursor: pointer;
                    border-radius: 0.5rem;
                    color: var(--text-gray, #64748b);
                }

                app-header .avatar {
                    width: 36px;
                    height: 36px;
                    background: var(--primary-color, #16a34a);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 0.875rem;
                }

                app-header .dropdown-icon {
                    fill: currentColor;
                    transition: transform 0.2s ease;
                }

                app-header .user-button.active .dropdown-icon {
                    transform: rotate(180deg);
                }

                app-header .user-popup {
                    position: absolute;
                    top: calc(100% + 0.5rem);
                    right: 0;
                    background: white;
                    border: 1px solid var(--border-color, #e2e8f0);
                    border-radius: 0.5rem;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    width: 240px;
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(-10px);
                    transition: all 0.2s ease;
                }

                app-header .user-popup.show {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                }

                @media (max-width: 768px) {
                    app-header .top-header {
                        padding: 0 1rem;
                        height: 56px;
                    }

                    app-header .breadcrumbs {
                        font-size: 1rem;
                    }

                    app-header .username {
                        display: none;
                    }
                }

                /* Add styles for header actions */
                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
            </style>
        `;
    }

    connectedCallback() {
        if (!document.getElementById('app-header-styles')) {
            const styleSheet = document.createElement('div');
            styleSheet.id = 'app-header-styles';
            styleSheet.innerHTML = AppHeader.defaultStyles;
            document.head.appendChild(styleSheet);
        }
        this.render();
        this.setupEventListeners();

        // Apply dark mode if enabled
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            const darkModeToggle = this.querySelector('#darkModeToggle');
            if (darkModeToggle) {
                darkModeToggle.checked = true;
            }
            this.applyDarkMode(true);
        }
    }

    static get observedAttributes() {
        return ["title","username","email","logout"];
    }

    get title() {
        return this.getAttribute("title");
    }

    set title(value) {
        return this.setAttribute("title", value);
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


    render() {
        const path = window.location.pathname;
        let title = this.title || 'Dashboard';

        this.innerHTML = `
            <header class="top-header">
                <div class="breadcrumbs">${title}</div>
                <div class="header-actions">
                    <div class="user-menu">
                        <button class="user-button" id="userMenuBtn">
                            <span class="avatar">A</span>
                            <span class="username">${this.username || "UNSET"}</span>
                            <svg class="dropdown-icon" viewBox="0 0 24 24" width="16" height="16">
                                <path d="M7 10l5 5 5-5z"/>
                            </svg>
                        </button>
                        <div class="user-popup" id="userPopup">
                            <div class="popup-header">
                                <span class="avatar">A</span>
                                <div class="user-info">
                                    <div class="username">${this.username || "UNSET"}</div>
                                    <div class="email">${this.email || "admin@example.com"}</div>
                                </div>
                            </div>
                            <div class="popup-divider"></div>
                            <div class="theme-mode-toggle">
                                <label class="switch">
                                    <input type="checkbox" id="darkModeToggle">
                                    <span class="slider"></span>
                                </label>
                                <span>Dark Mode</span>
                            </div>
                            <div class="popup-divider"></div>
                            <div class="theme-section">
                                <div class="theme-presets">
                                    <button class="theme-preset" data-color="#a2441f" style="background: #a2441f"></button>
                                    <button class="theme-preset" data-color="#12449f" style="background: #12449f"></button>
                                    <button class="theme-preset" data-color="#166534" style="background: #166534"></button>
                                    <button class="theme-preset" data-color="#9f1239" style="background: #9f1239"></button>
                                </div>
                            </div>
                            <div class="popup-divider"></div>
                            <a href="${this.logout || '/logout'}" class="popup-item">
                                <svg viewBox="0 0 24 24" width="18" height="18">
                                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                                </svg>
                                <span>Logout</span>
                            </a>
                        </div>
                    </div>
                </div>
            </header>
        `;

        // Setup theme presets
        this.setupThemePresets();

        // Add dark mode toggle handler
        const darkModeToggle = this.querySelector('#darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.checked = localStorage.getItem('darkMode') === 'true';
            darkModeToggle.addEventListener('change', (e) => {
                const isDark = e.target.checked;
                localStorage.setItem('darkMode', isDark);
                this.applyDarkMode(isDark);
            });
        }
    }

    setupThemePresets() {
        const presets = this.querySelectorAll('.theme-preset');
        presets.forEach(preset => {
            preset.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = preset.dataset.color;
                this.setTheme(color);
            });
        });
    }

    setTheme(color) {
        document.documentElement.style.setProperty('--theme-color', color);
        document.documentElement.style.setProperty('--theme-color-hover', this.adjustBrightness(color, -10));
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
        if (isDark) {
            document.documentElement.style.setProperty('--bg-gray', '#1a1a1a');
            document.documentElement.style.setProperty('--border-color', '#2a2a2a');
            document.documentElement.style.setProperty('--text-gray', '#a1a1aa');
            document.body.style.backgroundColor = '#121212';
            document.body.style.color = '#e5e5e5';
            document.body.classList.add('dark-mode');
        } else {
            document.documentElement.style.setProperty('--bg-gray', '#f1f5f9');
            document.documentElement.style.setProperty('--border-color', '#e2e8f0');
            document.documentElement.style.setProperty('--text-gray', '#64748b');
            document.body.style.backgroundColor = '';
            document.body.style.color = '';
            document.body.classList.remove('dark-mode');
        }
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

        // Load saved theme color
        const savedColor = localStorage.getItem('theme-color');
        if (savedColor) {
            this.setTheme(savedColor);
        }

        // Load and apply saved dark mode setting
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        if (savedDarkMode) {
            const darkModeToggle = this.querySelector('#darkModeToggle');
            if (darkModeToggle) {
                darkModeToggle.checked = true;
            }
            this.applyDarkMode(true);
        }
    }
}

customElements.define('app-header', AppHeader); 