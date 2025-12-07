class ask extends HTMLElement {
    static css = `
        *, :after, :before {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        :host {
            font-family: Arial, sans-serif;
            position: fixed;
            top: 0;
            left: 0;
            background: rgba(0,0,0,0.5);
            right: 0;
            bottom: 0;
            z-index: 99999999999;
            display: flex;
            align-items: center;
            justify-content: center;
            --darkest:#212529;
            --dark:#495057;
        }

        .modal {
            width: min(90%, 400px);
            background: var(--darkest);
            border-radius: 8px;
            overflow: hidden;
            visibility: hidden;
            opacity: 0;
            transition: all 0.2s ease-in-out;
        }

        .modal.open {
            visibility: visible;
            opacity: 1;
        }
        
        .modal .header {
            width: 100%;
            background-color: var(--dark);
            color: white;
            display: flex;
            align-items: center;
            padding: 15px 20px;
            font-weight: 200;
            gap: 10px;
        }
        
        .modal .header svg {
            width: 24px;
            height: 24px;
            fill: none;
            stroke: #ced4da;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
        
        .modal .footer {
            width: 100%;
            background-color: var(--darkest);
            display: flex;
            justify-content: flex-end;
            align-items: center;
            padding: 15px;
        }
        
        .modal .footer button {
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
        }
        
        .modal .footer button.cancel {
            background-color: #333;
            color: white;
            border: none;
            margin-right: 8px;
        }
        
        .modal .footer button.confirm {
            background-color: #2563eb;
            color: white;
            border: none;
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