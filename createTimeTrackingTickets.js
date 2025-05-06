const { getAuthenticatedAxios, config } = require('./auth');
const { formatDate, getWorkingDays } = require('./utils/dateUtils');
require('dotenv').config();

const axios = getAuthenticatedAxios();

// Global dry-run flag
const DRY_RUN = true;

/**
 * Check if a parent ticket exists for the current month
 * @returns {Promise<string|null>} The key of the existing ticket or null if not found
 */
async function checkParentTicketExists() {
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long' });
  const year = now.getFullYear();
  
  try {
    const jql = `project = ${config.projectKey} AND summary ~ "Time Tracking ${monthName} for Iurii S" AND type = Story`;
    const response = await axios.get('/search', {
      params: {
        jql,
        maxResults: 1,
        fields: 'key,summary'
      }
    });
    
    if (response.data.issues.length > 0) {
      return response.data.issues[0].key;
    }
    return null;
  } catch (error) {
    console.error('Error checking parent ticket:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Check if a child ticket exists for a specific date
 * @param {string} parentKey - The key of the parent ticket
 * @param {Date} date - The date to check
 * @returns {Promise<string|null>} The key of the existing ticket or null if not found
 */
async function checkChildTicketExists(parentKey, date) {
  const formattedDate = formatDate(date);
  
  try {
    const jql = `parent = ${parentKey} AND summary ~ "${formattedDate}" AND type = Sub-task`;
    const response = await axios.get('/search', {
      params: {
        jql,
        maxResults: 1,
        fields: 'key,summary'
      }
    });
    
    if (response.data.issues.length > 0) {
      return response.data.issues[0].key;
    }
    return null;
  } catch (error) {
    console.error(`Error checking child ticket for ${formattedDate}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Create a parent ticket for the month
 * @returns {Promise<string>} The key of the created ticket
 */
async function createParentTicket() {
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long' });
  
  const issueData = {
    fields: {
      project: {
        key: config.projectKey,
      },
      summary: `Time Tracking ${monthName} for Iurii S`,
      description: {
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Time tracking tickets for ${monthName} ${now.getFullYear()}`
              }
            ]
          }
        ]
      },
      issuetype: {
        name: 'Story',
      },
      assignee: {
        accountId: process.env.JIRA_ASSIGNEE
      }
    },
  };

  if (DRY_RUN) {
    console.log('[DRY RUN] Would create parent ticket with summary:', issueData.fields.summary);
    return 'DRY-RUN-PARENT-KEY';
  }

  try {
    const response = await axios.post('/issue', issueData);
    console.log(`[${formatDate(now)}] [${response.data.key}] [created]`);
    return response.data.key;
  } catch (error) {
    console.error('Error creating parent ticket:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Create a child ticket for a specific date
 * @param {string} parentKey - The key of the parent ticket
 * @param {Date} date - The date for the ticket
 * @returns {Promise<string>} The key of the created ticket
 */
async function createChildTicket(parentKey, date) {
  const formattedDate = formatDate(date);

  const issueData = {
    fields: {
      project: {
        key: config.projectKey,
      },
      summary: formattedDate,
      description: {
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Time tracking for ${formattedDate}`
              }
            ]
          }
        ]
      },
      issuetype: {
        name: 'Sub-task',
      },
      parent: {
        key: parentKey,
      },
      assignee: {
        accountId: process.env.JIRA_ASSIGNEE
      }
    },
  };

  if (DRY_RUN) {
    console.log(`[${formattedDate}] [DRY-RUN] [created]`);
    return 'DRY-RUN-CHILD-KEY';
  }

  try {
    const response = await axios.post('/issue', issueData);
    console.log(`[${formattedDate}] [${response.data.key}] [created]`);
    return response.data.key;
  } catch (error) {
    console.error(`Error creating child ticket for ${formattedDate}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Main function to create all time tracking tickets
 * @param {number} [limit] - Optional limit on number of child tickets to create. If not set, processes all working days in the month.
 */
async function createTimeTrackingTickets(limit) {
  try {
    // Get working days
    const workingDays = getWorkingDays();
    console.log(`Found ${workingDays.length} working days this month`);

    // Check if parent ticket exists
    const existingParentKey = await checkParentTicketExists();
    let parentKey;
    
    if (existingParentKey) {
      console.log(`[${formatDate(new Date())}] [${existingParentKey}] [exists]`);
      parentKey = existingParentKey;
    } else {
      parentKey = await createParentTicket();
    }

    // Apply limit if specified, otherwise process all days
    const daysToProcess = limit ? workingDays.slice(0, limit) : workingDays;
    console.log(limit 
      ? `Creating tickets for ${daysToProcess.length} days (limited to ${limit})`
      : `Creating tickets for all ${daysToProcess.length} working days this month`
    );

    // Create child tickets for each working day
    for (const date of daysToProcess) {
      const existingChildKey = await checkChildTicketExists(parentKey, date);
      const formattedDate = formatDate(date);
      
      if (existingChildKey) {
        console.log(`[${formattedDate}] [${existingChildKey}] [exists]`);
      } else {
        await createChildTicket(parentKey, date);
      }
    }

    if (DRY_RUN) {
      console.log('\n[DRY RUN] This was a dry run - no actual tickets were created');
    } else {
      console.log('All tickets created successfully!');
    }
  } catch (error) {
    console.error('Error in createTimeTrackingTickets:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
  
  if (limitArg && (isNaN(limit) || limit <= 0)) {
    console.error('Error: --limit must be a positive number');
    process.exit(1);
  }

  createTimeTrackingTickets(limit);
} 