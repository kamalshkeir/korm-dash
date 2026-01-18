/**
 * TagManager Web Component
 * 
 * Usage:
 * <tag-manager 
 *   name="languages" 
 *   placeholder="Type and press Enter"
 *   tag-class="tag tag-blue"
 *   separator=","
 *   duplicate-message="Already exists">
 * </tag-manager>
 * 
 * Attributes:
 * - name: The name for the hidden input (required)
 * - placeholder: Placeholder text for the input
 * - tag-class: CSS class(es) for the tags (default: "tag")
 * - separator: Separator for storing/splitting values (default: ",")
 * - duplicate-message: Message shown when duplicate is added
 * - value: Initial comma-separated values
 */

// Inject styles only once
if (!document.getElementById('tag-manager-styles')) {
    const style = document.createElement('style');
    style.id = 'tag-manager-styles';
    style.textContent = `
        tag-manager {
            display: block;
        }
        tag-manager .tags-wrapper {
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            padding: 15px;
            min-height: 60px;
            transition: all 0.3s ease;
            background: transparent;
        }
        tag-manager .tags-wrapper:focus-within {
            border-color: var(--red, #ed4343);
            box-shadow: 0 0 0 3px rgba(237, 67, 67, 0.1);
        }
        tag-manager .tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 10px;
        }
        tag-manager .tags-container:empty {
            margin-bottom: 0;
        }
        tag-manager .tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 500;
            color: white;
            background: #27ae60;
        }
        tag-manager .tag-red { background: var(--red, #ed4343); }
        tag-manager .tag-orange { background: #e67e22; }
        tag-manager .tag-blue { background: #3498db; }
        tag-manager .tag-green { background: #27ae60; }
        tag-manager .tag-remove {
            cursor: pointer;
            opacity: 0.8;
            fill: white;
            transition: opacity 0.2s;
        }
        tag-manager .tag-remove:hover {
            opacity: 1;
        }
        tag-manager .tag-input {
            border: none !important;
            height: 35px !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
            outline: none !important;
            width: 100%;
            font-size: 1rem;
            color: var(--gray, #333);
        }
        tag-manager .tag-input:focus {
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
        }
        tag-manager .tag-input::placeholder {
            color: #999;
        }
    `;
    document.head.appendChild(style);
}

class TagManager extends HTMLElement {
    constructor() {
        super();
        this.tags = [];
    }

    static get observedAttributes() {
        return ['value'];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'value' && oldValue !== newValue && this.hiddenInput) {
            this.setValues(newValue);
        }
    }

    get separator() {
        return this.getAttribute('separator') || ',';
    }

    get tagClass() {
        return this.getAttribute('tag-class') || 'tag';
    }

    get duplicateMessage() {
        return this.getAttribute('duplicate-message') || 'Already exists';
    }

    get name() {
        return this.getAttribute('name') || 'tags';
    }

    get placeholder() {
        return this.getAttribute('placeholder') || 'Type and press Enter';
    }

    render() {
        this.innerHTML = `
            <div class="tags-wrapper">
                <div class="tags-container"></div>
                <input type="text" class="tag-input" placeholder="${this.placeholder}">
                <input type="hidden" name="${this.name}">
            </div>
        `;

        this.tagsContainer = this.querySelector('.tags-container');
        this.tagInput = this.querySelector('.tag-input');
        this.hiddenInput = this.querySelector('input[type="hidden"]');

        // Set initial value if provided
        const initialValue = this.getAttribute('value');
        if (initialValue) {
            this.setValues(initialValue);
        }
    }

    setupEventListeners() {
        this.tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTag(this.tagInput.value);
            }
        });
    }

    updateHiddenInput() {
        const tags = Array.from(this.tagsContainer.querySelectorAll('.tag'))
            .map(tag => {
                const clone = tag.cloneNode(true);
                const svg = clone.querySelector('.tag-remove');
                if (svg) svg.remove();
                return clone.textContent.trim();
            });
        this.hiddenInput.value = tags.join(this.separator);
        
        // Dispatch change event
        this.dispatchEvent(new CustomEvent('change', { 
            detail: { values: tags, value: this.hiddenInput.value }
        }));
    }

    addTag(text) {
        // Split by separator to handle multiple items at once
        const items = text.split(this.separator).map(s => s.trim()).filter(s => s);
        
        items.forEach(item => {
            // Capitalize first letter
            item = item.charAt(0).toUpperCase() + item.slice(1);
            
            // Check if tag already exists
            const existingTags = Array.from(this.tagsContainer.querySelectorAll('.tag'))
                .map(tag => {
                    const clone = tag.cloneNode(true);
                    const svg = clone.querySelector('.tag-remove');
                    if (svg) svg.remove();
                    return clone.textContent.trim();
                });
                
            if (existingTags.includes(item)) {
                return; // Skip duplicate silently when adding multiple
            }
            
            const tag = document.createElement('span');
            tag.className = this.tagClass;
            tag.innerHTML = `
                ${item}
                <svg class="tag-remove" viewBox="0 0 16 16" width="14" height="14">
                    <path d="M13.048 12.263c.214.238.214.595 0 .809-.238.237-.594.237-.808 0L8 8.808l-4.263 4.264c-.238.237-.595.237-.809 0-.237-.214-.237-.57 0-.809L7.192 8 2.928 3.737c-.237-.238-.237-.595 0-.809a.52.52 0 0 1 .785 0L8 7.215l4.287-4.287a.52.52 0 0 1 .785 0c.237.214.237.57 0 .809L8.785 8z"></path>
                </svg>
            `;
            
            tag.querySelector('.tag-remove').addEventListener('click', () => {
                tag.remove();
                this.updateHiddenInput();
            });
            
            this.tagsContainer.appendChild(tag);
        });
        
        this.updateHiddenInput();
        this.tagInput.value = '';
    }

    // Public API methods
    getValue() {
        return this.hiddenInput.value;
    }

    getValues() {
        return this.hiddenInput.value ? this.hiddenInput.value.split(this.separator) : [];
    }

    setValues(valueString) {
        // Clear existing tags
        this.tagsContainer.innerHTML = '';
        
        if (valueString) {
            this.addTag(valueString);
        }
    }

    clear() {
        this.tagsContainer.innerHTML = '';
        this.updateHiddenInput();
    }
}

customElements.define('tag-manager', TagManager);
