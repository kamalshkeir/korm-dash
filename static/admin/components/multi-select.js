class MultiSelectEl extends HTMLElement {
    static css = `
        :host {
            display: block;
        }
        
        .selecttt {
            display: grid;
            grid-template-columns: repeat(3, 80px);
            max-width: 300px;
            gap: 2px;
            font-size: 12px;
        }

        .select__item {
            padding: 10px;
            cursor: pointer;
            text-align: center;
            border-radius: 3px;
            background: rgb(138, 133, 133);
            transition: background 0.2s;
        }

        .select__item.selected {
            background: var(--red);
            color: white;
        }
    `;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        
        // Add styles
        let style = document.createElement("style");
        style.innerHTML = MultiSelectEl.css;
        this.shadowRoot.append(style);
    }

    get multiple() {
        return this.hasAttribute("multiple");
    }

    set multiple(value) {
        if (value) {
            this.setAttribute("multiple", "");
        } else {
            this.removeAttribute("multiple");
        }
    }

    get options() {
        const opts = this.getAttribute("options")?.split(",") || [];
        return opts.map(opt => {
            const [value, ...textParts] = opt.split(":");
            return {
                value: value,
                text: textParts.join(":") // Join back in case text contains ":"
            };
        });
    }

    set options(value) {
        if (Array.isArray(value)) {
            const optStr = value.map(opt => 
                typeof opt === 'object' ? 
                    `${opt.value}:${opt.text}` : 
                    opt
            ).join(",");
            this.setAttribute("options", optStr);
        }
    }

    connectedCallback() {
        this.render();
    }

    render() {
        // Create select container
        this.customSelect = document.createElement("div");
        this.customSelect.classList.add("selecttt");

        // Create original select for form submission
        this.originalSelect = document.createElement("select");
        this.originalSelect.style.display = "none";
        if (this.multiple) {
            this.originalSelect.multiple = true;
        }
        
        // Create options
        this.options.forEach((opt) => {
            // Create visible item
            const itemEl = document.createElement("div");
            itemEl.classList.add("select__item");
            itemEl.textContent = opt.text;
            itemEl.dataset.value = opt.value;
            
            // Create hidden option
            const optionEl = document.createElement("option");
            optionEl.value = opt.value;
            optionEl.textContent = opt.text;
            this.originalSelect.appendChild(optionEl);

            // Handle click
            itemEl.addEventListener("click", e => {
                e.preventDefault();
                if (this.multiple && itemEl.classList.contains("selected")) {
                    this._deselect(itemEl);
                } else {
                    this._select(itemEl);
                }
                this.selected = this.GetSelected();
                // Create custom event with selected getter
                const event = new CustomEvent('change', {
                    detail: this.GetSelected()
                });
                Object.defineProperty(event, 'selected', {
                    get() { return this.detail; }
                });
                this.dispatchEvent(event);
            });

            this.customSelect.appendChild(itemEl);
        });

        // Clear and append new content
        this.shadowRoot.innerHTML = '';
        const style = document.createElement("style");
        style.innerHTML = MultiSelectEl.css;
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(this.originalSelect);
        this.shadowRoot.appendChild(this.customSelect);
    }

    _select(itemElement) {
        const idx = Array.from(this.customSelect.children).indexOf(itemElement);
        if (!this.multiple) {
            this.customSelect.querySelectorAll(".select__item").forEach(el => {
                el.classList.remove("selected");
            });
        }
        this.originalSelect.querySelectorAll("option")[idx].selected = true;
        itemElement.classList.add("selected");
    }

    _deselect(itemElement) {
        const idx = Array.from(this.customSelect.children).indexOf(itemElement);
        this.originalSelect.querySelectorAll("option")[idx].selected = false;
        itemElement.classList.remove("selected");
    }

    GetSelected() {
        return Array.from(this.customSelect.querySelectorAll(".selected"))
            .map(el => ({
                value: el.dataset.value,
                text: el.textContent
            }));
    }

    static get observedAttributes() {
        return ["options", "multiple"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }
}

customElements.define("k-select", MultiSelectEl);


// // Using index as value
// <k-select options="0:Option 1,1:Option 2"></k-select>

// // Using string IDs
// <k-select options="opt1:Option 1,opt2:Option 2"></k-select>

// // Using complex values
// <k-select options="user_1:John Doe,user_2:Jane Doe"></k-select>


// .querySelector("k-select").addEventListener('change', (e) => {
//     const selected = e.selected;  // Can use e.selected directly
//     console.log(selected); // [{value: "0", text: "Sunday"}, ...]
// });