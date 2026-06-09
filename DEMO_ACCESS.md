# Demo Access

## Quick Login

For testing and demo purposes, use these credentials:

**Email:** `admin`  
**Password:** `admin`

This will log you in as an admin user with full access to the inventory management app.

## Features Available in Demo

- ✅ Upload PDF invoices (Wisley vendor format)
- ✅ Manual order entry
- ✅ Upload shoot lists
- ✅ Track current inventory with FIFO costing
- ✅ YouTube product search integration
- ✅ Finale 3D CSV exports
- ✅ CSV/Excel imports and exports

## Data Storage

Currently, all data is stored in browser localStorage:
- Data persists in your browser
- Clearing browser data will reset the inventory
- Data is **not** shared between users/browsers
- Multi-user cloud sync coming soon with Supabase integration

## Next Steps for Production

1. **Authentication:** Replace mock auth with Supabase Auth
2. **Database:** Migrate from localStorage to Supabase PostgreSQL
3. **Payments:** Integrate Stripe for subscription billing
4. **Multi-tenancy:** Add organizations/teams feature
5. **Deploy:** Production deployment to Vercel or Render

---

**Note:** This is a development demo. Do not use for production data until authentication and cloud database are implemented.
