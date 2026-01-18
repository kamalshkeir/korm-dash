// AutoInput Component - Version 2.0 - From Scratch
class AutoInput {
    constructor(selector) {
        this.element = document.querySelector(selector);
        if (!this.element) return;
        
        this.words = [];
        this.init();
    }
    
    init() {
        // Store original element info before transformation
        this.originalId = this.element.id;
        
        // Get data from attributes
        const wordsAttr = this.element.getAttribute('words');
        if (wordsAttr) {
            try {
                this.words = JSON.parse(wordsAttr);
            } catch (e) {
                this.words = [];
            }
        }
        
        // Add responsive CSS for mobile if not already added
        if (!document.querySelector('#auto-input-mobile-styles')) {
            const style = document.createElement('style');
            style.id = 'auto-input-mobile-styles';
            style.textContent = `
                .auto-wrapper {
                    position: relative !important;
                    width: 100% !important;
                    flex: 1 !important;
                    min-width: 0 !important;
                    display: flex !important;
                    align-items: center !important;
                }
                
                .auto-input {
                    width: 100% !important;
                    flex: 1 !important;
                    border: none !important;
                    outline: none !important;
                    background: transparent !important;
                    font-family: 'Quicksand', sans-serif !important;
                    box-sizing: border-box !important;
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    display: block !important;
                }
                
                /* Règles spéciales pour mobile - design plus compact */
                @media (max-width: 800px) {
                    /* Override le flex-direction column du CSS principal */
                    form#search {
                        flex-direction: row !important;
                        gap: 0 !important;
                        height: 60px !important;
                        margin-top: 60px !important;
                    }
                    
                    form#search .inputs {
                        flex-wrap: nowrap !important;
                        padding: 10px 15px !important;
                        height: 60px !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        border-radius: 30px 0 0 30px !important;
                    }
                    
                    form#search .inputs .single .auto-wrapper {
                        flex: 1 !important;
                        width: 100% !important;
                        min-width: 0 !important;
                        display: flex !important;
                        position: relative !important;
                    }
                    
                    form#search .inputs .single .auto-wrapper .auto-input {
                        font-size: 14px !important;
                        padding: 8px 0 !important;
                        min-height: 40px !important;
                        width: 100% !important;
                        flex: 1 !important;
                        display: block !important;
                        border: none !important;
                        outline: none !important;
                        background: transparent !important;
                        appearance: none !important;
                        -webkit-appearance: none !important;
                    }
                    
                    /* Force visibility des inputs sur mobile */
                    form#search .inputs .single {
                        width: 100% !important;
                        flex: 1 !important;
                        display: flex !important;
                        gap: 10px !important;
                    }
                    
                    /* Bouton search plus compact */
                    form#search #btn-search {
                        width: 100px !important;
                        height: 60px !important;
                        border-radius: 0 30px 30px 0 !important;
                        font-size: 14px !important;
                    }
                    
                    .auto-dropdown {
                        left: 0 !important;
                        right: 0 !important;
                        width: 100% !important;
                        max-height: 200px !important;
                    }
                    
                    .auto-item {
                        padding: 12px 10px !important;
                        font-size: 14px !important;
                    }
                }
                
                @media (max-width: 480px) {
                    form#search .inputs .single .auto-wrapper .auto-input {
                        font-size: 13px !important;
                        padding: 6px 0 !important;
                    }
                    
                    form#search #btn-search {
                        width: 80px !important;
                        font-size: 12px !important;
                    }
                    
                    .auto-item {
                        padding: 10px 8px !important;
                        font-size: 13px !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Transform the element into an input
        const placeholder = this.element.getAttribute('placeholder') || '';
        const value = this.element.getAttribute('value') || '';
        const name = this.element.getAttribute('name') || this.element.id || ''; // Use ID as fallback
        
        // Replace the element with input + dropdown structure
        this.element.outerHTML = `
            <div class="auto-wrapper" style="
                position: relative; 
                width: 100%; 
                flex: 1; 
                min-width: 0;
                display: flex; 
                align-items: center; 
            ">
                <input 
                    type="text" 
                    placeholder="${placeholder}" 
                    value="${value}" 
                    name="${name}"
                    class="auto-input"
                    autocomplete="off"
                    readonly 
                    style="
                width: 100%; 
                        padding: 15px 0;
                        border: none;
                        border-radius: 0;
                        font-size: 18px;
                        outline: none;
                        box-sizing: border-box;
                        background: transparent;
                        font-family: 'Quicksand', sans-serif;
                height: 100%; 
                        line-height: 1;
                        min-height: 40px;
                        display: block;
                        flex: 1;
                        appearance: none;
                        -webkit-appearance: none;
                    "
                />
                <div 
                    class="auto-dropdown" 
                    style="
                position: absolute;
                        top: 100%;
                left: 0;
                        right: 0;
                        background: white;
                        border: 1px solid #e1e5e9;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        max-height: 300px;
                        overflow-y: auto;
                        z-index: 9999;
                        display: none;
                        margin-top: 4px;
                    "
                ></div>
            </div>
        `;
        
        // Re-select elements after DOM replacement
        this.wrapper = document.querySelector(`[name="${name}"]`).parentElement;
        this.input = this.wrapper.querySelector('.auto-input');
        this.dropdown = this.wrapper.querySelector('.auto-dropdown');
        
        this.bindEvents();
    }
    
    bindEvents() {
        this.selectedIndex = -1; // Track selected item in dropdown
        
        this.input.addEventListener('focus', () => {
            this.input.removeAttribute('readonly');
        });

        this.input.addEventListener('blur', () => {
            if (!this.input.value) {
                this.input.setAttribute('readonly', true);
            }
        });
        
        this.input.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
            // Don't reset selectedIndex here - let handleInput/renderDropdown manage it
        });
        
        this.input.addEventListener('keydown', (e) => {
            const items = this.dropdown.querySelectorAll('.auto-item');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (items.length > 0) {
                    this.selectedIndex = this.selectedIndex < items.length - 1 ? this.selectedIndex + 1 : 0;
                    this.highlightItem(items);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (items.length > 0) {
                    this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : items.length - 1;
                    this.highlightItem(items);
                }
            } else if (e.key === 'Enter') {
                // Only autocomplete if dropdown is visible and item is selected
                if (this.dropdown.style.display === 'block' && this.selectedIndex >= 0 && items[this.selectedIndex]) {
                    e.preventDefault();
                    this.selectItem(items[this.selectedIndex]);
                }
            } else if (e.key === 'Tab') {
                // Only autocomplete if dropdown is visible and item is selected
                if (this.dropdown.style.display === 'block' && this.selectedIndex >= 0 && items[this.selectedIndex]) {
                    e.preventDefault();
                    this.selectItem(items[this.selectedIndex]);
                    
                    // Move focus to next element immediately after autocomplete
                    const focusableElements = document.querySelectorAll('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
                    const currentIndex = Array.from(focusableElements).indexOf(this.input);
                    if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {
                        focusableElements[currentIndex + 1].focus();
                    }
                }
            } else if (e.key === 'Escape') {
                this.hideDropdown();
                this.selectedIndex = -1;
            }
        });
        
        // Handle clicks on dropdown items
        this.dropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('auto-item')) {
                this.selectItem(e.target);
            }
        });
        
        // Handle hover events that respect keyboard selection
        this.dropdown.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('auto-item')) {
                const items = this.dropdown.querySelectorAll('.auto-item');
                const itemIndex = Array.from(items).indexOf(e.target);
                
                // Only change background if it's not the selected item
                if (itemIndex !== this.selectedIndex) {
                    e.target.style.backgroundColor = '#f8f9fa';
                }
            }
        });
        
        this.dropdown.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('auto-item')) {
                const items = this.dropdown.querySelectorAll('.auto-item');
                const itemIndex = Array.from(items).indexOf(e.target);
                
                // Only remove background if it's not the selected item
                if (itemIndex !== this.selectedIndex) {
                    e.target.style.backgroundColor = '';
                }
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.hideDropdown();
                this.selectedIndex = -1;
            }
        });
    }
    
    highlightItem(items) {
        // Remove highlight from all items
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.style.backgroundColor = 'rgba(237,67,67,0.5)';
                item.style.color = 'white';
                // Scroll into view if needed
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.style.backgroundColor = '';
                item.style.color = '';
            }
        });
    }
    
    selectItem(item) {
        const text = item.textContent.trim();
        this.input.value = text;
        this.hideDropdown();
        this.selectedIndex = -1;
        
        // Trigger input event to notify of change
        this.input.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Trigger custom select event
        this.input.dispatchEvent(new CustomEvent('select', { 
            detail: text,
            bubbles: true 
        }));
    }
    
    handleInput(value) {
        if (!value.trim()) {
            this.hideDropdown();
            return;
        }

        // Determine dataset based on input name/type or original element ID
        let dataset = [];
        const inputName = this.input.name;
        
        if (inputName === 'speciality' || this.originalId === 'auto-professions' || this.input.classList.contains('profession-input')) {
            // For speciality, create combined French-Arabic pairs
            const combinedResults = [];
            
            if (window.professions && window.specialitiesAR) {
                window.professions.forEach((frenchTerm, index) => {
                    const arabicTerm = window.specialitiesAR[index] || '';
                    
                    // Check if French term matches
                    const frenchMatches = frenchTerm.toLowerCase().includes(value.toLowerCase());
                    // Check if Arabic term matches
                    const arabicMatches = arabicTerm.includes(value);
                    
                    if (frenchMatches || arabicMatches) {
                        combinedResults.push(`${frenchTerm} - ${arabicTerm}`);
                    }
                });
            }
            
            
            dataset = combinedResults;
        } else if (inputName === 'city' || this.originalId === 'auto-cities' || this.input.classList.contains('city-input')) {
            // For city, create combined French-Arabic pairs
            const combinedResults = [];
            
            if (window.cities && window.citiesAR) {
                window.cities.forEach((frenchTerm, index) => {
                    const arabicTerm = window.citiesAR[index] || '';
                    
                    // Check if French term matches
                    const frenchMatches = frenchTerm.toLowerCase().includes(value.toLowerCase());
                    // Check if Arabic term matches
                    const arabicMatches = arabicTerm.includes(value);
                    
                    if (frenchMatches || arabicMatches) {
                        combinedResults.push(`${frenchTerm} - ${arabicTerm}`);
                    }
                });
            }
            
            
            dataset = combinedResults;
        } else {
            // Fallback to the words attribute
            dataset = this.words;
        }
        
        const filtered = dataset.filter(word => 
            word.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 8); // Limit to 8 results
        
        this.renderDropdown(filtered, value);
    }
    
    renderDropdown(filtered, searchTerm) {
        if (filtered.length === 0) {
            this.hideDropdown();
                return;
        }
        
        this.dropdown.innerHTML = filtered.map(word => {
            // Highlight matching text
            const highlighted = word.replace(
                new RegExp(`(${searchTerm})`, 'gi'), 
                '<mark style="background: yellow;">$1</mark>'
            );
            
                         return `
                 <div 
                     class="auto-item" 
                     style="
                         padding: 12px 16px;
                         cursor: pointer;
                         border-bottom: 1px solid #f8f9fa;
                         transition: background-color 0.2s ease;
                         font-size: 14px;
                         line-height: 1.4;
                     "
                     data-value="${word}"
                 >
                     ${highlighted}
                 </div>
             `;
        }).join('');
        
        this.showDropdown();
        
        // Auto-select the first item
        this.selectedIndex = 0;
        const items = this.dropdown.querySelectorAll('.auto-item');
        if (items.length > 0) {
            this.highlightItem(items);
        }
    }
    
    showDropdown() {
        this.dropdown.style.display = 'block';
    }
    
    hideDropdown() {
        this.dropdown.style.display = 'none';
    }

    get value() {
        return this.input.value;
    }

    addWord(word) {
        if (!this.words.includes(word)) {
            this.words.push(word);
        }
    }
}

// Usage example:
// const autoInput = new AutoInput('auto-input');