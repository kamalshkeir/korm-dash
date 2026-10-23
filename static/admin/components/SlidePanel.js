class SlidePanel extends HTMLElement {
    #isOpen = false;
    #onSubmit = null;

    constructor() {
        super();
        this._overlay = null;
    }

    static get defaultStyles() {
        return `
            <style>
                .slide-panel {
                    position: fixed;
                    top: 0;
                    right: -100%;
                    width: min(600px, 100%);
                    height: 100vh;
                    background: var(--bg-surface);
                    border-left: 1px solid var(--border-subtle);
                    box-shadow: var(--shadow-lg);
                    z-index: 1001;
                    transition: right .3s var(--ease-out);
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    padding-right: var(--scrollbar-width, 0px);
                }

                .slide-panel.show {
                    right: 0;
                }

                .slide-panel-header {
                    padding: 18px 22px;
                    background: var(--bg-surface-2);
                    border-bottom: 1px solid var(--border-subtle);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .slide-panel-title {
                    font-family: var(--font-display);
                    font-size: 1.1rem;
                    font-weight: 800;
                    color: var(--text-primary);
                }

                .close-btn {
                    padding: 0.5rem;
                    border: none;
                    background: none;
                    cursor: pointer;
                    border-radius: var(--radius-xs);
                    color: var(--text-muted);
                    transition: all .16s ease;
                }

                .close-btn:hover {
                    background: var(--bg-surface-3);
                    color: var(--text-primary);
                }

                .slide-panel-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 22px;
                }

                .overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: var(--bg-overlay);
                    backdrop-filter: blur(4px);
                    -webkit-backdrop-filter: blur(4px);
                    opacity: 0;
                    visibility: hidden;
                    transition: all .3s var(--ease-out);
                    z-index: 1000;
                    margin-right: var(--scrollbar-width, 0px);
                }

                .overlay.show {
                    opacity: 1;
                    visibility: visible;
                }

                @media (max-width: 768px) {
                    .slide-panel {
                        width: 100%;
                    }
                }
            </style>
        `;
    }

    connectedCallback() {
        if (!document.getElementById('slide-panel-styles')) {
            const styleSheet = document.createElement('div');
            styleSheet.id = 'slide-panel-styles';
            styleSheet.innerHTML = SlidePanel.defaultStyles;
            document.head.appendChild(styleSheet);
        }

        if (!document.querySelector('app-notification')) {
            const notification = document.createElement('app-notification');
            document.body.appendChild(notification);
        }

        if (!document.documentElement.style.getPropertyValue('--scrollbar-width')) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
        }
    }

    open(title, content) {
        if (this.#isOpen) return;
        
        const currentPadding = parseInt(window.getComputedStyle(document.body).paddingRight) || 0;
        const scrollbarWidth = parseInt(document.documentElement.style.getPropertyValue('--scrollbar-width')) || 0;
        
        document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
        document.body.style.overflow = 'hidden';

        this._overlay = document.createElement('div');
        this._overlay.className = 'overlay';
        document.body.appendChild(this._overlay);

        // Check if we're using a slot
        const hasSlot = this.hasAttribute('use-slot');
        const contentHtml = hasSlot ? '<slot></slot>' : content;

        this.innerHTML = `
            <div class="slide-panel">
                <div class="slide-panel-header">
                    <h2 class="slide-panel-title">${title}</h2>
                    <button class="close-btn">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round">
                            <path d="M18 6 6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="slide-panel-content">
                    ${contentHtml}
                </div>
            </div>
        `;

        requestAnimationFrame(() => {
            this._overlay.classList.add('show');
            this.querySelector('.slide-panel').classList.add('show');
        });

        this._setupEventListeners();
        this.#isOpen = true;
    }

    close(showNotification = false) {
        if (!this.#isOpen) return;

        const panel = this.querySelector('.slide-panel');
        if (!panel || !this._overlay) return;

        panel.classList.remove('show');
        this._overlay.classList.remove('show');

        setTimeout(() => {
            this._overlay.remove();
            this.innerHTML = '';
            this.#isOpen = false;
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, 300);

        if (showNotification) {
            Notif.New({
                title: 'Changes discarded',
                message: 'Your changes have been discarded.',
                type: 'info',
                duration: 3000
            }).show();
        }
    }

    _setupEventListeners() {
        const closeBtn = this.querySelector('.close-btn');
        const boundClose = this.close.bind(this);
        closeBtn?.addEventListener('click', () => boundClose(true));
        this._overlay?.addEventListener('click', () => boundClose(true));
    }

    get isOpen() {
        return this.#isOpen;
    }
}

customElements.define('slide-panel', SlidePanel); 