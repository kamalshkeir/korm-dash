class AppHeader extends HTMLElement {
    constructor() {
        super();
    }

    makeGetRequest(e, url) {
        e.preventDefault();
        fetch(url)
            .catch(error => {
                Notif.New({
                    title: 'Error',
                    message: error.message,
                    type: 'error'
                }).show();
            });
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
                    background: rgba(255, 255, 255, 0.7);
                    border-bottom: 1px solid var(--border-color, #e2e8f0);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: sticky;
                    top: 0;
                    z-index: 10;
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
                    transition: all 0.2s ease;
                    position: relative;
                    z-index: 1001;
                }
                    
                app-header .user-button .username {
                    font-weight:bold;
                }

                .user-button:hover {
                    color: var(--theme-color,#12449f);
                }

                app-header .avatar {
                    width: 36px;
                    height: 36px;
                    background: var(--theme-color, #12449f);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 0.875rem;
                    transition: transform 0.2s ease;
                }

                .user-button:hover .avatar {
                    transform: scale(1.05);
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
                    z-index: 1002;
                }

                @media (max-width: 768px) {
                    app-header .top-header {
                        padding: 0 1rem;
                        height: 56px;
                    }

                    app-header .breadcrumbs {
                        font-size: 1rem;
                        max-width: 200px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    app-header .username {
                        display: none;
                    }

                    .user-popup {
                        width: 200px;
                        right: 0.5rem;
                    }
                }

                /* Add styles for header actions */
                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                /* Theme picker styles */
                .theme-picker {
                    position: relative;
                    margin-right: 1rem;
                }

                .theme-button {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    background: var(--theme-color);
                    color: white;
                    border: none;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }

                .theme-button:hover {
                    background: var(--theme-color-hover);
                }

                .theme-popup {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 0.5rem;
                    background: white;
                    border: 1px solid var(--border-color);
                    border-radius: 0.5rem;
                    padding: 1rem;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    display: none;
                    z-index: 1000;
                }

                .theme-popup.show {
                    display: block;
                }

                .color-picker {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }

                .color-picker input {
                    width: 100%;
                    height: 40px;
                    padding: 0;
                    border: 1px solid var(--border-color);
                    border-radius: 0.25rem;
                    cursor: pointer;
                }

                .color-picker label {
                    font-size: 0.875rem;
                    color: var(--text-gray);
                }

                .theme-presets {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 0.5rem;
                }

                .preset {
                    padding: 0.5rem;
                    border: none;
                    border-radius: 0.25rem;
                    color: white;
                    cursor: pointer;
                    font-size: 0.75rem;
                    transition: opacity 0.2s;
                }

                .preset:hover {
                    opacity: 0.9;
                }

                /* Theme presets styles */
                .theme-section {
                    padding: 0.75rem 1rem;
                }

                .theme-presets {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0.5rem;
                }

                .theme-preset {
                    width: 24px;
                    height: 24px;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: transform 0.2s;
                }

                .theme-preset:hover {
                    transform: scale(1.1);
                }

                /* Dark mode toggle styles */
                .theme-mode-toggle {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                }

                .switch {
                    position: relative;
                    display: inline-block;
                    width: 40px;
                    height: 24px;
                }

                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: .4s;
                    border-radius: 24px;
                }

                .slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }

                input:checked + .slider {
                    background-color: var(--theme-color);
                }

                input:checked + .slider:before {
                    transform: translateX(16px);
                }
                .dark-mode .nav-item:hover,
                .dark-mode .nav-item.active {
                    background: var(--theme-color);
                    color: white;
                }

                .dark-mode .breadcrumbs {
                    color: #e5e5e5;
                }
                .popup-header {
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .user-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .user-info .email {
                    font-size: 0.875rem;
                    color: var(--text-gray);
                }

                .popup-divider {
                    height: 1px;
                    background: var(--border-color);
                    margin: 0.5rem 0;
                }

                .popup-divider:last-of-type {
                    margin-bottom: 0;
                }

                .popup-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    color: var(--text-gray);
                    text-decoration: none;
                    transition: background-color 0.2s;
                }

                .popup-item:hover {
                    background: rgba(90, 87, 87, 0.3);
                    color: rgb(152, 44, 44);
                }

                .popup-item svg {
                    fill: currentColor;
                }

                /* Add click-outside overlay */
                .popup-overlay {
                    position: fixed;
                    inset: 0;
                    background: transparent;
                    display: none;
                }

                .popup-overlay.show {
                    display: block;
                }

                .dark-mode .user-popup {
                    background: #1a1a1a;
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
        return ["titre", "username", "email", "logout","restart"];
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


    render() {
        const path = window.location.pathname;
        let title = this.titre || 'Dashboard';
        // get first letter of username or email
        const avatar = this.username ? this.username[0] : this.email[0];
        this.innerHTML = `
            <header class="top-header">
                <div class="breadcrumbs">${title}</div>
                <div class="header-actions">
                    <div class="user-menu">
                        <button class="user-button" id="userMenuBtn">
                            <span class="avatar">${avatar.toUpperCase()}</span>
                            <span class="username">${this.username || "UNKN"}</span>
                            <svg class="dropdown-icon" viewBox="0 0 24 24" width="16" height="16">
                                <path d="M7 10l5 5 5-5z"/>
                            </svg>
                        </button>
                        <div class="user-popup" id="userPopup">
                            <div class="popup-header">
                                <span class="avatar">${avatar.toUpperCase()}</span>
                                <div class="user-info">
                                    <div class="username">${this.username || "UNKN"}</div>
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
                            <a href="#" class="popup-item restart-link">
                                <svg viewBox="0 0 24 24" width="18" height="18">
                                    <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                                </svg> Restart
                            </a>
                            <div class="popup-divider"></div>
                            <a href="${this.logout || '/admin/logout'}" class="popup-item">
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

        // Add restart link handler
        const restartLink = this.querySelector('.restart-link');
        if (restartLink) {
            restartLink.addEventListener('click', (e) => {
                Ask("Do you confirm you want to restart ?").then(ok => {
                    if (ok) {
                        this.makeGetRequest(e, this.restart || '/admin/restart');
                    }
                })
            });
        }
    }
}



customElements.define('app-header', AppHeader); 