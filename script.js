document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const folderInput = document.getElementById('folder-input');
    const selectFolderBtn = document.getElementById('select-folder-button');
    const galleryContainer = document.getElementById('gallery-container');
    const searchInput = document.getElementById('search-input');
    const backButton = document.getElementById('back-button');
    const notification = document.getElementById('notification');

    // --- State Variables ---
    let allStickers = []; // Master list of all sticker objects
    let currentView = 'categories'; // 'categories' or 'stickers'
    let lastCategoryViewed = '';
    
    // --- Event Listeners ---
    selectFolderBtn.addEventListener('click', () => folderInput.click());
    folderInput.addEventListener('change', handleFileSelect);
    backButton.addEventListener('click', showCategoryPreviews);
    searchInput.addEventListener('input', handleSearch);

    // Use event delegation for gallery clicks
    galleryContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.card');
        if (!card) return;

        if (card.classList.contains('category-card')) {
            const category = card.dataset.category;
            lastCategoryViewed = category;
            showStickersByCategory(category);
        } else if (card.classList.contains('sticker-card')) {
            const stickerPath = card.dataset.path;
            copyStickerToClipboard(stickerPath);
        }
    });

    /**
     * Processes the user-selected folder and files.
     * @param {Event} e - The change event from the file input.
     */
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length === 0) {
            showEmptyState("No files found in the selected folder.");
            return;
        }

        allStickers = [];
        const allowedExtensions = ['.png'];
        
        Array.from(files).forEach(file => {
            const path = file.webkitRelativePath;
            const isPng = allowedExtensions.some(ext => path.toLowerCase().endsWith(ext));
            
            if(isPng) {
                const pathParts = path.split('/');
                
                const category = pathParts.length > 2 ? pathParts[1] : 'Uncategorized';
                
                allStickers.push({
                    path: path,
                    category: category,
                    file: file,
                    url: URL.createObjectURL(file) // Create URL once for performance
                });
            }
        });

        if (allStickers.length === 0) {
            showEmptyState("No PNG stickers found. Please check your folder structure.");
            return;
        }
        
        showCategoryPreviews();
    }

    /**
     * Renders the main category preview grid.
     */
    function showCategoryPreviews() {
        const categories = [...new Set(allStickers.map(s => s.category))];
        
        galleryContainer.innerHTML = '';
        
        if (categories.length === 0 && allStickers.length > 0) {
             showStickersByCategory('Uncategorized');
             return;
        }
        
        if (categories.length === 0) {
            showEmptyState("No categories found. Please organize stickers into subfolders.");
            return;
        }

        categories.sort().forEach(category => {
            const firstStickerOfCategory = allStickers.find(s => s.category === category);
            if (firstStickerOfCategory) {
                const card = document.createElement('div');
                card.className = 'card category-card';
                card.dataset.category = category;
                card.innerHTML = `
                    <div class="card-image-wrapper">
                        <img src="${firstStickerOfCategory.url}" alt="${category} preview" loading="eager">
                    </div>
                    <div class="category-name">${category}</div>
                `;
                galleryContainer.appendChild(card);
            }
        });
        
        currentView = 'categories';
        backButton.style.display = 'none';
        searchInput.value = ''; // Clear search when going back
    }

    /**
     * Renders all stickers belonging to a specific category.
     * @param {string} category - The category name to display.
     */
    function showStickersByCategory(category) {
        const stickersInCategory = allStickers.filter(s => s.category === category);
        
        renderStickerGrid(stickersInCategory, `No stickers found in the "${category}" category.`);
        
        currentView = 'stickers';
        backButton.style.display = 'inline-block';
    }

    /**
     * Filters and displays stickers based on the search query.
     */
    function handleSearch() {
        const query = searchInput.value.toLowerCase().trim();
        
        if (!query) {
            // Restore previous view when search is cleared
            if (currentView === 'stickers') {
                showStickersByCategory(lastCategoryViewed);
            } else {
                showCategoryPreviews();
            }
            return;
        }
        
        const searchResults = allStickers.filter(s => 
            s.path.toLowerCase().includes(query)
        );
        
        renderStickerGrid(searchResults, `No stickers found for "${query}".`);
        backButton.style.display = 'inline-block';
    }
    
    /**
     * Renders a grid of sticker cards.
     * @param {Array} stickers - Array of sticker objects to render.
     * @param {string} emptyMessage - Message to show if the array is empty.
     */
    function renderStickerGrid(stickers, emptyMessage) {
        galleryContainer.innerHTML = '';
        if (stickers.length === 0) {
            showEmptyState(emptyMessage);
            return;
        }
        
        const fragment = document.createDocumentFragment();
        stickers.forEach(sticker => {
            const card = document.createElement('div');
            card.className = 'card sticker-card';
            card.dataset.path = sticker.path;
            card.innerHTML = `<img src="${sticker.url}" alt="${sticker.path}" loading="eager">`;
            fragment.appendChild(card);
        });
        galleryContainer.appendChild(fragment);
    }
    
    /**
     * Displays a message in the gallery area.
     * @param {string} message - The message to display.
     */
    function showEmptyState(message) {
         galleryContainer.innerHTML = `<div class="empty-state-message">${message}</div>`;
    }

    /**
     * Copies a sticker image to the user's clipboard.
     * @param {string} stickerPath - The path of the sticker to copy.
     */
    async function copyStickerToClipboard(stickerPath) {
        const stickerToCopy = allStickers.find(s => s.path === stickerPath);
        if (!stickerToCopy) return;

        try {
            // Modern Clipboard API for images
            const clipboardItem = new ClipboardItem({
                'image/png': stickerToCopy.file
            });
            await navigator.clipboard.write([clipboardItem]);
            showNotification('Sticker copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy image:', err);
            showNotification('Error: Could not copy sticker.', true);
        }
    }
    
    let notificationTimeout;
    /**
     * Shows a brief notification message.
     * @param {string} message - The message to display.
     * @param {boolean} isError - If true, styles as an error.
     */
    function showNotification(message, isError = false) {
        notification.textContent = message;
        notification.style.backgroundColor = isError ? '#b00020' : 'var(--highlight-color)';
        notification.classList.add('show');
        
        clearTimeout(notificationTimeout);
        notificationTimeout = setTimeout(() => {
            notification.classList.remove('show');
        }, 2500);
    }
});
