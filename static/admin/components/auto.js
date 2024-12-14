class AutoInput {
    static css = `
        <style>
            .input-container {
                width:100%;
                --fs:20px;
                --ff:sans-serif;
                position: relative;
                background-color: var(--bg,#ffffff);
                min-width: 100px;
                min-height: 50px;
                border-radius: 5px;
                font-size:var(--fs);
            }

            .myinput {
                outline: none;
                border: none;
                background-color: transparent;
                position: absolute;
                width: 100%; 
                height: 100%; 
                color: #000000;
                padding: 0 7px;
                font-size:var(--fs) !important;
                z-index: 1; 
                line-height:1.2em;
            }

            .suggestion {
                display: flex; 
                align-items: center; 
                width: 100%; 
                height: 100%; 
                position: absolute;
                z-index: 0; 
                top: 0;
                left: 0;
                padding: 0 7px;
                color: #868686;
                font-size:var(--fs) !important;
                white-space:nowrap;
                line-height:1.2em;
            }

            @media screen and (max-width:600px) {
                .input-container {
                    width: 80vw;
                }
            }
        </style>
    `;

    constructor(selector) {
        document.head.insertAdjacentHTML('beforeend', AutoInput.css);

        this.element = document.querySelector(selector);
        if (!this.element) {
            console.error(`Element with selector ${selector} not found.`);
            return;
        }

        const inputContainer = document.createElement('div');
        inputContainer.title = "double tap space to autocomplete";
        inputContainer.classList.add('input-container');

        this.input = document.createElement('input');

        this.input.setAttribute('type', 'text');
        this.input.setAttribute('placeholder', this.element.getAttribute('placeholder') || '');
        this.input.classList.add("myinput"); // Added class
        this.input.value = this.element.getAttribute('value') || ''; // Set initial value
        this.input.setAttribute('name', this.element.getAttribute('name') || ''); // Added name attribute
        if (this.element.hasAttribute('disabled')) {
            this.input.setAttribute('disabled', 'disabled'); // Added disabled attribute if present
        }
        inputContainer.appendChild(this.input);

        this.suggestion = document.createElement('span');
        this.suggestion.classList.add("suggestion");
        inputContainer.appendChild(this.suggestion);

        this.element.appendChild(inputContainer);

        // Parse the words attribute as JSON
        this._words = new Set();
        const wordsAttribute = this.element.getAttribute('words');
        if (wordsAttribute) {
            this.words = JSON.parse(wordsAttribute) || [];
        }

        this.element.addEventListener('input', (e) => this.handleInput(e));
        this.element.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }


    handleInput(e) {
        if (e && e.inputType && e.inputType === "insertText" && e.data === ' ') {
            if (this.xxx) {
                this.input.value = this.xxx;
                this.xxx = null;
                return;
            }
            if (this.suggestion.textContent) {
                this.xxx = this.suggestion.textContent
            }
        }
        const inputValue = this.input.value.toLowerCase();
        if (inputValue.trim() === inputValue) {
            this.input.value = inputValue;
        }
        if (inputValue.includes("*")) {
            return
        }

        const regex = new RegExp("^" + inputValue, "i");
        for (let word of this.words) {
            if (regex.test(word) && inputValue !== "") {
                this.suggestion.textContent = word;
                return;
            }
        }

        this.suggestion.textContent = '';
    }

    handleKeyDown(e) {
        var key = e.key;
        if ((key === 'Tab' || e.key === 'Enter') && this.suggestion.textContent !== "") {
            this.input.value = this.suggestion.textContent;
            this.suggestion.textContent = '';
            this.userSelectedSuggestion = true;

            // Dispatch custom event indicating user selected a suggestion
            const suggestionSelectedEvent = new CustomEvent('select', {
                detail: this.input.value
            });
            this.element.dispatchEvent(suggestionSelectedEvent);
        }
    }

    addWord(word) {
        this._words.add(word);
        this.handleInput();
    }

    static get observedAttributes() {
        return ['placeholder', 'value'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'placeholder') {
            this.input.setAttribute('placeholder', newValue);
        } else if (name === 'value') {
            this.input.value = newValue;
        }
    }

    get value() {
        return this.input.value;
    }

    set value(newValue) {
        this.input.value = newValue;
        this.handleInput();
    }

    get placeholder() {
        return this.element.getAttribute('placeholder');
    }

    set placeholder(newValue) {
        this.element.setAttribute('placeholder', newValue);
    }

    get words() {
        return Array.from(this._words);
    }

    set words(newWords) {
        if (Array.isArray(newWords)) {
            this._words = new Set(newWords);
        } else if (typeof newWords === 'string') {
            const wordsArray = newWords.split(',').map(word => word.trim());
            this._words = new Set(wordsArray);
        } else if (newWords instanceof Set) {
            this._words = newWords;
        } else {
            console.error("Invalid value for words attribute. Expected an array, a string, or a Set.", newWords, typeof (newWords));
            return;
        }

        // Trigger handleInput to update suggestion based on the new words
        this.handleInput();
    }
}

// Usage example:
// const autoInput = new AutoInput('auto-input');