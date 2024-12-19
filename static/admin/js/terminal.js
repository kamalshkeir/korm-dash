let sessionId = Date.now().toString();
let isReady = true;
const output = document.getElementById('output');
const input = document.getElementById('command-input');
const closeBtn = document.querySelector('.terminal-button.close');

// Command history
const commandHistory = [];
let historyIndex = -1;

async function executeCommand(command) {
    if (!isReady) {
        appendOutput('Command in progress...\n');
        return;
    }

    try {
        isReady = false;
        appendOutput(`$ ${command}\n`);

        const response = await fetch( `${adminPath}/terminal/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                command: command,
                session: sessionId
            })
        });

        const result = await response.json();
        
        if (result.type === "output") {
            if (result.content === "CLEAR") {
                output.textContent = '';
            } else {
                appendOutput(result.content + '\n');
            }
        }
    } catch (error) {
        appendOutput(`Error: ${error.message}\n`);
    } finally {
        isReady = true;
    }
}

// Update the event listener
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const command = input.value.trim();
        if (command) {
            commandHistory.unshift(command);
            historyIndex = -1;
            executeCommand(command);
            input.value = '';
        }
    }
});

function appendOutput(text) {
    output.textContent += text;
    output.scrollTop = output.scrollHeight;
}

input.addEventListener('keydown', async (e) => {
    switch(e.key) {
        case 'Tab':
            e.preventDefault();
            const completions = await getCompletions(input.value);
            if (completions.length === 1) {
                if (input.value.includes(' ')) {
                    const parts = input.value.split(' ');
                    parts[parts.length - 1] = completions[0].text;
                    input.value = parts.join(' ');
                } else {
                    input.value = completions[0].text;
                }
            } else if (completions.length > 1) {
                appendOutput('\n');
                completions.forEach(c => appendOutput(c.display + '\n'));
                appendOutput(`\n$ ${input.value}`);
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            if (commandHistory.length > 0) {
                historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
                input.value = commandHistory[historyIndex];
                // Move cursor to end of input
                setTimeout(() => input.selectionStart = input.selectionEnd = input.value.length, 0);
            }
            break;
            
        case 'ArrowDown':
            e.preventDefault();
            if (historyIndex > -1) {
                historyIndex--;
                input.value = historyIndex >= 0 ? commandHistory[historyIndex] : '';
                // Move cursor to end of input
                setTimeout(() => input.selectionStart = input.selectionEnd = input.value.length, 0);
            }
            break;
    }
});

closeBtn.addEventListener('click', () => {
    if (sessionId) {
        isReady = false;
        sessionId = null;
        input.disabled = true;
        output.textContent = '';
    }
});

// Initial setup
appendOutput('Connected to terminal server\n');
appendOutput('Terminal ready...\n');
input.disabled = false;
input.focus();

function getFlagDescription(flag) {
    const descriptions = {
        "-l": "List in long format",
        "-a": "Show hidden files",
        "-h": "Human readable sizes",
        "-r": "Reverse order",
        "-f": "Force remove",
        "-i": "Interactive mode",
        "-p": "Create parent directories",
        "--help": "Show help",
        // Add other flag descriptions...
    };
    return descriptions[flag] || "No description available";
}

// Add this function back
async function getCompletions(input) {
    try {
        const response = await fetch(`${adminPath}/terminal/complete?input=${encodeURIComponent(input)}`);
        const result = await response.json();
        
        switch (result.type) {
            case 'command':
                return formatCommandCompletions(result.completions);
            case 'flag':
                return formatFlagCompletions(result.completions);
            case 'path':
                return formatPathCompletions(result.completions);
            case 'env':
                return formatEnvCompletions(result.completions);
            default:
                return result.completions;
        }
    } catch (error) {
        return [];
    }
}

function formatCommandCompletions(completions) {
    return completions.map(cmd => ({
        text: cmd,
        display: cmd
    }));
}

function formatFlagCompletions(completions) {
    return completions.map(flag => ({
        text: flag,
        display: `${flag} - ${getFlagDescription(flag)}`
    }));
}

function formatPathCompletions(completions) {
    return completions.map(path => ({
        text: path,
        display: path.endsWith('/') ? `📁 ${path}` : `📄 ${path}`
    }));
}

function formatEnvCompletions(completions) {
    return completions.map(env => ({
        text: env,
        display: `🔧 ${env}`
    }));
}

// Add click handler to focus input when clicking anywhere in terminal
document.querySelector('.terminal').addEventListener('click', () => {
    if (!input.disabled) {
        input.focus();
    }
});
