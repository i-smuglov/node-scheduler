const { getAuthenticatedAxios, config } = require('./auth');
const { formatDate, getWorkingDays } = require('./utils/dateUtils');
require('dotenv').config();

const axios = getAuthenticatedAxios();

// Parse command line arguments
const args = process.argv.slice(2);
const dryRunArg = args.find(arg => arg.startsWith('--dry-run='));
const DRY_RUN = dryRunArg ? dryRunArg.split('=')[1].toLowerCase() === 'true' : true;

/**
 * Get the parent ticket for the current month
 * @returns {Promise<string|null>} The key of the parent ticket or null if not found
 */
async function getParentTicket() {
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long' });
  
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
    console.error('Error getting parent ticket:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get all child tickets for a parent ticket
 * @param {string} parentKey - The key of the parent ticket
 * @returns {Promise<Array>} Array of child tickets
 */
async function getChildTickets(parentKey) {
  try {
    const jql = `parent = ${parentKey} AND type = Sub-task ORDER BY key ASC`;
    const response = await axios.get('/search', {
      params: {
        jql,
        maxResults: 100,
        fields: 'key,summary,status'
      }
    });
    return response.data.issues;
  } catch (error) {
    console.error(`Error getting child tickets for ${parentKey}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update a ticket's status to Done and add time tracking
 * @param {string} ticketKey - The key of the ticket to update
 * @param {Date} date - The date of the ticket
 * @returns {Promise<void>}
 */
async function updateTicket(ticketKey, date) {
  const formattedDate = formatDate(date);
  
  try {
    // First, get the transitions available for this ticket
    const transitionsResponse = await axios.get(`/issue/${ticketKey}/transitions`);
    const doneTransition = transitionsResponse.data.transitions.find(t => t.name === 'Done');
    
    if (!doneTransition) {
      console.log(`[${formattedDate}] [${ticketKey}] No 'Done' transition available`);
      return;
    }

    // Transition the ticket to Done
    if (!DRY_RUN) {
      await axios.post(`/issue/${ticketKey}/transitions`, {
        transition: {
          id: doneTransition.id
        }
      });
    }

    // Format date to match Jira's expected format: yyyy-MM-dd'T'HH:mm:ss.SSSZ
    const jiraDate = date.toISOString().replace('Z', '+0000');

    // Get existing worklogs for this date
    const worklogsResponse = await axios.get(`/issue/${ticketKey}/worklog`);
    const existingWorklog = worklogsResponse.data.worklogs.find(w => {
      const worklogDate = new Date(w.started);
      return worklogDate.toDateString() === date.toDateString();
    });

    if (existingWorklog) {
      console.log(`[${formattedDate}] [${ticketKey}] [skipped] Worklog already exists`);
      return;
    }

    // Add new worklog only if none exists
    if (!DRY_RUN) {
      await axios.post(`/issue/${ticketKey}/worklog`, {
        timeSpent: '8h',
        started: jiraDate,
        comment: {
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
        }
      });
      console.log(`[${formattedDate}] [${ticketKey}] [updated] Added new worklog: 8h`);
    }

    console.log(`[${formattedDate}] [${ticketKey}] [updated] Status: Done`);
  } catch (error) {
    console.error(`Error updating ticket ${ticketKey}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Main function to update all time tracking tickets
 */
async function updateTimeTrackingTickets() {
  try {
    const now = new Date();
    const parentKey = await getParentTicket();
    
    if (!parentKey) {
      console.log('No parent ticket found for the current month');
      return;
    }

    const childTickets = await getChildTickets(parentKey);
    console.log(`Found ${childTickets.length} child tickets`);

    for (const ticket of childTickets) {
      // Extract date from ticket summary (format: DD.MM.YYYY)
      const dateMatch = ticket.fields.summary.match(/(\d{2}\.\d{2}\.\d{4})/);
      if (!dateMatch) {
        console.log(`[${ticket.key}] Could not extract date from summary: ${ticket.fields.summary}`);
        continue;
      }

      const [day, month, year] = dateMatch[1].split('.').map(Number);
      const ticketDate = new Date(year, month - 1, day);

      // Only update tickets for today or previous days
      if (ticketDate <= now) {
        await updateTicket(ticket.key, ticketDate);
      } else {
        console.log(`[${formatDate(ticketDate)}] [${ticket.key}] [skipped] Future date`);
      }
    }

    if (DRY_RUN) {
      console.log('\n[DRY RUN] This was a dry run - no actual updates were made');
    } else {
      console.log('All tickets updated successfully!');
    }
  } catch (error) {
    console.error('Error in updateTimeTrackingTickets:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  updateTimeTrackingTickets();
} 