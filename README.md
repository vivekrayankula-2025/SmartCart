# SmartCart

SmartCart is a React and Django ecommerce application with separate **customer**, **seller**, and **company-management** accounts.

## Roles

- **Customer:** browse/search the product catalog and photos, place an order using card, UPI, or cash on delivery, follow order and shipping status, view order history, and print an itemized invoice.
- **Seller:** create a seller account, add or delete product listings, add an optional product picture URL, and fulfil orders that include their products by updating shipping status.
- **Company management:** view company-wide sales by product and daily turnover. Management accounts cannot be created by public registration; an authorized operator provisions them privately through the management command below.

Product-category photos ship under `frontend/public/images/`. Seller listings can use a public HTTPS picture URL or the relevant bundled category photo. In an order invoice, use **Print invoice** and choose “Save as PDF” in the browser’s print dialog.

## Requirements and local setup

Requirements: Python 3.12 or newer, Node.js 20 or newer, and npm.

1. From the unzipped SmartCart folder, create a virtual environment and install the backend requirements:

   ```bash
   python -m venv .venv
   # macOS/Linux
   source .venv/bin/activate
   # Windows PowerShell: .venv\Scripts\Activate.ps1
   pip install -r backend/requirements.txt
   ```

2. Copy `backend/.env.example` to `backend/.env`. Set a unique, long `DJANGO_SECRET_KEY`; for example, generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Keep the populated `.env` private. Local setup uses SQLite by default; managed hosting reads its configured database URL.

3. Apply database migrations and optionally create the sample catalog:

   ```bash
   cd backend
   python manage.py migrate
   python manage.py seed_products
   ```

   The ZIP contains source and static assets, **not an SQLite database**. A new local database is created on first migration; the seed command is safe to rerun and creates/updates the 120 sample products.

4. In one terminal, start Django:

   ```bash
   cd backend
   python manage.py runserver 127.0.0.1:8000
   ```

5. In a second terminal, start the storefront:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   Open the local Vite address shown in the terminal (normally `http://localhost:3000`). Vite proxies `/api` requests to Django on port 8000.

## Accounts

Customers and sellers register through the storefront. To add company management, an authorized operator with database access runs this command:

```bash
cd backend
python manage.py create_management_account
```

It interactively requests the name, company, email, and a newly-entered/confirmed password. Credentials are not bundled with the source. Sign in using the **Management** role option; never enable management registration for the public.

On an existing legacy SmartCart database, the migration converts `company` profiles to `seller`. It keeps orders and products. If upgrading an old database, take a backup before applying migrations.

## Card and UPI payments

Card and UPI payments use Stripe Checkout. SmartCart does not collect or store card numbers or security codes. Cash on delivery works without Stripe. If the Stripe secret is missing, card/UPI checkout returns an explicit setup error instead of creating a falsely-paid order.

For a local Stripe **test-mode** setup, privately configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `backend/.env`. Forward signed Stripe webhook events to `http://localhost:8000/api/stripe/webhook` (the Stripe CLI can create the local forwarding endpoint). Configure the Stripe account to support INR card/UPI payments; use Stripe test instruments only in development. A verified server webhook, not the browser redirect, confirms payment. Customer orders separately show pending, paid, failed, and cash-due-on-delivery states.

For hosted use, add provider credentials using the hosting platform’s protected secret configuration. Do not put live credentials in this ZIP or source control. Test the payment integration before accepting real orders.

## Reports and turnover

Company-management reports include all sold-product units and revenue by product, daily turnover, and 7-, 30-, or 90-day summaries. Turnover is non-cancelled product-line sales value (delivery fees excluded) for confirmed online payments plus cash-on-delivery bookings; the report labels COD amounts as due until delivery. Unpaid online orders are excluded. All prices are INR.

## Project structure

- `frontend/src/pages/` — storefront, login and registration, customer orders/invoices, seller workspace, and management reports.
- `frontend/src/components/` — product cards/photos, navigation, forms, and reusable UI.
- `frontend/public/images/` — bundled category product photographs and the route manifest.
- `backend/accounts/` — account roles, authentication, migrations, and management-account provisioning.
- `backend/catalog/` — product/category catalog and seller-owned product APIs.
- `backend/orders/` — customer bookings, seller fulfilment, invoice snapshots, payment sessions/webhooks, and reports.
- `backend/config/` — Django settings, API routes, and production frontend serving.

## Security and deployment notes

Never commit `backend/.env`, live credentials, or real customer data. Use HTTPS and a persistent strong `DJANGO_SECRET_KEY` for deployments. Use a separate, persistent production database and Stripe live credentials only after setting up and testing the hosting environment. The included SQLite data file is intentionally excluded so that the distributable ZIP contains only source and static assets.
