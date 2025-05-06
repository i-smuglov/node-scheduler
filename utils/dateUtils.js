/**
 * Format a date to DD.MM.YYYY format
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string in DD.MM.YYYY format
 */
function formatDate(date) {
    return date.toLocaleDateString('en-GB', { 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '.');
}

/**
 * Get all working days (Mon-Fri) for the current month
 * @returns {Date[]} Array of working days
 */
function getWorkingDays() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get the first day of the current month
    const firstDay = new Date(currentYear, currentMonth, 1);
    
    // Get the last day of the current month
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    const workingDays = [];
    
    // Iterate through all days of the month
    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
        // Check if it's a weekday (1-5 = Monday-Friday)
        if (date.getDay() >= 1 && date.getDay() <= 5) {
            workingDays.push(new Date(date));
        }
    }
    
    return workingDays;
}

module.exports = {
    formatDate,
    getWorkingDays
}; 