class NavBar extends HTMLElement {
    constructor() {
        super();
        this._links = [];
        this.classList.add('sidebar', 'collapsed');
    }

    get links() {
        return this._links;
    }

    set links(value) {
        this._links = value;
        this.render();
    }

    connectedCallback() {
        if (!document.getElementById('nav-bar-styles')) {
            const styleSheet = document.createElement('div');
            styleSheet.id = 'nav-bar-styles';
            styleSheet.innerHTML = NavBar.defaultStyles;
            document.head.appendChild(styleSheet);
        }
        document.querySelector('.main-content')?.classList.add('full-width');

        this.render();
        this.setupEventListeners();
    }

    render() {
        this.innerHTML = `
            <div class="sidebar-header">
                <h1 class="logo-text">KORM</h1>
            </div>
            <nav class="sidebar-nav">
                <ul>
                    ${this._links.map(link => `
                        <li>
                            <a href="${link.href}" class="nav-item ${this.isLinkActive(link) ? 'active' : ''}" 
                               title="${link.label}">
                                ${link.icon}
                                <span>${link.label}</span>
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </nav>
        `;
    }

    isLinkActive(link) {
        const currentPath = window.location.pathname;
        if (link.exact) {
            return currentPath === link.href;
        }
        return currentPath.includes(link.href);
    }

    setupEventListeners() {
        // Handle click on sidebar to expand
        this.addEventListener('click', (e) => {
            if (e.target.classList.contains("logo-text")) {
                window.location.href = "/"
            }
            if (window.innerWidth > 768) {
                this.classList.toggle('expanded');
                document.querySelector('.main-content')?.classList.toggle('full-width');
                e.stopPropagation();
            }
        });

        // Handle click outside to collapse
        document.addEventListener('click', (e) => {
            if (window.innerWidth > 768) {
                if (!this.contains(e.target)) {
                    this.classList.remove('expanded');
                    document.querySelector('.main-content')?.classList.add('full-width');
                }
            }
        });
    }

    static get defaultStyles() {
        return `
            <style>
                nav-bar {
                    width: 70px;  /* Default collapsed state */
                    background: white;
                    border-right: 1px solid var(--border-color, #e2e8f0);
                    display: flex;
                    flex-direction: column;
                    position: fixed;
                    height: 100vh;
                    z-index: 1000;
                    transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1);
                }

                nav-bar .nav-item span {
                    opacity: 0;
                    width: 0;
                    position: absolute;
                    pointer-events: none;
                    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
                }

                nav-bar.expanded {
                    width: var(--sidebar-width, 270px);
                }

                nav-bar.expanded .nav-item span {
                    opacity: 1;
                    width: auto;
                    position: static;
                    pointer-events: auto;
                }

                nav-bar .sidebar-header {
                    height: var(--header-height, 64px);
                    border-bottom: 1px solid var(--border-color, #e2e8f0);
                    display: flex;
                    align-items: center;
                }

                nav-bar .sidebar-nav ul {
                    list-style: none;
                    padding: 1rem 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                nav-bar .nav-item {
                    display: flex;
                    align-items: center;
                    padding: 0.75rem 1.5rem;
                    color: var(--text-gray);
                    text-decoration: none;
                    gap: 0.75rem;
                    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
                    white-space: nowrap;
                    border-radius: 0.5rem;
                    margin: 0 0.75rem;
                }

                nav-bar .nav-item svg {
                    width: 24px;
                    height: 24px;
                    fill: currentColor;
                }

                nav-bar .nav-item:hover {
                    background: var(--theme-color);
                    color: white;
                }

                nav-bar .nav-item.active {
                    background: var(--theme-color);
                    color: white;
                    font-weight: 500;
                }

                nav-bar.collapsed .nav-item {
                    padding: 0.75rem;
                }

                /* Update logo styles */
                .logo-text {
                    font-size: 24px;
                    font-weight: 900;
                    color: var(--theme-color);
                    margin-left: 20px;
                    letter-spacing: 1px;
                    transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                }

                /* Update for collapsed sidebar */
                .sidebar.collapsed .logo-text {
                    font-size: 20px;
                    margin-left: 0px;
                    transform: scale(0.8);
                }

                /* Dark mode logo */
                html.dark .logo-text {
                    color: #fff;
                }

                @media (max-width: 768px) {
                    nav-bar.collapsed .nav-item {
                        padding: 0;
                    }
                    nav-bar {
                        position: fixed;
                        top: auto;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        height: var(--bottom-nav-height, 60px);
                        border-right: none;
                        border-top: 1px solid var(--border-color);
                        background: white;
                        z-index: 1001;
                        margin-bottom: 0;
                    }

                    nav-bar .sidebar-header {
                        display: none;
                    }

                    nav-bar .sidebar-nav {
                        height: 100%;
                    }

                    nav-bar .sidebar-nav ul {
                        display: flex;
                        justify-content: space-around;
                        flex-direction: row;
                        gap: 0;
                        height: 100%;
                        padding: 0;
                        margin: 0;
                    }

                    nav-bar .nav-item {
                        flex: 1;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 0.5rem 0;
                        margin: 0;
                        height: 100%;
                        border-radius: 0;
                        gap: 0.25rem;
                        width: 100%;
                        position: relative;
                    }

                    nav-bar li {
                        flex: 1;
                        height: 100%;
                    }

                    nav-bar .nav-item svg {
                        width: 24px;
                        height: 24px;
                        transition: transform 0.3s ease;
                    }

                    nav-bar .nav-item span {
                        font-size: 0.75rem;
                        font-weight: 500;
                        position: absolute;
                        bottom: 2px;
                        opacity: 0;
                        transform: translateY(5px);
                        transition: all 0.3s ease;
                    }
                     .nav-item:hover span {
                        opacity: 1;
                        transform: translateY(0);
                    }

                    nav-bar .nav-item:hover,
                    nav-bar .nav-item.active {
                        background: var(--theme-color);
                        color: white;
                        width: 100%;
                    }

                    nav-bar.collapsed .nav-item span {
                        opacity: 1;
                        position: static;
                        width: auto;
                    }
                    .logo-text {
                        font-size: 20px;
                    }
                }
            </style>
        `;
    }
}

customElements.define('nav-bar', NavBar); 