/* UsageAdd commentMore actions
let dad = new Dad(".container")
dad.OnDrop((files) => {
    console.log(files);
    dad.message="Drop your Files!"
    dad.size="Max File Size 25Mb"
    dad.error="some error"
})
*/
class Dad extends HTMLElement {
    static css = `
        *, :after, :before {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        :host {
            font-size: 18px;
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.5rem;
        }
        .droparea {
            margin: 1rem auto;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap:10px;
            width: 384px;
            max-width: 100%;
            border: 4px dashed grey;
            border-radius: 15px;
            overflow:hidden;
        }
        #btnf {
            padding: 8px 20px;
            border-radius: 5px;
            background: none;
            border: 2px dashed grey;
            outline:none;
            color:inherit;
            cursor:pointer;
        }
        #btnf:hover {
            background: black;
            outline:none;
            border: 2px dashed white;
            color:white;
        }
        
        .droparea svg {
            font-size: 3rem;
            flex-grow: 1;
            padding-top: 1rem;
        }

        .droparea p {
            width: 90%;
            text-align:center;
            overflow-wrap: break-word;
        }
        .droparea p.red {
            color:red;
        }
        
        .green-border {
            border-color: green;
        }
        .red-border {
            border-color: red;
        }

        .crop-container {
            margin: 1rem auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
            width: 384px;
            max-width: 100%;
        }
        .crop-canvas-wrapper {
            position: relative;
            width: 300px;
            height: 300px;
            border: 2px solid #ccc;
            border-radius: 50%;
            overflow: hidden;
            cursor: move;
            background: #f5f5f5;
        }
        #crop-canvas {
            display: block;
        }
        #crop-canvas.dark-mode {
            filter: invert(1) hue-rotate(180deg);
        }
        .crop-controls {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .crop-controls button {
            padding: 8px 16px;
            border-radius: 5px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }
        .crop-controls .btn-cancel {
            background: #6c757d;
            color: white;
        }
        .crop-controls .btn-cancel:hover {
            background: #5a6268;
        }
        .crop-controls .btn-validate {
            background: #28a745;
            color: white;
        }
        .crop-controls .btn-validate:hover {
            background: #218838;
        }
        .zoom-controls {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .zoom-controls button {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid #007bff;
            background: white;
            color: #007bff;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .zoom-controls button:hover {
            background: #007bff;
            color: white;
        }
        .crop-info {
            font-size: 12px;
            color: #666;
            text-align: center;
        }
    `;

    static get observedAttributes() {
        return ["message", "size", "error"];
    }

    constructor(selector = ".k-dad") {
        super(selector);
        this.message = "Drag and Drop";
        this.size = "Max File Size 25Mb";
        this.attachShadow({ mode: "open" });
        let style = document.createElement("style");
        style.innerHTML = Dad.css;
        this.shadowRoot.append(style);
        if (!document.querySelector(selector)) {
            console.error("selector Dad not found");
            return;
        }

        // Crop state
        this.cropImage = null;
        this.cropScale = 1;
        this.cropMinScale = 0.1; // Minimum scale dynamically set based on image
        this.cropMaxScale = 3;   // Maximum scale
        this.cropOffsetX = 0;
        this.cropOffsetY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;

        this.show();
        document.querySelector(selector).prepend(this);
    }

    get message() {
        return this.getAttribute("message");
    }
    set message(value) {
        return this.setAttribute("message", value);
    }
    get size() {
        return this.getAttribute("size");
    }
    set size(value) {
        return this.setAttribute("size", value);
    }
    get error() {
        return this.getAttribute("error");
    }
    set error(value) {
        return this.setAttribute("error", value);
    }

    remove() {
        document.body.removeChild(this);
    }

    OnDrop(callback) {
        this.callback = callback;
    }

    Duration(file) {
        return new Promise((resolve) => {
            const isAudio = ['video', 'audio'].some((word) => file.type.startsWith(word));
            if (!isAudio) {
                resolve({
                    file,
                    duration: 0
                })
                return;
            }
            var objectURL = URL.createObjectURL(file);
            var mySound = new Audio([objectURL]);
            mySound.addEventListener(
                "canplaythrough",
                () => {
                    URL.revokeObjectURL(objectURL);
                    resolve(mySound.duration);
                },
                false,
            );
        });
    }

    show() {
        this.droparea = document.createElement("section");
        this.droparea.classList.add("droparea");
        this.droparea.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="70px" height="70px" viewBox="0 0 24 24">
            <g>
                <path fill="none" d="M0 0h24v24H0z"/>
                <path fill-rule="nonzero" d="M16 13l6.964 4.062-2.973.85 2.125 3.681-1.732 1-2.125-3.68-2.223 2.15L16 13zm-2-7h2v2h5a1 1 0 0 1 1 1v4h-2v-3H10v10h4v2H9a1 1 0 0 1-1-1v-5H6v-2h2V9a1 1 0 0 1 1-1h5V6zM4 14v2H2v-2h2zm0-4v2H2v-2h2zm0-4v2H2V6h2zm0-4v2H2V2h2zm4 0v2H6V2h2zm4 0v2h-2V2h2zm4 0v2h-2V2h2z"/>
            </g>
        </svg>
        <input id="inf" type="file" multiple style="display:none">
        <p class="msg">${this.message}</p>
        <p style="font-weight:600;font-size:1em">OR</p>
        <button id="btnf">Upload</button>
        <p style="margin-bottom:10px"><small class="size">${this.size}</small></p>
        `;

        // Prevent all clicks in droparea from bubbling to parent dialog
        this.droparea.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        ['dragenter', 'dragover'].forEach(evtName => {
            this.droparea.addEventListener(evtName, (e) => {
                e.preventDefault();
                this.droparea.classList.add("green-border");
            });
        });
        this.droparea.addEventListener("dragleave", (e) => {
            e.preventDefault();
            this.droparea.classList.remove("red-border");
        });

        this.droparea.addEventListener("drop", (e) => {
            e.preventDefault();
            let el = this.droparea.querySelector("p.msg");
            el.classList.remove("red");
            el.textContent = this.message;
            const dt = e.dataTransfer;
            const fileArray = [...dt.files];
            this.handleFiles(fileArray);
        });
        this.shadowRoot.append(this.droparea);
        let btnUpload = this.droparea.querySelector("#btnf");
        let inUpload = this.droparea.querySelector("#inf");
        inUpload.addEventListener("change", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const fileList = inUpload.files;
            const fileArray = [...fileList];
            btnUpload.style.border = "2px dashed green"
            this.handleFiles(fileArray);
        })
        btnUpload.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            inUpload.click();
        })
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name == "message" && this.droparea) {
            this.droparea.querySelector("p.msg").textContent = newValue;
        } else if (name == "size" && this.droparea) {
            this.droparea.querySelector(".size").textContent = newValue;
        } else if (name == "error" && this.droparea) {
            this.droparea.classList.add("red-border");
            let el = this.droparea.querySelector("p.msg");
            el.classList.add("red");
            el.textContent = newValue;
        }
    }

    handleFiles(fileArray) {
        if (!fileArray || fileArray.length === 0) return;

        const file = fileArray[0];

        // Check if it's an image
        if (file.type.startsWith('image/')) {
            this.showCropInterface(file);
        } else {
            // Not an image, proceed normally
            if (this.callback) {
                this.callback(fileArray);
            }
        }
    }

    showCropInterface(file) {
        // Hide droparea
        if (this.droparea) {
            this.droparea.style.display = 'none';
        }

        // Create crop container
        const cropContainer = document.createElement('div');
        cropContainer.classList.add('crop-container');
        cropContainer.innerHTML = `
            <div class="crop-info">Drag to reposition • Zoom to adjust</div>
            <div class="crop-canvas-wrapper">
                <canvas id="crop-canvas" width="300" height="300"></canvas>
            </div>
            <div class="zoom-controls">
                <button id="zoom-out" title="Zoom out">-</button>
                <button id="zoom-in" title="Zoom in">+</button>
            </div>
            <div class="crop-controls">
                <button class="btn-cancel">Cancel</button>
                <button class="btn-validate">Validate</button>
            </div>
        `;

        // Prevent all clicks in crop container from bubbling
        cropContainer.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        this.shadowRoot.append(cropContainer);

        // Load image
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.cropImage = img;
                this.initCrop();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Setup event listeners
        const canvas = cropContainer.querySelector('#crop-canvas');
        this.updateCanvasDarkMode(canvas);
        const wrapper = cropContainer.querySelector('.crop-canvas-wrapper');

        wrapper.addEventListener('mousedown', (e) => this.startDrag(e));
        wrapper.addEventListener('mousemove', (e) => this.drag(e));
        wrapper.addEventListener('mouseup', () => this.stopDrag());
        wrapper.addEventListener('mouseleave', () => this.stopDrag());

        // Touch events for mobile
        wrapper.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
        wrapper.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.drag(e.touches[0]);
        });
        wrapper.addEventListener('touchend', () => this.stopDrag());

        cropContainer.querySelector('#zoom-in').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.cropScale = Math.min(this.cropScale + 0.01, this.cropMaxScale);
            this.drawCrop();
        });

        cropContainer.querySelector('#zoom-out').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.cropScale = Math.max(this.cropScale - 0.01, this.cropMinScale);
            this.drawCrop();
        });

        cropContainer.querySelector('.btn-cancel').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.cancelCrop();
        });

        cropContainer.querySelector('.btn-validate').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.validateCrop(file);
        });
    }

    initCrop() {
        const canvas = this.shadowRoot.querySelector('#crop-canvas');
        const canvasSize = 300;

        // Calculate initial scale to fit image in circle
        const imgAspect = this.cropImage.width / this.cropImage.height;
        if (imgAspect > 1) {
            // Landscape
            this.cropScale = canvasSize / this.cropImage.height;
        } else {
            // Portrait or square
            this.cropScale = canvasSize / this.cropImage.width;
        }

        // Set minimum scale to 80% of initial scale (to allow slight zoom out)
        this.cropMinScale = this.cropScale * 0.8;

        // Center image
        this.cropOffsetX = 0;
        this.cropOffsetY = 0;

        this.drawCrop();
    }

    drawCrop() {
        const canvas = this.shadowRoot.querySelector('#crop-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const canvasSize = 300;

        // Clear canvas
        ctx.clearRect(0, 0, canvasSize, canvasSize);

        // Calculate scaled dimensions
        const scaledWidth = this.cropImage.width * this.cropScale;
        const scaledHeight = this.cropImage.height * this.cropScale;

        // Calculate position (centered + offset)
        const x = (canvasSize - scaledWidth) / 2 + this.cropOffsetX;
        const y = (canvasSize - scaledHeight) / 2 + this.cropOffsetY;

        // Save context
        ctx.save();

        // Create circular clipping path
        ctx.beginPath();
        ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Draw image
        ctx.drawImage(this.cropImage, x, y, scaledWidth, scaledHeight);

        // Restore context
        ctx.restore();

        // Draw circle border
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2 - 1, 0, Math.PI * 2);
        ctx.stroke();
    }

    startDrag(e) {
        this.isDragging = true;
        this.dragStartX = e.clientX - this.cropOffsetX;
        this.dragStartY = e.clientY - this.cropOffsetY;
    }

    drag(e) {
        if (!this.isDragging) return;

        const canvasSize = 300;
        const scaledWidth = this.cropImage.width * this.cropScale;
        const scaledHeight = this.cropImage.height * this.cropScale;

        // Calculate new offsets
        let newOffsetX = e.clientX - this.dragStartX;
        let newOffsetY = e.clientY - this.dragStartY;

        // Calculate the boundaries to keep image inside circle
        // The image center should not go beyond the circle radius
        const maxOffsetX = Math.max(0, (scaledWidth - canvasSize) / 2);
        const maxOffsetY = Math.max(0, (scaledHeight - canvasSize) / 2);

        // Clamp the offsets
        this.cropOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newOffsetX));
        this.cropOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, newOffsetY));

        this.drawCrop();
    }

    stopDrag() {
        this.isDragging = false;
    }

    cancelCrop() {
        // Remove crop container
        const cropContainer = this.shadowRoot.querySelector('.crop-container');
        if (cropContainer) {
            cropContainer.remove();
        }

        // Disconnect dark mode observer
        if (this.darkModeObserver) {
            this.darkModeObserver.disconnect();
            this.darkModeObserver = null;
        }

        // Show droparea again
        if (this.droparea) {
            this.droparea.style.display = 'flex';
        }

        // Reset crop state
        this.cropImage = null;
        this.cropScale = 1;
        this.cropMinScale = 0.1;
        this.cropMaxScale = 3;
        this.cropOffsetX = 0;
        this.cropOffsetY = 0;
    }

    updateCanvasDarkMode(canvas) {
        if (!canvas) return;
        
        // Check if body has dark class
        if (document.body.classList.contains('dark')) {
            canvas.classList.add('dark-mode');
        } else {
            canvas.classList.remove('dark-mode');
        }

        // Watch for changes to body class
        if (!this.darkModeObserver) {
            this.darkModeObserver = new MutationObserver(() => {
                const currentCanvas = this.shadowRoot.querySelector('#crop-canvas');
                if (currentCanvas) {
                    if (document.body.classList.contains('dark')) {
                        currentCanvas.classList.add('dark-mode');
                    } else {
                        currentCanvas.classList.remove('dark-mode');
                    }
                }
            });
            
            this.darkModeObserver.observe(document.body, {
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }

    validateCrop(originalFile) {
        const canvas = this.shadowRoot.querySelector('#crop-canvas');
        if (!canvas) return;

        // Convert canvas to blob
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Failed to create blob from canvas');
                return;
            }

            // Create a new File object with the original filename
            const croppedFile = new File(
                [blob],
                originalFile.name,
                { type: 'image/jpeg', lastModified: Date.now() }
            );

            // Call the original callback with the cropped image
            if (this.callback) {
                this.callback([croppedFile]);
            }

            // Disconnect dark mode observer
            if (this.darkModeObserver) {
                this.darkModeObserver.disconnect();
                this.darkModeObserver = null;
            }

            // Clean up crop interface
            const cropContainer = this.shadowRoot.querySelector('.crop-container');
            if (cropContainer) {
                cropContainer.remove();
            }

            // Show droparea again for next use
            if (this.droparea) {
                this.droparea.style.display = 'flex';
            }
        }, 'image/jpeg', 0.9);
    }
}

customElements.define("k-dad", Dad);