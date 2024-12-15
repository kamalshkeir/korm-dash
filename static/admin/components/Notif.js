class NotificationManager {
    static instance = null;

    static getInstance() {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
            this.addStyles();
        }
        return NotificationManager.instance;
    }

    static addStyles() {
        const styles = `
            .notifications-container {
                position: fixed;
                top: 1rem;
                right: 1rem;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .notification {
                min-width: 300px;
                max-width: 450px;
                padding: 1rem;
                border-radius: 0.5rem;
                background: #18181b;
                color: white;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                transform: translateX(120%);
                opacity: 0;
                transition: all 0.3s ease;
            }

            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }

            .notification-icon {
                flex-shrink: 0;
                width: 20px;
                height: 20px;
            }

            .notification-content {
                flex: 1;
                min-width: 0;
            }

            .notification-title {
                font-weight: 500;
                margin-bottom: 0.25rem;
            }

            .notification-message {
                font-size: 0.875rem;
                opacity: 0.9;
            }

            .notification-close {
                padding: 0.25rem;
                background: none;
                border: none;
                color: currentColor;
                opacity: 0.7;
                cursor: pointer;
                border-radius: 0.25rem;
                flex-shrink: 0;
            }

            .notification-close:hover {
                background: var(--theme-color-hover);
            }

            .notification-close svg {
                width: 16px;
                height: 16px;
            }

            .notification.success { background: #166534; }
            .notification.error { background: #991b1b; }
            .notification.info { background: #1e40af; }
            .notification.warning { background: #ca8a04; }

            /* Hover states for close buttons */
            .notification.success .notification-close:hover { background: #14532d; }
            .notification.error .notification-close:hover { background: #7f1d1d; }
            .notification.info .notification-close:hover { background: #1e3a8a; }
            .notification.warning .notification-close:hover { background: #a16207; }

            @media (max-width: 640px) {
                .notifications-container {
                    left: 1rem;
                    right: 1rem;
                }
                .notification {
                    min-width: 0;
                    width: 100%;
                }
            }
        `;

        const styleSheet = document.createElement("style");
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    constructor() {
        if (!document.querySelector('.notifications-container')) {
            const container = document.createElement('div');
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
    }

    static New({ title, message, type = 'default', duration = 5000 }) {
        const manager = NotificationManager.getInstance();
        const container = document.querySelector('.notifications-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = this.getIcon(type);
        
        notification.innerHTML = `
            ${icon}
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                ${message ? `<div class="notification-message">${message}</div>` : ''}
            </div>
            <button class="notification-close">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        `;

        container.appendChild(notification);

        const show = () => {
            requestAnimationFrame(() => {
                notification.classList.add('show');
            });

            const closeBtn = notification.querySelector('.notification-close');
            const close = () => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            };

            closeBtn.addEventListener('click', close);

            if (duration) {
                setTimeout(close, duration);
            }
        };

        return { show };
    }

    static getIcon(type) {
        const icons = {
            success: `<svg class="notification-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
            error: `<svg class="notification-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>`,
            warning: `<svg class="notification-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
            info: `<svg class="notification-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
            default: `<svg class="notification-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>`
        };
        return icons[type] || icons.default;
    }
}

window.Notif = NotificationManager; 