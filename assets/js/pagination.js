function paginate(items, page, perPage = 9) {
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
}

/*  
    Smart Pagination Rules:
    
    visible pages = 5 buttons max

    Example for totalPages = 10:
    - page 1 → 1 2 3 4 ... 10
    - page 4 → 2 3 4 5 ... 10
    - page 6 → 4 5 6 7 ... 10
    - page 10 → 6 7 8 9 10
*/
function renderPagination(totalItems, perPage, containerId, callback, currentPage = 1) {
    const totalPages = Math.ceil(totalItems / perPage);
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    if (totalPages <= 1) return;

    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    // Shift window if near the end
    if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
    }

    // First page always shown if start > 1
    if (start > 1) {
        addPageBtn(container, 1, currentPage, callback);
        addEllipsis(container);
    }

    // Main window
    for (let i = start; i <= end; i++) {
        addPageBtn(container, i, currentPage, callback);
    }

    // Last page with ellipsis
    if (end < totalPages) {
        addEllipsis(container);
        addPageBtn(container, totalPages, currentPage, callback);
    }
}

function addPageBtn(container, num, currentPage, callback) {
    const btn = document.createElement("button");
    btn.className = "page-btn";
    btn.textContent = num;

    if (num === currentPage) btn.classList.add("active");

    btn.addEventListener("click", () => callback(num));
    container.appendChild(btn);
}

function addEllipsis(container) {
    const span = document.createElement("span");
    span.className = "ellipsis";
    span.textContent = "...";
    container.appendChild(span);
}
