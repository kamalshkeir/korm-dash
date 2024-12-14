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
                    background: white;
                    box-shadow: -4px 0 6px -1px rgb(0 0 0 / 0.1);
                    z-index: 1001;
                    transition: right 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    padding-right: var(--scrollbar-width, 0px);
                }

                .slide-panel.show {
                    right: 0;
                }

                .slide-panel-header {
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .slide-panel-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #0f172a;
                }

                .close-btn {
                    padding: 0.5rem;
                    border: none;
                    background: none;
                    cursor: pointer;
                    border-radius: 0.5rem;
                    color: var(--text-gray);
                }

                .close-btn:hover {
                    background: var(--bg-gray);
                }

                .slide-panel-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.5rem;
                }

                .overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
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
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
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