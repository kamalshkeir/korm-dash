class modalEl extends HTMLElement {
    static css = `
        :host dialog {
            padding: 0;
            background: var(--bg-surface, #fff);
            color: var(--text-primary, #0d1020);
            border-radius: var(--radius-lg, 18px);
            border: 1px solid var(--border-default, rgba(13,16,32,.12));
            outline: none;
            box-shadow: var(--shadow-lg, 0 24px 60px -12px rgba(13,16,32,.22));
            min-width: min(92vw, 440px);
            max-width: min(92vw, 560px);
            font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
            overflow: hidden;
        }

        :host dialog::backdrop {
            background-color: var(--bg-overlay, rgba(15,18,34,.42));
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }

        :host dialog .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 18px 22px;
            background: var(--bg-surface-2, #f7f8fc);
            border-bottom: 1px solid var(--border-subtle, rgba(13,16,32,.08));
        }

        :host dialog .header h1 {
            font-family: var(--font-display, sans-serif);
            font-size: 1.05rem;
            font-weight: 800;
            color: var(--text-primary, #0d1020);
            margin: 0;
        }

        :host dialog .body {
            padding: 22px;
            color: var(--text-secondary, #565d75);
        }

        :host dialog .header .close {
            font-size: 20px;
            line-height: 1;
            cursor: pointer;
            font-weight: 800;
            color: var(--text-muted, #8b91a7);
            transition: color .16s ease;
        }

        :host dialog .header .close:hover {
            color: var(--text-primary, #0d1020);
        }
    `;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        // Add base styles
        let style = document.createElement("style");
        style.innerHTML = modalEl.css;

        // Add styles from document that target k-modal
        const globalStyles = Array.from(document.styleSheets)
            .flatMap(sheet => {
                try {
                    return Array.from(sheet.cssRules);
                } catch {
                    return [];
                }
            })
            .filter(rule => rule.selectorText?.includes('k-modal'))
            .map(rule => rule.cssText)
            .join('\n');

        style.innerHTML += globalStyles;

        this.shadowRoot.append(style);
        document.body.appendChild(this);
        this.last_left = 0;
        this.last_right = 0;
        this.last_top = 0;
        this.last_bottom = 0;
    }

    get head() {
        return this.getAttribute("head");
    }

    set head(value) {
        return this.setAttribute("head", value);
    }
    get body() {
        return this.getAttribute("body");
    }

    set body(value) {
        return this.setAttribute("body", value);
    }

    get style() {
        return this.getAttribute("style");
    }

    set style(value) {
        return this.setAttribute("style", value);
    }

    remove() {
        document.body.removeChild(this);
    }

    clear() {
        document.removeEventListener("click", this.fn);
        document.body.removeChild(this);
    }

    close() {
        this.modal.close();
    }

    handleClickOutside() {
        this.fn = (e) => {
            let dialogDimensions = this.modal.getBoundingClientRect();
            if (dialogDimensions.left != this.last_left || dialogDimensions.right != this.last_right || dialogDimensions.top != this.last_top || dialogDimensions.bottom != this.last_bottom) {
                this.last_left = dialogDimensions.left;
                this.last_right = dialogDimensions.right;
                this.last_top = dialogDimensions.top;
                this.last_bottom = dialogDimensions.bottom;
                return;
            }
            if (e.clientX < dialogDimensions.left || e.clientX > dialogDimensions.right || e.clientY < dialogDimensions.top || e.clientY > dialogDimensions.bottom) {
                this.remove();
            }
        }
        this.modal.addEventListener("click", this.fn);
    }

    createModal() {
        this.modal = document.createElement("dialog");
        this.modal.classList.add("modal");

        // Remove the style attribute handling from here
        this.modal.innerHTML = `
        <div class="header">
            <h1>${this.head}</h1> 
            <span class="close">&#x2715;</span>
        </div>

        <div class="body">
            ${this.body}
        </div>
        `;

        this.shadowRoot.append(this.modal);

        this.modal.querySelector(".close").addEventListener("click", (e) => {
            e.preventDefault();
            this.modal.close();
        });
    }

    static get observedAttributes() {
        return ["head", "body", "style"];
    }

    attributeChangedCallback(name, oldValue, newValue) {

    }

}

customElements.define("k-modal", modalEl);

async function Modal(head, body, style, fnOnOpen) {
    let a = new modalEl();
    a.head = head || '';
    a.body = body || '';

    // Create a style element and append it to the shadow root instead of document.head
    if (style) {
        const styleEl = document.createElement('style');
        styleEl.textContent = style;
        a.shadowRoot.appendChild(styleEl);
    }

    a.createModal();
    a.modal.showModal();
    a.handleClickOutside();
    if (fnOnOpen) {
        fnOnOpen(a);
    }
    return a;
}

function elementFromHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
}

window.Modal = Modal;