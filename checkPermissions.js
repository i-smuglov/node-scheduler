const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const username = process.env.JIRA_USERNAME;
const apiToken = process.env.JIRA_API_TOKEN;
const domain = process.env.JIRA_DOMAIN;
const projectKey = process.env.JIRA_PROJECT_KEY || 'PROJ';

// Debug environment variables (safely)
console.log('Environment Check:');
console.log('Domain:', domain || 'Not set');
console.log('Project Key:', projectKey);
console.log('Username is set:', !!username);
console.log('API Token is set:', !!apiToken);
console.log('-------------------');

const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');

async function checkPermissions() {
  try {
    // Get project details which includes permission information
    const projectResponse = await axios.get(`https://${domain}/rest/api/3/project/${projectKey}`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    });

    console.log('Project Details:');
    console.log(JSON.stringify(projectResponse.data, null, 2));

    // Get current user's permissions
    const userResponse = await axios.get(`https://${domain}/rest/api/3/myself`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    });

    console.log('\nUser Details:');
    console.log(JSON.stringify(userResponse.data, null, 2));

  } catch (error) {
    console.error('Error checking permissions:', error.response?.data || error.message);
  }
}

checkPermissions(); 