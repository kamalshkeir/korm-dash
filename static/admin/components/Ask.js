class ask extends HTMLElement {
    static css = `
        *, :after, :before {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        :host {
            font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
            position: fixed;
            top: 0;
            left: 0;
            background: var(--bg-overlay, rgba(15, 18, 34, .42));
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            right: 0;
            bottom: 0;
            z-index: 99999999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .modal {
            width: min(92%, 420px);
            background: var(--bg-surface, #fff);
            border: 1px solid var(--border-default, rgba(13,16,32,.12));
            border-radius: var(--radius-lg, 18px);
            box-shadow: var(--shadow-lg, 0 24px 60px -12px rgba(13,16,32,.22));
            overflow: hidden;
            visibility: hidden;
            opacity: 0;
            transform: translateY(-10px) scale(.97);
            transition: all .22s cubic-bezier(.34, 1.56, .64, 1);
        }

        .modal.open {
            visibility: visible;
            opacity: 1;
            transform: translateY(0) scale(1);
        }

        .modal .header {
            width: 100%;
            background: var(--bg-surface-2, #f7f8fc);
            border-bottom: 1px solid var(--border-subtle, rgba(13,16,32,.08));
            color: var(--text-primary, #0d1020);
            display: flex;
            align-items: center;
            padding: 18px 20px;
            font-weight: 700;
            font-size: 14.5px;
            gap: 12px;
        }

        .modal .header svg {
            width: 21px;
            height: 21px;
            flex-shrink: 0;
            fill: none;
            stroke: var(--theme-color, #4f46e5);
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .modal .footer {
            width: 100%;
            background: var(--bg-surface, #fff);
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 10px;
            padding: 14px 16px;
            border-top: 1px solid var(--border-subtle, rgba(13,16,32,.08));
        }

        .modal .footer button {
            padding: 9px 18px;
            border-radius: var(--radius-sm, 10px);
            font-size: 13px;
            font-weight: 700;
            font-family: inherit;
            cursor: pointer;
            transition: all .16s cubic-bezier(.22, 1, .36, 1);
        }

        .modal .footer button.cancel {
            background: var(--bg-surface-3, #eef0f7);
            color: var(--text-secondary, #565d75);
            border: 1px solid transparent;
        }

        .modal .footer button.cancel:hover {
            background: var(--bg-surface-2, #f7f8fc);
            color: var(--text-primary, #0d1020);
        }

        .modal .footer button.confirm {
            background: var(--theme-color, #4f46e5);
            color: #fff;
            border: none;
            box-shadow: var(--shadow-accent, 0 8px 22px -8px rgba(79,70,229,.65));
        }

        .modal .footer button.confirm:hover {
            transform: translateY(-1px);
            filter: brightness(1.06);
        }
    `;

    static instance = null;

    constructor() {
        super();
        this._message = '';
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>${ask.css}</style>
            <div class="modal">
                <div class="header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="w-4 h-4" viewBox="0 0 24 24">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                    </svg>
                    <p>${this._message}</p>
                </div>
                <div class="footer">
                    <button class="cancel">Cancel</button>
                    <button class="confirm">Confirm</button>
                </div>
            </div>
        `;
        this.modal = this.shadowRoot.querySelector('.modal');
        requestAnimationFrame(() => {
            this.modal.classList.add('open');
        });
    }

    show() {
        if (ask.instance) {
            ask.instance.remove();
        }
        ask.instance = this;
        document.body.appendChild(this);
    }

    remove() {
        if (this.modal) {
            this.modal.classList.remove('open');
            setTimeout(() => {
                super.remove();
                if (ask.instance === this) {
                    ask.instance = null;
                }
            }, 200);
        } else {
            super.remove();
            if (ask.instance === this) {
                ask.instance = null;
            }
        }
    }

    get message() {
        return this._message;
    }

    set message(value) {
        this._message = value;
    }
}

customElements.define("k-ask", ask);

async function Ask(message) {
    if (ask.instance) {
        ask.instance.remove();
    }

    return new Promise((resolve) => {
        let a = new ask();
        a.message = message;
        a.show();
        
        const handleResponse = (response) => {
            a.remove();
            resolve(response);
        };

        requestAnimationFrame(() => {
            const cancelBtn = a.shadowRoot.querySelector(".footer .cancel");
            const confirmBtn = a.shadowRoot.querySelector(".footer .confirm");
            
            cancelBtn.addEventListener("click", (e) => {
                e.preventDefault();
                handleResponse(false);
            });
            
            confirmBtn.addEventListener("click", (e) => {
                e.preventDefault();
                handleResponse(true);
            });
        });
    });
}