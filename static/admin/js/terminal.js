// Basic setup
const terminalSession = Date.now().toString();
const output = document.getElementById('output');
const input = document.getElementById('command-input');
const closeBtn = document.querySelector('.terminal-button.close');
const commandHistory = [];
let historyIndex = -1;

// Common commands for autocomplete
const commonCommands = [
    'ls', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep',
    'echo', 'touch', 'chmod', 'chown', 'find', 'clear', 'history',
    'ps', 'kill', 'df', 'du', 'tar', 'zip', 'unzip', 'ssh', 'scp'
];

// Execute commands
async function executeCommand(command) {
    if (!command) return;
    output.innerHTML += `<div class="command-line">$ ${command}</div>`;
    
    try {
        const response = await fetch(`${adminPath}/terminal/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command, session: terminalSession })
        });
        
        const result = await response.json();
        if (result.content === "CLEAR") {
            output.textContent = '';
        } else {
            // Format the output for ls command
            if (command.startsWith('ls')) {
                const lines = result.content.split('\n');
                const formattedLines = lines.map(line => {
                    if (!line.trim()) return '';
                    const parts = line.match(/\[(.*?)\]\s+(\d+)\s+(.+)/);
                    if (!parts) return line;

                    const [_, type, size, name] = parts;
                    const isDir = type === 'D';
                    
                    return `<div class="ls-line">
                        <span class="ls-icon">${isDir ? '📁' : '📄'}</span>
                        <span class="${isDir ? 'ls-dir' : 'ls-file'}">${name}</span>
                        ${size !== '0' ? `<span class="ls-size">${formatSize(parseInt(size))}</span>` : ''}
                    </div>`;
                }).join('');
                
                output.innerHTML += `<div class="ls-output">${formattedLines}</div>`;
            } else {
                output.innerHTML += `<div class="command-output">${result.content}</div>`;
            }
        }
    } catch (error) {
        output.innerHTML += `<div class="error-output">Error: ${error.message}</div>`;
    }
    output.scrollTop = output.scrollHeight;
}

// Helper function to format file sizes
function formatSize(bytes) {
    if (bytes === 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// Event listeners
input.addEventListener('keydown', async (e) => {
    switch(e.key) {
        case 'Enter':
            const command = input.value.trim();
            if (command) {
                commandHistory.unshift(command);
                historyIndex = -1;
                await executeCommand(command);
                input.value = '';
            }
            break;
            
        case 'Tab':
            e.preventDefault();
            const inputValue = input.value.trim();
            if (!inputValue) return;

            try {
                const response = await fetch(`${adminPath}/terminal/complete?input=${encodeURIComponent(inputValue)}&session=${terminalSession}`);
                const data = await response.json();
                if (data && data.suggestions && data.suggestions.length > 0) {
                    // Preserve the command part
                    const parts = inputValue.split(' ');
                    if (parts.length > 1) {
                        // If there's a command, keep it and add the suggestion
                        const command = parts[0];
                        const lastPart = parts[parts.length - 1];
                        // Check if we're completing a path
                        if (lastPart.includes('/')) {
                            // Replace only the last part of the path
                            parts[parts.length - 1] = data.suggestions[0];
                            input.value = parts.join(' ');
                        } else {
                            input.value = `${command} ${data.suggestions[0]}`;
                        }
                    } else {
                        // If no command, just use the suggestion
                        input.value = data.suggestions[0];
                    }
                }
            } catch (error) {
                console.error('Completion error:', error);
            }
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            if (commandHistory.length > 0) {
                historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
                input.value = commandHistory[historyIndex];
                input.selectionStart = input.selectionEnd = input.value.length;
            }
            break;
            
        case 'ArrowDown':
            e.preventDefault();
            if (historyIndex > -1) {
                historyIndex--;
                input.value = historyIndex >= 0 ? commandHistory[historyIndex] : '';
                input.selectionStart = input.selectionEnd = input.value.length;
            }
            break;
    }
});

// Click to focus
document.querySelector('.terminal').addEventListener('click', () => {
    if (!input.disabled) input.focus();
});

// Close button
closeBtn.addEventListener('click', () => {
    input.disabled = true;
    output.textContent = '';
});

// Initial setup
output.textContent = 'Terminal ready...\n';
input.disabled = false;
input.focus();

// Add these styles to make the terminal look better
const style = document.createElement('style');
style.textContent = `
    .terminal {
        background-color: #1e1e1e;
        color: #d4d4d4;
        font-family: 'Consolas', 'Monaco', monospace;
        padding: 12px;
        line-height: 1.2;
        font-size: 14px;
    }
    
    #output {
        white-space: pre-wrap;
        word-wrap: break-word;
    }
    
    .command-line {
        color: #98c379;
        margin: 4px 0;
        font-weight: bold;
    }

    .command-output {
        margin: 4px 0 12px 0;
        white-space: pre-wrap;
    }

    .error-output {
        color: #e06c75;
        margin: 4px 0 12px 0;
    }

    .ls-output {
        margin: 4px 0 12px 0;
    }
    
    .ls-line {
        display: grid;
        grid-template-columns: 24px auto 80px;
        gap: 8px;
        padding: 2px 0;
        margin-left: 8px;
        align-items: center;
    }

    .ls-icon {
        font-size: 14px;
        width: 24px;
        text-align: center;
    }

    .ls-dir {
        color: #4a9eff;
    }

    .ls-file {
        color: #d4d4d4;
    }

    .ls-size {
        color: #808080;
        font-size: 13px;
        text-align: right;
    }

    #command-input {
        color: #d4d4d4;
        caret-color: #d4d4d4;
        background: transparent;
        border: none;
        outline: none;
        font-family: inherit;
        font-size: inherit;
        width: 100%;
    }

    .prompt {
        color: #98c379;
        font-weight: bold;
        margin-right: 8px;
    }
`;
document.head.appendChild(style);
