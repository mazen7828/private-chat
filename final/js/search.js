// Search Functionality Module

const searchState = {
    term: '',
    matches: [],
    currentIndex: -1
};

function handleSearch(elements) {
    const term = elements.searchInput.value.trim();
    searchState.term = term;
    
    elements.searchClearBtn.style.display = term ? 'flex' : 'none';
    
    if (!term) {
        clearSearchHighlights(elements);
        elements.searchControls.style.display = 'none';
        return;
    }
    
    searchState.matches = [];
    const normalizedTerm = term.toLowerCase();
    
    state.messages.forEach((msg, index) => {
        const messageText = msg.text.toLowerCase();
        if (messageText.includes(normalizedTerm)) {
            searchState.matches.push(index);
        }
    });
    
    if (searchState.matches.length > 0) {
        searchState.currentIndex = 0;
        updateSearchUI(elements);
        highlightSearchResults(elements);
        scrollToCurrentResult(elements);
    } else {
        searchState.currentIndex = -1;
        updateSearchUI(elements);
        clearSearchHighlights(elements);
    }
}

function updateSearchUI(elements) {
    if (searchState.matches.length > 0) {
        elements.searchControls.style.display = 'flex';
        elements.searchCounter.textContent = `${searchState.currentIndex + 1} / ${searchState.matches.length}`;
        elements.searchPrevBtn.disabled = false;
        elements.searchNextBtn.disabled = false;
    } else if (searchState.term) {
        elements.searchControls.style.display = 'flex';
        elements.searchCounter.textContent = 'لا توجد نتائج';
        elements.searchCounter.classList.add('search-no-results');
        elements.searchPrevBtn.disabled = true;
        elements.searchNextBtn.disabled = true;
    } else {
        elements.searchControls.style.display = 'none';
    }
}

function highlightSearchResults(elements) {
    clearSearchHighlights(elements);
    
    const messageElements = elements.messagesContainer.querySelectorAll('.message');
    
    searchState.matches.forEach((matchIndex, i) => {
        if (messageElements[matchIndex]) {
            messageElements[matchIndex].classList.add('search-match');
            if (i === searchState.currentIndex) {
                messageElements[matchIndex].classList.add('search-active');
            }
        }
    });
}

function clearSearchHighlights(elements) {
    const messageElements = elements.messagesContainer.querySelectorAll('.message');
    messageElements.forEach(el => {
        el.classList.remove('search-match', 'search-active');
    });
}

function navigateSearchNext(elements) {
    if (searchState.matches.length === 0) return;
    
    searchState.currentIndex = (searchState.currentIndex + 1) % searchState.matches.length;
    updateSearchUI(elements);
    highlightSearchResults(elements);
    scrollToCurrentResult(elements);
}

function navigateSearchPrev(elements) {
    if (searchState.matches.length === 0) return;
    
    searchState.currentIndex = (searchState.currentIndex - 1 + searchState.matches.length) % searchState.matches.length;
    updateSearchUI(elements);
    highlightSearchResults(elements);
    scrollToCurrentResult(elements);
}

function scrollToCurrentResult(elements) {
    if (searchState.currentIndex === -1 || searchState.matches.length === 0) return;
    
    const messageElements = elements.messagesContainer.querySelectorAll('.message');
    const targetIndex = searchState.matches[searchState.currentIndex];
    const targetElement = messageElements[targetIndex];
    
    if (targetElement) {
        targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

function clearSearch(elements) {
    elements.searchInput.value = '';
    searchState.term = '';
    searchState.matches = [];
    searchState.currentIndex = -1;
    
    elements.searchClearBtn.style.display = 'none';
    elements.searchControls.style.display = 'none';
    clearSearchHighlights(elements);
}