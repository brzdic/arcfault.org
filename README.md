# arcfault.org

Making electric life better, one report at a time.

A public map and list of nuisance AFCI breaker trips, a report form, and a private admin page.

## What's in this folder

| Path | What it is |
|---|---|
| `public/index.html` | The public site: map, report list, report form |
| `public/admin.html` | Your private admin page (at arcfault.org/admin) |
| `public/styles.css`, `public/geo.js` | Shared design and town/state locations |
| `netlify/functions/reports.mts` | Saves new reports and serves approved ones to the map |
| `netlify/functions/admin.mts` | Password-protected admin actions and CSV exports |
| `netlify/database/migrations/` | The database structure (applied automatically on deploy) |
| `netlify.toml` | Netlify settings |

## First-time setup

1. **Upload to GitHub.** Create a new private repository called `arcfault` and upload everything in this folder (keep the folder structure).
2. **Connect Netlify.** In Netlify: Add new project → Import from Git → pick the `arcfault` repo. Leave the build settings as they are (they come from `netlify.toml`).
3. **Set your admin password.** Project configuration → Environment variables → add `ADMIN_PASSWORD`. Use at least 12 characters; the admin page refuses to work with anything shorter. Then redeploy (Deploys → Trigger deploy).
4. **Deploy.** Netlify creates the database and the `reports` table on the first deploy.
5. **Connect the domain.** Domain management → Add a domain → `arcfault.org`, then follow Netlify's DNS instructions at your domain registrar.
6. **Test it.** Send a test report, open `arcfault.org/admin`, log in, approve it, and check it shows on the map.

Netlify Database needs a credit-based Netlify plan.

## Keeping your data safe

- **Updating the site never erases reports.** The database is separate from the site files.
- **To add a new form question**, add a new migration file. Never edit or delete an existing one; Netlify rejects the deploy if you do. Create it with:
  `netlify database migrations new -d add_something`
  Example contents: `ALTER TABLE reports ADD COLUMN home_year INTEGER;`
- **Only add columns.** Renaming or dropping a column can break the live site and lose data.
- **Test changes on a branch first.** A pull request gets a deploy preview with its own copy of the database, so real reports are never touched.
- **Preview links contain a copy of real data.** The private fields are still behind your admin password, but don't post preview links publicly.
- **Back up monthly.** On the admin page, press "Export all reports (CSV)" and save the file somewhere outside Netlify (Google Drive, your computer).
- **Never delete the Netlify project.** The database belongs to it.

## Working on it locally (optional)

```
npm install -g netlify-cli
npm install
netlify link
netlify dev
```

This runs the site and a local copy of the database on your computer. Local database changes need `netlify database migrations apply`.
