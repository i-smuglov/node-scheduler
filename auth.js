const dotenv = require('dotenv');

dotenv.config();

const username = process.env.JIRA_USERNAME;
const apiToken = process.env.JIRA_API_TOKEN;
const domain = process.env.JIRA_DOMAIN;
const projectKey = process.env.JIRA_PROJECT_KEY;

const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');

// Default headers for JIRA API requests
const defaultHeaders = {
    Authorization: `Basic ${auth}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
};

// Configuration object with all necessary JIRA settings
const config = {
    domain,
    projectKey,
    username,
    apiToken,
};

// Function to get authenticated axios instance with default headers
function getAuthenticatedAxios() {
    const axios = require('axios');
    return axios.create({
        baseURL: `https://${domain}/rest/api/3`,
        headers: defaultHeaders,
    });
}

module.exports = {
    defaultHeaders,
    config,
    getAuthenticatedAxios,
}; 