function formatDateToDDMMYYYY(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseDDMMYYYY(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return new Date(`${year}-${month}-${day}T00:00:00`);
}

function renderLogs(startDate = null, endDate = null, singleDate = null) {
  const logTableBody = document.querySelector('#logTable tbody');
  const logs = localStorage.getItem('workLogs');
  if (!logs) {
    logTableBody.innerHTML = '';
    return;
  }
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = logs;
  let items = Array.from(tempDiv.querySelectorAll('li'));

  // Sort items by date and start time descending (newest first)
  items.sort((a, b) => {
    const dateA = a.textContent.match(/Date:\s*([\d/]+)/);
    const dateB = b.textContent.match(/Date:\s*([\d/]+)/);
    const startA = a.textContent.match(/Start:\s*([\d:]+)/);
    const startB = b.textContent.match(/Start:\s*([\d:]+)/);

    if (dateA && dateB) {
      const dA = parseDDMMYYYY(dateA[1]);
      const dB = parseDDMMYYYY(dateB[1]);
      // If dates are equal, compare start times
      if (dA.getTime() === dB.getTime() && startA && startB) {
        // Convert start time to minutes for comparison
        const [hA, mA, sA] = startA[1].split(':').map(Number);
        const [hB, mB, sB] = startB[1].split(':').map(Number);
        const tA = hA * 3600 + mA * 60 + (sA || 0);
        const tB = hB * 3600 + mB * 60 + (sB || 0);
        return tB - tA; // Newest time first
      }
      return dB - dA; // Newest date first
    }
    return 0;
  });

  logTableBody.innerHTML = '';
  items.forEach(item => {
    // Match all fields by name, regardless of order
    const sessionMatch = item.textContent.match(/Session:\s*([\d:]+)/);
    const dateMatch = item.textContent.match(/Date:\s*([\d/]+)/);
    const startMatch = item.textContent.match(/Start:\s*([\d:]+)/);
    const endMatch = item.textContent.match(/End:\s*([\d:]+)/);

    if (sessionMatch && dateMatch && startMatch && endMatch) {
      const session = sessionMatch[1];
      const date = dateMatch[1];
      const start = startMatch[1];
      const end = endMatch[1];
      const logDate = parseDDMMYYYY(date);
      let show = true;
      if (singleDate) {
        const single = parseDDMMYYYY(singleDate);
        show = logDate.getFullYear() === single.getFullYear() &&
               logDate.getMonth() === single.getMonth() &&
               logDate.getDate() === single.getDate();
      } else {
        if (startDate) {
          const startD = parseDDMMYYYY(startDate);
          show = show && (logDate >= startD);
        }
        if (endDate) {
          const endD = parseDDMMYYYY(endDate);
          endD.setHours(23, 59, 59, 999);
          show = show && (logDate <= endD);
        }
      }
      if (show) {
        // Insert as table row
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${formatDateToDDMMYYYY(logDate)}</td>
          <td>${start}</td>
          <td>${end}</td>
          <td>${session}</td>
        `;
        logTableBody.appendChild(tr);
      }
    } else if (!startDate && !endDate && !singleDate) {
      // fallback for legacy logs
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="4">${item.textContent}</td>`;
      logTableBody.appendChild(tr);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const applyBtn = document.getElementById('applyFilterBtn');
  const clearBtn = document.getElementById('clearFilterBtn');
  const singleInput = document.getElementById('singleDate');
  const singleBtn = document.getElementById('singleDayBtn');

  // Add Clear Log button logic
  const clearLogBtn = document.getElementById('clearLogBtn');
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete all log data?')) {
        localStorage.removeItem('workLogs');
        renderLogs();
      }
    });
  }

  renderLogs();

  applyBtn.addEventListener('click', () => {
    renderLogs(startInput.value, endInput.value);
  });

  clearBtn.addEventListener('click', () => {
    startInput.value = '';
    endInput.value = '';
    singleInput.value = '';
    renderLogs();
  });

  singleBtn.addEventListener('click', () => {
    if (singleInput.value) {
      // Convert yyyy-mm-dd to dd/MM/yyyy
      const [year, month, day] = singleInput.value.split('-');
      const formatted = `${day}/${month}/${year}`;
      renderLogs(null, null, formatted);
    }
  });

  // Download CSV logic
  const downloadCsvBtn = document.getElementById('downloadCsvBtn');
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener('click', () => {
      const logs = localStorage.getItem('workLogs');
      if (!logs) return;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = logs;
      const items = Array.from(tempDiv.querySelectorAll('li'));
      let csv = 'Date,Start,End,Session\n';
      items.forEach(item => {
        const sessionMatch = item.textContent.match(/Session:\s*([\d:]+)/);
        const dateMatch = item.textContent.match(/Date:\s*([\d/]+)/);
        const startMatch = item.textContent.match(/Start:\s*([\d:]+)/);
        const endMatch = item.textContent.match(/End:\s*([\d:]+)/);
        if (sessionMatch && dateMatch && startMatch && endMatch) {
          const date = dateMatch[1];
          const start = startMatch[1];
          const end = endMatch[1];
          const session = sessionMatch[1];
          csv += `"${date}","${start}","${end}","${session}"\n`;
        }
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'work_log.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
});

document.getElementById('closeBtn').onclick = () => window.close();