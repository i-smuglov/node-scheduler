# Node.js JIRA Time Tracking Scheduler

This Node.js application helps automate the creation and management of time tracking tickets in JIRA. It creates a hierarchical structure of tickets for time tracking purposes, with a parent ticket for the month and child tickets for each working day.

## Features

- Creates a parent ticket for the current month
- Creates child tickets for each working day (Monday-Friday)
- Error handling and logging
- Automatic time tracking updates
- Ticket hierarchy visualization
- Dry-run mode for safe testing

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- JIRA account with appropriate permissions
- JIRA API token

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd node-scheduler
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
JIRA_USERNAME="username@domain.com"
JIRA_API_TOKEN="your_jira_api_token"
JIRA_DOMAIN="domain.atlassian.net"
JIRA_PROJECT_KEY="PROJ"
JIRA_ASSIGNEE="your_jira_id"
```

### Creating a JIRA API Token

To create a JIRA API token:

1. Log in to your JIRA account
2. Click on your profile picture in the top right corner
3. Select "Account settings"
4. Navigate to "Security" in the left sidebar
5. Click on "Create and manage API tokens"
6. Click "Create API token"
7. Give your token a name (e.g., "Time Tracking Scheduler")
8. Click "Create"
9. Copy the generated token immediately (you won't be able to see it again)
10. Use this token as your `JIRA_API_TOKEN` in the `.env` file

Note: Your `your_jira_id` can be found by running `checkPermissions.js` after other fields are set in the `.env` file.

## Available Scripts

- `createTimeTrackingTickets.js`: Creates a parent ticket for the current month and child tickets for each working day
- `updateTimeTrackingTickets.js`: Updates existing tickets with time tracking and status changes
- `checkPermissions.js`: Verifies JIRA API permissions

## Usage

### Creating Time Tracking Tickets

To create time tracking tickets for the current month:

```bash
node createTimeTrackingTickets.js
```

This will:
1. Create a parent ticket for the current month
2. Create child tickets for all working days (Monday-Friday) in the current month
3. Link all child tickets to the parent ticket

You can optionally limit the number of child tickets created using the `--limit` parameter:

```bash
node createTimeTrackingTickets.js --limit=5
```

This will create only the first 5 working days' tickets for the current month. If no limit is specified, the script will create tickets for all working days in the month.

### Updating Time Tracking Tickets

To update existing tickets with time tracking and status changes:

```bash
node updateTimeTrackingTickets.js
```

This will:
1. Find the parent ticket for the current month
2. Update all child tickets for past dates
3. Add 8-hour worklogs to each ticket
4. Transition tickets to "Done" status

### Checking Permissions

To verify your JIRA API permissions:

```bash
node checkPermissions.js
```

## Configuration Options

The application supports the following configuration options:

- `DRY_RUN`: Set to `true` in the script files to test operations without making actual changes
- `--limit`: Limit the number of child tickets created (e.g., `--limit=5`)

## Security Notes

- Never commit your `.env` file
- Keep your JIRA API token secure
- Use appropriate JIRA permissions
- Regularly rotate your API token