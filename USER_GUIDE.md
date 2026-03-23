# ALF Management Dashboard - User Guide

This guide provides detailed instructions on how to use the ALF Management Dashboard features.

## Table of Contents

1. [Accessing the Dashboard](#accessing-the-dashboard)
2. [Member Management](#member-management)
3. [Role Management](#role-management)
4. [Team Management](#team-management)
5. [Transactions](#transactions)
6. [Activity Logs](#activity-logs)

---

## Accessing the Dashboard

1. Navigate to the application URL (e.g., `http://localhost:3000` for local development).
2. Enter your credentials on the Login page.
3. Upon successful login, you will be redirected to the main Dashboard.

## Member Management

The **Members** section allows you to view and manage all organization members.

### Viewing Members

- Navigate to **Members** from the sidebar.
- You will see a list of members with details like Name, Email, Role, and Status.
- Use the **Search** bar to find members by name or email.
- Use the **Status Filter** to view only Active or Inactive members.

### Adding a Member

1. Click the **Add Member** button.
2. Fill in the required fields:
   - **Name**: Full name of the member.
   - **Email**: Valid email address.
   - **Role**: specific role for the member (e.g., Admin, Member).
   - **Team**: (Optional) Assign the member to a team.
3. Click **Save** to add the member.

### Editing a Member

1. Click on the **Edit** icon (pencil) next to a member's name.
2. Update the necessary information.
3. Click **Update** to save changes.

## Role Management

The **Roles** section is for defining user permissions.

### Creating a Role

1. Navigate to **Roles**.
2. Click **Add Role**.
3. Enter a **Role Name** (e.g., "Manager").
4. Select the permissions associated with this role.
5. Click **Create Role**.

## Team Management

Organize members into functional teams.

1. Navigate to **Teams**.
2. Click **Create Team**.
3. Enter a **Team Name** and Description.
4. You can add members to the team during creation or edit the team later to add members.

## Transactions

Track financial records and export reports.

### Recording a Transaction

1. Navigate to **Transactions**.
2. Click **New Transaction**.
3. Enter details: Amount, Type (Credit/Debit), Description, and Date.
4. Click **Submit**.

### Exporting Data

- **PDF Export**: Click the **Export PDF** button to download a formatted report of visible transactions.
- **CSV Export**: Click **Export CSV** to download raw transaction data for spreadsheet analysis.

## Activity Logs

Monitor system usage for security and auditing.

1. Navigate to **Activity Logs**.
2. View a chronological list of actions (e.g., "User X logged in", "Member Y updated").
3. Use filters to narrow down logs by date or user.
