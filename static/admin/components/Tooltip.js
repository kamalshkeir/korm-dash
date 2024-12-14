class Tooltip {
    static #instances = new WeakMap();
    #element;
    #tooltip;
    #options;

    static defaultOptions = {
        position: 'bottom', // top, bottom, left, right
        offset: 10,
        className: '',
        maxWidth: 300,
        showDelay: 0,
        hideDelay: 0,
        fixed: true, // Use fixed positioning
        allowHtml: false,
        zIndex: 10000,
    };

    constructor(element, options = {}) {
        if (Tooltip.#instances.has(element)) {
            return Tooltip.#instances.get(element);
        }

        this.#element = element;
        this.#options = { ...Tooltip.defaultOptions, ...options };
        this.#init();
        Tooltip.#instances.set(element, this);
    }

    #init() {
        // Create tooltip element
        this.#tooltip = document.createElement('div');
        this.#tooltip.className = `tooltip ${this.#options.className}`.trim();
        this.#tooltip.style.cssText = `
            position: ${this.#options.fixed ? 'fixed' : 'absolute'};
            z-index: ${this.#options.zIndex};
            max-width: ${this.#options.maxWidth}px;
            visibility: hidden;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
            background: #333;
            color: white;
            padding: 0.75rem 1rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            white-space: pre-line;
        `;

        document.body.appendChild(this.#tooltip);

        // Add event listeners
        this.#element.addEventListener('mouseenter', () => this.show());
        this.#element.addEventListener('mouseleave', () => this.hide());
        this.#element.addEventListener('mousemove', (e) => this.#updatePosition(e));
    }

    #updatePosition(e) {
        if (!this.#tooltip) return;

        const x = e.clientX;
        const y = e.clientY;
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const tooltipRect = this.#tooltip.getBoundingClientRect();
        
        let left = x + this.#options.offset;
        let top = y + this.#options.offset;
        
        // Adjust position if tooltip would overflow viewport
        if (left + tooltipRect.width > viewportWidth) {
            left = x - tooltipRect.width - this.#options.offset;
        }
        
        if (top + tooltipRect.height > viewportHeight) {
            top = y - tooltipRect.height - this.#options.offset;
        }
        
        this.#tooltip.style.left = `${left}px`;
        this.#tooltip.style.top = `${top}px`;
    }

    show() {
        if (!this.#tooltip) return;

        const content = this.#element.dataset.tooltip;
        if (!content) return;

        if (this.#options.allowHtml) {
            this.#tooltip.innerHTML = content;
        } else {
            this.#tooltip.textContent = content;
        }

        setTimeout(() => {
            this.#tooltip.style.visibility = 'visible';
            this.#tooltip.style.opacity = '1';
        }, this.#options.showDelay);
    }

    hide() {
        if (!this.#tooltip) return;

        setTimeout(() => {
            this.#tooltip.style.visibility = 'hidden';
            this.#tooltip.style.opacity = '0';
        }, this.#options.hideDelay);
    }

    destroy() {
        if (this.#tooltip && this.#tooltip.parentNode) {
            this.#tooltip.parentNode.removeChild(this.#tooltip);
        }
        Tooltip.#instances.delete(this.#element);
    }

    // Static method to initialize tooltips for multiple elements
    static init(selector, options = {}) {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).map(el => new Tooltip(el, options));
    }
}

export default Tooltip; 


/*
USAGE:

new Tooltip(element, {
    position: 'bottom', // top, bottom, left, right
    offset: 10,
    className: '',
    maxWidth: 300,
    showDelay: 0,
    hideDelay: 0,
});

or 

Tooltip.init('.tooltip-selector', {
    position: 'bottom', // top, bottom, left, right
    offset: 10,
    className: '',
    maxWidth: 300,
    showDelay: 0,
    hideDelay: 0,
});
*/