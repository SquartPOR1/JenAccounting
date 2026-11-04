# Ledgerly — Mini Accounting System

A JavaScript accounting dashboard backed by a PHP JSON API and MySQL. JavaScript still drives the interface and accounting views; PHP validates and stores the shared application data.

## Run locally

1. Start Apache and MySQL in the XAMPP Control Panel.
2. Create the database and table by importing `database/schema.sql` in phpMyAdmin or the MySQL command line.
3. Copy `api/config.example.php` to `api/config.php`, then set the MySQL host, database name, username, and password in `api/config.php`. The local config file is excluded from Git.
4. Open PowerShell in the project folder and start PHP’s development server using XAMPP’s PHP executable:

   ```powershell
   & "C:\xampp\php\php.exe" -S 127.0.0.1:8011 -t "$PWD"
   ```

5. Visit `http://127.0.0.1:8011`.

Do not open `index.html` directly or use a static-only server; PHP must handle `/api/state.php`. Use XAMPP’s PHP executable in the command above: another PHP installation on your PATH may not have the MySQL driver enabled. This command serves the project directly from its folder and avoids needing to copy it into XAMPP’s `htdocs`.

## Pages

- `index.html` — dashboard and financial snapshot
- `pages/members.html` — member roster
- `pages/assessments.html` — assessed membership fees and balances
- `pages/collections.html` — cash collections and receipt previews
- `pages/expenses.html` — direct expense records and supporting document previews
- `pages/cash-advances.html` — advances, receipt-backed expenses, and returned cash
- `pages/reports.html` — monthly, annual, and custom-period summaries; CSV download and print
- `pages/settings.html` — organization preferences and backend status

## Backend

- `api/state.php` — same-origin GET/PUT JSON API, validation, and version checks
- `api/config.example.php` — local MySQL connection template; copy it to `api/config.php`
- `database/schema.sql` — creates the MySQL database and state table
- `assets/js/data.js` — JavaScript data model, API calls, and accounting calculations

The existing JavaScript modules continue to implement the page interactions. They load and save through the PHP API. A new database starts with an empty organization profile and no members or transactions; records are added through the app. No sample records are imported from browser storage. Subsequent visits and browsers use the server copy. Saves use a version number so a stale tab cannot silently overwrite a newer copy; when a conflict occurs, the latest saved data is reloaded.

For the smallest integration with the existing frontend, the schema stores the organization’s state as one validated JSON document in MySQL. This is a single shared workspace, not a multi-organization or audited ledger. Back up the database regularly.

## Accounting

Available cash is calculated as:

`actual collections − direct expenses − cash-advance expenses − outstanding cash advances`

Outstanding cash advances are the unliquidated difference between the amount issued and expenses plus cash returned. Returned cash is not counted as a new collection; settling the advance removes the amount previously withheld from available cash.

Expense attachment previews support PDF, JPG, PNG, and WEBP files up to 2 MB; their data is stored in the MySQL state document.

## Security and deployment

This starter backend has **no login or access control**. Run it only on your own machine at `127.0.0.1`; do not bind the development server to a public or LAN interface, expose it to the internet, or store real member/financial data until authentication, authorization, HTTPS, and production deployment controls are added. Keep `api/config.php` private and never commit database credentials.
