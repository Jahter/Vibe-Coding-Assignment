// DOM Elements
const inventoryForm = document.getElementById('inventory-form');
const itemNameInput = document.getElementById('item-name');
const itemQuantityInput = document.getElementById('item-quantity');
const itemPriceInput = document.getElementById('item-price');
const inventoryList = document.getElementById('inventory-list');
const clearAllBtn = document.getElementById('clear-all-btn');

// Error Elements
const nameError = document.getElementById('name-error');
const quantityError = document.getElementById('quantity-error');
const priceError = document.getElementById('price-error');

// Theme toggle
const themeBtn = document.querySelector('.theme-toggle button');
const themeIcon = document.querySelector('.theme-toggle i');

// Chart Instance
let inventoryChart = null;

// LocalStorage Key
const STORAGE_KEY = 'abcLogisticsInventory';
const THEME_KEY = 'abcLogisticsTheme';

// State
let inventory = [];
let chartMode = 'quantity'; // 'quantity' or 'value'

// Initialize Application
function init() {
    loadTheme();
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }

    if (inventoryForm) {
        loadInventory();
        setupEventListeners();
        renderList(false); // don't animate all on initial load
        renderChart();
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (themeIcon) { themeIcon.className = 'ph ph-sun'; }
    }
}

function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.body.removeAttribute('data-theme');
        localStorage.setItem(THEME_KEY, 'light');
        if (themeIcon) { themeIcon.className = 'ph ph-moon'; }
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem(THEME_KEY, 'dark');
        if (themeIcon) { themeIcon.className = 'ph ph-sun'; }
    }
    // Update chart colors if it exists
    if (inventoryChart) {
        renderChart();
    }
}

function loadInventory() {
    const stored = localStorage.getItem(STORAGE_KEY);
    inventory = stored ? JSON.parse(stored) : [];
}

function saveInventory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
}

function setupEventListeners() {
    inventoryForm.addEventListener('submit', handleAddItem);
    clearAllBtn.addEventListener('click', handleClearAll);

    itemNameInput.addEventListener('input', () => clearError(itemNameInput, nameError));
    itemQuantityInput.addEventListener('input', () => clearError(itemQuantityInput, quantityError));
    itemPriceInput.addEventListener('input', () => clearError(itemPriceInput, priceError));
}

function handleAddItem(e) {
    e.preventDefault();

    let hasError = false;

    const name = itemNameInput.value.trim();
    const quantityStr = itemQuantityInput.value;
    const priceStr = itemPriceInput.value;

    clearError(itemNameInput, nameError);
    clearError(itemQuantityInput, quantityError);
    clearError(itemPriceInput, priceError);

    if (inventory.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        showError(itemNameInput, nameError, 'Item name already exists.');
        hasError = true;
    }

    const quantity = Number(quantityStr);
    const price = Number(priceStr);

    if (isNaN(quantity) || quantityStr.trim() === '') {
        showError(itemQuantityInput, quantityError, 'Must be a valid number.');
        hasError = true;
    } else if (quantity < 0) {
        showError(itemQuantityInput, quantityError, 'Cannot be negative.');
        hasError = true;
    }

    if (isNaN(price) || priceStr.trim() === '') {
        showError(itemPriceInput, priceError, 'Must be a valid number.');
        hasError = true;
    } else if (price < 0) {
        showError(itemPriceInput, priceError, 'Cannot be negative.');
        hasError = true;
    }

    if (hasError) return;

    inventory.push({
        id: Date.now().toString(),
        name,
        quantity,
        price
    });

    saveInventory();
    renderList(true); // animate new item
    renderChart();

    inventoryForm.reset();
    itemNameInput.focus();
}

function handleClearAll(e) {
    if (inventory.length === 0) return;
    if (confirm('Are you sure you want to clear all inventory items? This cannot be undone.')) {
        inventory = [];
        saveInventory();
        renderList();
        renderChart();
    }
}

// Attach it to window so inline onclick handlers in HTML can call it
window.handleDeleteItem = function (id) {
    inventory = inventory.filter(item => item.id !== id);
    saveInventory();
    renderList();
    renderChart();
};

window.setChartMode = function (mode) {
    chartMode = mode;
    document.getElementById('toggle-qty').classList.toggle('active', mode === 'quantity');
    document.getElementById('toggle-val').classList.toggle('active', mode === 'value');

    document.getElementById('chart-title').textContent =
        mode === 'quantity' ? 'Quantity Overview' : 'Total Value Overview';

    renderChart();
};

function showError(inputElement, errorElement, message) {
    inputElement.classList.add('invalid');
    inputElement.parentElement.classList.add('invalid-wrapper');
    errorElement.textContent = message;
}

function clearError(inputElement, errorElement) {
    inputElement.classList.remove('invalid');
    inputElement.parentElement.classList.remove('invalid-wrapper');
    errorElement.textContent = '';
}

function renderList(animateLast = false) {
    inventoryList.innerHTML = '';

    if (inventory.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" class="empty-state">
            <div class="empty-icon"><i class="ph ph-package"></i></div>
            <p>No items in inventory. Add an item to get started.</p>
        </td>`;
        inventoryList.appendChild(tr);
        return;
    }

    inventory.forEach((item, index) => {
        const tr = document.createElement('tr');
        const totalValue = item.quantity * item.price;

        // Only animate the newly added item (the last one) if requested
        if (animateLast && index === inventory.length - 1) {
            tr.classList.add('tr-animate');
        }

        tr.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td class="td-val text-right">${item.quantity}</td>
            <td class="td-val text-right">$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="action-cell">
                <button class="btn-delete" onclick="handleDeleteItem('${item.id}')" title="Delete item">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        inventoryList.appendChild(tr);
    });
}

function renderChart() {
    const ctx = document.getElementById('inventoryChart').getContext('2d');

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#9CA3AF' : '#4B5563';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const barRed = '#CC0633';
    const hoverRed = '#A30529';

    const labels = inventory.map(item => item.name);
    const data = chartMode === 'quantity'
        ? inventory.map(item => item.quantity)
        : inventory.map(item => item.quantity * item.price);

    const datasetLabel = chartMode === 'quantity' ? 'Quantity in Stock' : 'Total Value ($)';

    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'Inter', system-ui, -apple-system, sans-serif";

    if (inventoryChart) {
        inventoryChart.data.labels = labels;
        inventoryChart.data.datasets[0].data = data;
        inventoryChart.data.datasets[0].label = datasetLabel;
        inventoryChart.data.datasets[0].backgroundColor = barRed;
        inventoryChart.data.datasets[0].hoverBackgroundColor = hoverRed;

        inventoryChart.options.scales.x.grid.color = gridColor;
        inventoryChart.options.scales.y.grid.color = gridColor;
        inventoryChart.options.scales.x.ticks.color = textColor;
        inventoryChart.options.scales.y.ticks.color = textColor;

        inventoryChart.options.plugins.tooltip.callbacks.label = function (context) {
            if (chartMode === 'value') {
                return `Value: $${context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            return `Quantity: ${context.parsed.y}`;
        };

        inventoryChart.options.scales.y.ticks.callback = chartMode === 'value'
            ? function (value) { return '$' + value.toLocaleString(); }
            : undefined;
        inventoryChart.options.scales.y.ticks.precision = chartMode === 'quantity' ? 0 : 2;

        inventoryChart.update();
    } else {
        inventoryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: datasetLabel,
                    data: data,
                    backgroundColor: barRed,
                    hoverBackgroundColor: hoverRed,
                    borderWidth: 0,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1F2937' : '#111827',
                        titleColor: '#fff',
                        bodyColor: '#E5E7EB',
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function (context) {
                                if (chartMode === 'value') {
                                    return `Value: $${context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                }
                                return `Quantity: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor, drawBorder: false },
                        ticks: { precision: 0, color: textColor }
                    },
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { color: textColor }
                    }
                },
                animation: {
                    duration: 800,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', init);
