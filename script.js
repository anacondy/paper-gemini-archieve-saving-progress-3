// The complete and corrected script.js file.
document.addEventListener('DOMContentLoaded', () => {
    const output = document.getElementById('output');
    const searchModal = document.getElementById('search-modal');
    const searchInput = document.getElementById('search-input');

    // This will be filled with data from our server's API.
    let livePapersDB = [];

    // --- Helper Functions ---
    function addLine(text, className = '') {
        const line = document.createElement('div');
        line.innerHTML = text;
        line.className = `line ${className}`;
        output.appendChild(line);
        window.scrollTo(0, document.body.scrollHeight);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function showProgressBar(text, duration) {
        const line = document.createElement('div');
        line.className = 'line progress-bar-container';
        line.innerHTML = `<span>${text}</span><div class="progress-bar"></div>`;
        output.appendChild(line);
        await sleep(duration);
        line.remove();
    }

    async function fetchDeviceInfo() {
        addLine('Device Information:');
        const cores = navigator.hardwareConcurrency || 'N/A';
        addLine(`  - Logical CPU Cores: <span class="highlight">${cores}</span>`);
        const memory = navigator.deviceMemory ? `${navigator.deviceMemory} GB (browser approx.)` : 'N/A';
        addLine(`  - Device Memory (RAM): <span class="highlight">${memory}</span>`);
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            const usageMB = (estimate.usage / 1024 / 1024).toFixed(2);
            const quotaMB = (estimate.quota / 1024 / 1024).toFixed(2);
            addLine(`  - Browser Storage Quota: <span class="highlight">${usageMB} MB used / ${quotaMB} MB total</span>`);
        } else {
            addLine('  - Browser Storage: API not supported.');
        }
        addLine('// Note: Browser security prevents access to total disk space or system RAM.', 'comment');
    }

    function handleAdminShortcut() {
        addLine('// Admin access requested.', 'comment');
        const promptLine = document.createElement('div');
        promptLine.className = 'line';
        promptLine.innerHTML = `<span class="purple-prompt">// Please enter your name to proceed: </span>`;
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'command';
        nameInput.style.background = 'transparent';
        nameInput.style.border = 'none';
        nameInput.style.outline = 'none';
        nameInput.style.width = '200px';
        promptLine.appendChild(nameInput);
        output.appendChild(promptLine);
        nameInput.focus();
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const adminName = nameInput.value;
                if (adminName) {
                    addLine(`// Welcome, ${adminName}. Redirecting to admin panel...`, 'comment');
                    setTimeout(() => {
                        window.location.href = '/admin';
                    }, 1500);
                }
            }
        });
    }

    // --- Main Functions ---
    function performSearch(query) {
        if (!query) return;

        if (query.trim().toLowerCase() === 'upload') {
            handleAdminShortcut();
            return;
        }

        addLine(`<span class="prompt">user@archives:~$</span> <span class="command">search --query="${query}"</span>`);

        showProgressBar('Searching database...', 1000).then(() => {
            const lowerQuery = query.toLowerCase();
            const results = livePapersDB.filter(paper => {
                const fullText = `${paper.class} ${paper.subject} ${paper.year} ${paper.original_name} ${paper.exam_type}`;
                return fullText.toLowerCase().includes(lowerQuery);
            });

            if (results.length > 0) {
                addLine(`Found <span class="highlight">${results.length}</span> result(s):`);
                results.forEach(paper => {
                    const title = `${paper.class} ${paper.subject} (Sem ${paper.semester}) - ${paper.year}`;
                    addLine(`  <div class="search-result">[${paper.year}] <a href="${paper.url}" target="_blank">${title}</a></div>`);
                });
            } else {
                addLine('No results found for your query.');
            }
            addLine('<br/>// Press <span class="highlight">Ctrl + K</span> to search again.');
        });
    }

    async function start() {
        addLine('// Welcome to the Terminal Archives.', 'comment');
        await sleep(500);

        await showProgressBar('Connecting to archives...', 1500);
        try {
            const response = await fetch('/api/papers');
            livePapersDB = await response.json();
            addLine(`// Connected. <span class="highlight">${livePapersDB.length}</span> papers found in the database.`);
        } catch (error) {
            addLine('// Connection to archives failed. Please check the server.', 'comment');
            console.error('Fetch error:', error);
        }

        await sleep(500);
        await showProgressBar('Initializing system...', 1000);
        addLine('<span class="prompt">system@archives:~$</span> <span class="command">fetch --device-info</span>');
        await fetchDeviceInfo();

        await sleep(500);
        addLine('<span class="prompt">system@archives:~$</span> <span class="command">ready</span>');
        addLine('System ready. Press <span class="highlight">Ctrl + K</span> to search the database.');
    }

    // --- Event Listeners ---
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchModal.classList.remove('hidden');
            searchInput.focus();
            searchInput.value = '';
        }
        if (e.key === 'Escape') {
            if (!searchModal.classList.contains('hidden')) {
                searchModal.classList.add('hidden');
            }
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchModal.classList.add('hidden');
            performSearch(searchInput.value);
        }
    });

    // --- Start the application ---
    start();
});
