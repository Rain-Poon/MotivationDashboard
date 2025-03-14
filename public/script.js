/*------------------------------------------------------------------
  0) Data Management
  -----------------------------------------------------------------*/
let dashboardData = null;

// Load data from JSON file
async function loadDashboardData() {
    try {
        const response = await fetch('http://localhost:3000/api/dashboard'); // Matches server endpoint
        if (!response.ok) throw new Error('Failed to load data');
        dashboardData = await response.json();
        return dashboardData;
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // If loading fails, use default data
        return {
            "personalMetrics": {
                "wakeUpTime": "06:30",
                "sleepTime": "23:45",
                "energyLevel": 8,
                "fragmentationTime": "45 min",
                "fragmentationCount": 3,
                "focusBreakdown": [
                    { "category": "Deep Work", "duration": "2h" },
                    { "category": "Reading", "duration": "1h" },
                    { "category": "Exercise", "duration": "30min" }
                ]
            },
            "weeklyFocusTime": [
                { "day": "Mon", "hours": 3 },
                { "day": "Tue", "hours": 2 },
                { "day": "Wed", "hours": 4 },
                { "day": "Thu", "hours": 1.5 },
                { "day": "Fri", "hours": 3 },
                { "day": "Sat", "hours": 2.5 },
                { "day": "Sun", "hours": 4 }
            ],
            "todayTimeAllocation": [],
            "lastUpdated": new Date().toISOString()
        };
    }
}

async function saveDashboardData() {
    try {
        // Update timestamp
        dashboardData.lastUpdated = new Date().toISOString();

        // Send data to server
        const response = await fetch('http://localhost:3000/api/save-dashboard', { // Matches server endpoint
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dashboardData)
        });

        if (!response.ok) {
            console.log('Network response error:', response.statusText);
            throw new Error('Network response error');
        }
        console.log('Data saved successfully');
        return true;
    } catch (error) {
        console.error('Save failed:', error);
        return false;
    }
}

/*------------------------------------------------------------------
  1) Weather Fetching (unchanged)
  -----------------------------------------------------------------*/
const weatherTempElem = document.getElementById("weatherTemp");
const weatherDescElem = document.getElementById("weatherDesc");
const weatherIconElem = document.getElementById("weatherIcon");

async function fetchWeather() {
    try {
        const url =
            "https://api.open-meteo.com/v1/forecast?latitude=-37.814&longitude=144.9633&hourly=temperature_2m&forecast_days=1";
        const response = await fetch(url);
        const data = await response.json();
        const currentHour = new Date().getHours();
        const tempCelsius = Math.round(data.hourly.temperature_2m[currentHour]);
        weatherTempElem.textContent = `${tempCelsius}°C`;
        weatherDescElem.textContent = "Data from Open-Meteo";
        weatherIconElem.src = "https://cdn-icons-png.flaticon.com/512/1163/1163661.png";
    } catch (error) {
        console.log("Error fetching weather:", error);
        weatherTempElem.textContent = "--°C";
        weatherDescElem.textContent = "Unavailable";
    }
}

/*------------------------------------------------------------------
  2) Update UI from Data
  -----------------------------------------------------------------*/
function updateUIFromData() {
    if (!dashboardData) return;

    // Update editable cards
    document.querySelector('.wake-up-display').textContent = dashboardData.personalMetrics.wakeUpTime;
    document.querySelector('.sleep-display').textContent = dashboardData.personalMetrics.sleepTime;
    document.querySelector('.energy-display').textContent = `${dashboardData.personalMetrics.energyLevel}/10`;

    // Update energy style
    updateEnergyStyle(dashboardData.personalMetrics.energyLevel);

    // Update fragmentation metrics
    const fragTimeCard = document.getElementById('fragTimeCard');
    const fragCountCard = document.getElementById('fragCountCard');
    const fragTimeMinutes = parseInt(dashboardData.personalMetrics.fragmentationTime);
    const fragHours = Math.floor(fragTimeMinutes / 60);
    const fragMins = fragTimeMinutes % 60;
    fragTimeCard.querySelector('.card-value').textContent = `${fragHours} h ${fragMins} min`;
    fragCountCard.querySelector('.card-value').textContent = dashboardData.personalMetrics.fragmentationCount;

    // Update focus breakdown
    const focusBreakdownList = document.querySelector('.focus-categories ul');
    focusBreakdownList.innerHTML = '';
    dashboardData.personalMetrics.focusBreakdown.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.category}: ${item.duration}`;
        focusBreakdownList.appendChild(li);
    });

    // Dynamically update today's time allocation based on focus breakdown
    dashboardData.todayTimeAllocation = dashboardData.personalMetrics.focusBreakdown.map(item => {
        const [hours, minutes] = item.duration.split(/h|min/).map(Number);
        const totalHours = hours + (minutes / 60); // Convert minutes to fractional hours
        return {
            category: item.category,
            hours: totalHours,
            color: getRandomColor() // Assign a random color for each category
        };
    });

    // Update charts
    updateCharts();
}

/*------------------------------------------------------------------
  3) Modal Implementation (modified to save data)
  -----------------------------------------------------------------*/
document.addEventListener('DOMContentLoaded', async () => {
    // Load data first
    dashboardData = await loadDashboardData();
    updateUIFromData();

    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalTimeInput = document.getElementById('modalTimeInput');
    const modalNumberInput = document.getElementById('modalNumberInput');
    let activeCard = null;

    // Open modal on card click
    document.querySelectorAll('.editable-card').forEach(card => {
        card.addEventListener('click', () => {
            activeCard = card;
            const type = card.dataset.type;
            const currentValue = card.dataset.value;

            modalTitle.textContent = card.querySelector('.card-title').textContent;

            if (type === 'time') {
                modalTimeInput.value = currentValue;
                modalTimeInput.classList.remove('hidden');
                modalNumberInput.classList.add('hidden');
            } else if (type === 'number') {
                modalNumberInput.value = currentValue;
                modalNumberInput.classList.remove('hidden');
                modalTimeInput.classList.add('hidden');
            }

            modalOverlay.style.display = 'flex';
        });
    });

    // Save button handler
    document.getElementById('modalSave').addEventListener('click', async () => {
        if (!activeCard) return;

        const type = activeCard.dataset.type;
        let newValue = type === 'time'
            ? modalTimeInput.value
            : parseInt(modalNumberInput.value);

        // Enforce 1-10 range for energy level
        if (type === 'number' && activeCard.id === 'energyCard') {
            newValue = Math.max(1, Math.min(10, newValue));
            modalNumberInput.value = newValue; // Update input to reflect clamped value
        }

        // Update card display
        activeCard.dataset.value = newValue;
        const displayElement = activeCard.querySelector('.card-value');

        if (type === 'number') {
            displayElement.textContent = newValue;
            if (activeCard.id === 'energyCard') {
                displayElement.textContent += '/10';
                updateEnergyStyle(newValue);
                dashboardData.personalMetrics.energyLevel = newValue;
            } else if (activeCard.id === 'fragCountCard') {
                dashboardData.personalMetrics.fragmentationCount = newValue;
            } else if (activeCard.id === 'fragTimeCard') {
                dashboardData.personalMetrics.fragmentationTime = newValue;
                const fragHours = Math.floor(dashboardData.personalMetrics.fragmentationTime / 60);
                const fragMins = dashboardData.personalMetrics.fragmentationTime % 60;
                activeCard.querySelector('.card-value').textContent = `${fragHours} h ${fragMins} min`;
            }
        } else {
            displayElement.textContent = newValue;
            if (activeCard.id === 'wakeUpCard') {
                dashboardData.personalMetrics.wakeUpTime = newValue;
            } else if (activeCard.id === 'sleepCard') {
                dashboardData.personalMetrics.sleepTime = newValue;
            }
        }

        // Save updated data
        await saveDashboardData();
        modalOverlay.style.display = 'none';
    });

    // Cancel and outside click handlers
    document.getElementById('modalCancel').addEventListener('click', () => {
        modalOverlay.style.display = 'none';
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.style.display = 'none';
    });
});

/*------------------------------------------------------------------
  4) Energy Level Styling (unchanged)
  -----------------------------------------------------------------*/
function updateEnergyStyle(level) {
    const energyCard = document.querySelector('.energy-card');
    energyCard.classList.remove("energy-high", "energy-medium", "energy-low");

    if (level >= 7) {
        energyCard.classList.add("energy-high");
    } else if (level >= 4) {
        energyCard.classList.add("energy-medium");
    } else {
        energyCard.classList.add("energy-low");
    }
}

/*------------------------------------------------------------------
  5) Chart Initialization (modified to use data from JSON)
  -----------------------------------------------------------------*/
let focusBarChart, timeAllocChart;

function initializeCharts() {
    const focusBarCtx = document.getElementById("focusBarChart");
    const timeAllocCtx = document.getElementById("timeAllocationChart");

    // Initialize focus bar chart
    focusBarChart = new Chart(focusBarCtx, {
        type: "bar",
        data: {
            labels: dashboardData.weeklyFocusTime.map(item => item.day),
            datasets: [{
                label: "Focus Time (hrs)",
                data: dashboardData.weeklyFocusTime.map(item => item.hours),
                backgroundColor: "#4b8cfb",
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: "#fff" },
                    grid: { color: "rgba(255,255,255,0.2)" }
                },
                x: {
                    ticks: { color: "#fff" },
                    grid: { display: false }
                }
            },
            plugins: { legend: { labels: { color: "#fff" } } }
        }
    });

    // Initialize time allocation chart
    timeAllocChart = new Chart(timeAllocCtx, {
        type: "doughnut",
        data: {
            labels: dashboardData.todayTimeAllocation.map(item => item.category),
            datasets: [{
                label: "Today Allocation",
                data: dashboardData.todayTimeAllocation.map(item => item.hours),
                backgroundColor: dashboardData.todayTimeAllocation.map(item => item.color),
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: "#fff" } } }
        }
    });
}

/*------------------------------------------------------------------
  Helper Function: Generate Random Color
  -----------------------------------------------------------------*/
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function updateCharts() {
    if (!dashboardData) return;
    if (!focusBarChart || !timeAllocChart) {
        initializeCharts();
        return;
    }

    // Update focus bar chart
    focusBarChart.data.labels = dashboardData.weeklyFocusTime.map(item => item.day);
    focusBarChart.data.datasets[0].data = dashboardData.weeklyFocusTime.map(item => item.hours);
    focusBarChart.update();

    // Update time allocation chart
    timeAllocChart.data.labels = dashboardData.todayTimeAllocation.map(item => item.category);
    timeAllocChart.data.datasets[0].data = dashboardData.todayTimeAllocation.map(item => item.hours);
    timeAllocChart.data.datasets[0].backgroundColor = dashboardData.todayTimeAllocation.map(item => item.color);
    timeAllocChart.update();
}

/*------------------------------------------------------------------
  Initialization (updated)
  -----------------------------------------------------------------*/
window.addEventListener("DOMContentLoaded", async () => {
    fetchWeather();

    // Load data and initialize dashboard
    dashboardData = await loadDashboardData();
    updateUIFromData();
});

// Select elements
const addButton = document.getElementById('addButton');
const popupBox = document.getElementById('popupBox');
const activityType = document.getElementById('activityType');
const focusInputContainer = document.getElementById('focusInputContainer');
const focusCategory = document.getElementById('focusCategory');
const startActivity = document.getElementById('startActivity');
const floatingTimer = document.getElementById('floatingTimer');
const timerDisplay = document.getElementById('timerDisplay');
const stopTimer = document.getElementById('stopTimer');

let timerInterval;
// Track active activity
let activeActivity = null;

// Show/hide popup box
addButton.addEventListener('click', () => {
    // Toggle the popup box visibility
    popupBox.classList.toggle('hidden');

    // Ensure the focus input container visibility matches the current activity type
    if (activityType.value === 'focus') {
        focusInputContainer.classList.remove('hidden');
    } else {
        focusInputContainer.classList.add('hidden');
    }
});

// Toggle focus input based on selection
activityType.addEventListener('change', () => {
    if (activityType.value === 'focus') {
        focusInputContainer.classList.remove('hidden');
    } else {
        focusInputContainer.classList.add('hidden');
    }
});

// Start activity and timer
startActivity.addEventListener('click', () => {
    const activity = activityType.value;
    const category = focusCategory.value;

    if (!category && activity === 'focus') {
        alert('Please enter a focus category.');
        return;
    }

    // Log activity (optional)
    console.log(`Started: ${activity}`, category ? `- Category: ${category}` : '');

    // Hide popup and show timer
    popupBox.classList.add('hidden');
    floatingTimer.classList.remove('hidden');

    // Start timer
    let seconds = 0;
    activeActivity = { type: activity, startTime: Date.now(), category };
    timerInterval = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${minutes}:${secs}`;
    }, 1000);
});

// Stop timer and update metrics
stopTimer.addEventListener('click', async () => {
    clearInterval(timerInterval);
    if (activeActivity) {
        const elapsedTime = Math.floor((Date.now() - activeActivity.startTime) / 1000); // Elapsed time in seconds
        const elapsedMinutes = Math.floor(elapsedTime / 60); // Convert to minutes

        if (activeActivity.type === 'fragmentation') {
            // Update fragmentation time and count
            const fragTimeCard = document.getElementById('fragTimeCard');
            const fragCountCard = document.getElementById('fragCountCard');
            let currentFragTime = parseInt(dashboardData.personalMetrics.fragmentationTime) || 0;
            let currentFragCount = parseInt(dashboardData.personalMetrics.fragmentationCount) || 0;

            dashboardData.personalMetrics.fragmentationTime = currentFragTime + elapsedMinutes;
            dashboardData.personalMetrics.fragmentationCount = currentFragCount + 1;

            const fragHours = Math.floor(dashboardData.personalMetrics.fragmentationTime / 60);
            const fragMins = dashboardData.personalMetrics.fragmentationTime % 60;
            fragTimeCard.querySelector('.card-value').textContent = `${fragHours} h ${fragMins} min`;
            fragCountCard.querySelector('.card-value').textContent = dashboardData.personalMetrics.fragmentationCount;
        } else if (activeActivity.type === 'focus') {
            // Update focus breakdown
            const focusBreakdownList = document.querySelector('.focus-categories ul');
            const existingCategory = dashboardData.personalMetrics.focusBreakdown.find(
                item => item.category === activeActivity.category
            );

            if (existingCategory) {
                // Add time to existing category
                const [hours, minutes] = existingCategory.duration.split(/h|min/).map(Number);
                const totalMinutes = hours * 60 + minutes + elapsedMinutes;
                existingCategory.duration = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min`;
            } else {
                // Add new category
                dashboardData.personalMetrics.focusBreakdown.push({
                    category: activeActivity.category,
                    duration: `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}min`
                });
            }

            // Update focus time this week
            const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }); // e.g., "Mon"
            const focusDay = dashboardData.weeklyFocusTime.find(item => item.day === today);
            if (focusDay) {
                focusDay.hours += elapsedMinutes / 60; // Convert minutes to hours
            } else {
                dashboardData.weeklyFocusTime.push({ day: today, hours: elapsedMinutes / 60 });
            }

            // Update today's time allocation
            dashboardData.todayTimeAllocation = dashboardData.personalMetrics.focusBreakdown.map(item => {
                const [hours, minutes] = item.duration.split(/h|min/).map(Number);
                const totalHours = hours + (minutes / 60); // Convert minutes to fractional hours
                return {
                    category: item.category,
                    hours: totalHours,
                    color: getRandomColor()
                };
            });

            // Update UI
            updateUIFromData();
        }

        // Save updated data
        await saveDashboardData();

        // Reset active activity
        activeActivity = null;
    }

    // Reset timer display
    floatingTimer.classList.add('hidden');
    timerDisplay.textContent = '00:00';
});