let timer;
let seconds = 0;
let minutes = 0;
let hours = 0;
let isRunning = false;
let sessionStart = null;
let todayTotalSeconds = 0;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const logList = document.getElementById('logList');
const hoursDisplay = document.getElementById('hours');
const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');

function updateDisplay() {
    hoursDisplay.textContent = hours.toString().padStart(2, '0');
    minutesDisplay.textContent = minutes.toString().padStart(2, '0');
    secondsDisplay.textContent = seconds.toString().padStart(2, '0');
}

function startTimer() {
    if (!isRunning) {
        isRunning = true;
        sessionStart = new Date(); // Record the start time
        timer = setInterval(() => {
            seconds++;
            if (seconds === 60) {
                seconds = 0;
                minutes++;
            }
            if (minutes === 60) {
                minutes = 0;
                hours++;
            }
            updateDisplay();
        }, 1000);
    }
}

function stopTimer() {
    if (isRunning) {
        clearInterval(timer);
        isRunning = false;
        logSession();
        // Reset timer after logging
        seconds = 0;
        minutes = 0;
        hours = 0;
        updateDisplay();
        sessionStart = null;
        saveLogsToStorage();
    }
}

function resetTimer() {
    stopTimer();
    seconds = 0;
    minutes = 0;
    hours = 0;
    updateDisplay();
    sessionStart = null; // Reset start time
}

function updateTodayTotalDisplay() {
    const hours = Math.floor(todayTotalSeconds / 3600);
    const minutes = Math.floor((todayTotalSeconds % 3600) / 60);
    const seconds = todayTotalSeconds % 60;
    const todayTotal = document.getElementById('today-total');
    if (todayTotal) {
        todayTotal.textContent =
            `${hours.toString().padStart(2, '0')}:` +
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}`;
    }
}

// Helper to check if two dates are the same day
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
}

function saveLogsToStorage() {
    localStorage.setItem('workLogs', logList.innerHTML);
    localStorage.setItem('todayTotalSeconds', todayTotalSeconds.toString());
}

function loadLogsFromStorage() {
    const logs = localStorage.getItem('workLogs');
    if (logs) {
        logList.innerHTML = logs;
    }
    const total = localStorage.getItem('todayTotalSeconds');
    if (total) {
        todayTotalSeconds = parseInt(total, 10);
        updateTodayTotalDisplay();
    }
}

function formatDateToDDMMYYYY(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function logSession() {
    const now = new Date();
    const dateString = formatDateToDDMMYYYY(now); // Use dd/MM/yyyy format
    const startTimeString = sessionStart
        ? sessionStart.toLocaleTimeString()
        : '--:--:--';
    const endTimeString = now.toLocaleTimeString();
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const listItem = document.createElement('li');
    listItem.textContent = `Session: ${timeString} | Date: ${dateString} | Start: ${startTimeString} | End: ${endTimeString}`;
    logList.appendChild(listItem);

    // Accumulate today's total if session is today
    if (sessionStart && isSameDay(sessionStart, now)) {
        const sessionSeconds = (hours * 3600) + (minutes * 60) + seconds;
        todayTotalSeconds += sessionSeconds;
        updateTodayTotalDisplay();
    }

    sessionStart = null; // Reset after logging
    saveLogsToStorage(); // Save after logging
}

// --- Weekly Chart Logic ---
function getLastWeekDates() {
    // Returns array of Date objects for the last 7 days (including today)
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(d);
    }
    return dates;
}

function parseLogSession(logText) {
    // Extract session duration and date from log text
    // Example: Session: 00:10:00 | Date: 07/06/2024 | Start: ... | End: ...
    const match = logText.match(/Session:\s*(\d{2}):(\d{2}):(\d{2})\s*\|\s*Date:\s*([\d/]+)/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const dateStr = match[4];
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return { dateStr, totalSeconds };
}

function getWeeklyWorkData() {
    const logs = localStorage.getItem('workLogs');
    if (!logs) return [[], []];

    const weekDates = getLastWeekDates();

    // Prepare a map: key = dd/MM/yyyy, value = totalSeconds
    const dailyTotals = {};
    weekDates.forEach(d => {
        const key = formatDateToDDMMYYYY(d);
        dailyTotals[key] = 0;
    });

    // Parse logs and accumulate totals for each day in this week
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = logs;
    const items = Array.from(tempDiv.querySelectorAll('li'));
    items.forEach(item => {
        const parsed = parseLogSession(item.textContent);
        if (parsed && parsed.dateStr in dailyTotals) {
            dailyTotals[parsed.dateStr] += parsed.totalSeconds;
        }
    });

    // Prepare data for Chart.js
    const labels = weekDates.map(d => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }));
    const data = weekDates.map(d => {
        const key = formatDateToDDMMYYYY(d);
        // Convert seconds to hours (with 2 decimals)
        return +(dailyTotals[key] / 3600).toFixed(2);
    });

    return [labels, data];
}

function renderWeeklyChart() {
    const chartCanvas = document.getElementById('weeklyChart');
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d');
    const [labels, data] = getWeeklyWorkData();

    // Destroy previous chart if exists
    if (window.weeklyChartInstance) {
        window.weeklyChartInstance.destroy();
    }

    window.weeklyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hours Worked',
                data: data,
                backgroundColor: '#007bff88',
                borderColor: '#007bff',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Hours' }
                }
            }
        }
    });
}

// Patch saveLogsToStorage to update chart after saving logs
const originalSaveLogsToStorage = saveLogsToStorage;
saveLogsToStorage = function() {
    originalSaveLogsToStorage();
    renderWeeklyChart();
};

// Render chart on page load
document.addEventListener('DOMContentLoaded', () => {
    todayTotalSeconds = 0;
    updateTodayTotalDisplay();
    loadLogsFromStorage();
    renderWeeklyChart();
});

startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);

window.addEventListener('beforeunload', function () {
    if (isRunning) {
        clearInterval(timer);
        isRunning = false;
        logSession();
        // Reset timer after logging
        seconds = 0;
        minutes = 0;
        hours = 0;
        updateDisplay();
        sessionStart = null;
        saveLogsToStorage();
    }
});
