class modalEl extends HTMLElement {
    static css = `
        :host dialog {
            padding: 30px 50px;
            background: rgba(239, 236, 236, 0.95);
            border-radius: .5rem;
            border: none;
            outline: none;
            box-shadow: 0 .4rem .8rem #0005;
            min-width: 40vw;
        }

        :host dialog::backdrop {
            background-color: rgba(255,255,255,.6);
            filter: invert(1) hue-rotate(180deg);
        }

        :host dialog .header .close {
            position: absolute;
            right: 15px;
            top: 15px;
            font-size: 20px;
            cursor: pointer;
            font-weight: 800;
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

        // Apply dark mode if needed
        if (document.body.classList.contains("dark")) {
            this.modal.style.filter = "invert(1) hue-rotate(180deg)";
            this.modal.style.boxShadow = "0 .4rem .8rem #fff5";
        }

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