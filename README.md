# Scube Learning Portal

AI video courses for Scube employees, with per-person watch progress, an admin dashboard,
and birthday & work-anniversary emails to the whole company.

| Part | Technology | Where it runs |
|---|---|---|
| Front end | React (Vite), in `web/` | Served by the API |
| API | Node.js + Express, in `server/` | Render (deploys on every git push), or Google Cloud Run |
| Database | PostgreSQL | Neon (free tier), or Cloud SQL |
| Course videos | Google Cloud Storage (private bucket, signed links) | |
| Sign-in | 6-digit code emailed to the work address, plus optional Google Sign-In. @scube-ergo.com only | |
| Emails | Workspace Gmail, via the Gmail API (HTTPS) or SMTP | |
| Daily celebrations job | GitHub Actions schedule (Render), or Cloud Scheduler (Cloud Run) | |

## Run it on your computer

Needs Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173, enter any `@scube-ergo.com` address and click **Continue**.
The 6-digit sign-in code appears in the terminal, as `[mail not sent…] subject="123456 is your Scube portal sign-in code"`.
`raghu@scube-ergo.com` is an admin if you copy `server/.env.example` to `server/.env`.

With no settings, local development runs in a simplified mode:
- **Database:** in memory, so data is lost when you stop the server.
- **Videos:** saved in `server/.data/`.
- **Emails:** printed in the terminal instead of sent.

To use real services locally, fill in `server/.env` (see `server/.env.example`).

## Deploy to Render (git push)

One Render web service runs everything (see `render.yaml`). Pushing to the `main` branch on GitHub redeploys it.
The free plan blocks SMTP and sleeps when idle, so this setup does two things differently:
- **Email:** sent through the **Gmail API** over HTTPS instead of SMTP.
- **Daily job:** the 8 AM birthday job runs from **GitHub Actions** (`.github/workflows/daily-wishes.yml`), which also wakes the site.

### A. Google Cloud: video storage and Gmail API (one project)

1. **Create a project with billing.** At https://console.cloud.google.com create a project (e.g. `scube-portal`) and turn on billing.
2. **Create the video bucket and an access key**, with the gcloud CLI:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   gcloud services enable storage.googleapis.com gmail.googleapis.com
   gcloud storage buckets create gs://YOUR_BUCKET --location=asia-southeast1 --uniform-bucket-level-access
   gcloud iam service-accounts create scube-portal
   gcloud storage buckets add-iam-policy-binding gs://YOUR_BUCKET \
     --member=serviceAccount:scube-portal@YOUR_PROJECT_ID.iam.gserviceaccount.com --role=roles/storage.objectAdmin
   gcloud iam service-accounts keys create gcs-key.json --iam-account=scube-portal@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```
   If key creation is blocked by the policy `iam.disableServiceAccountKeyCreation`, an organization admin must allow it for this project:
   **IAM & Admin → Organization policies**.
3. **Gmail API sign-in:** in **Google Auth Platform**:
   - Under **Branding**, choose user type **Internal**.
   - Under **Clients**, click **Create client** and choose type **Desktop app**.
   - Put the client ID and secret into `server/.env` as `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`.
   - Run `npm run gmail-auth -w server`, sign in as the sending account (raghu@scube-ergo.com) and click **Allow**.
     That writes `GMAIL_REFRESH_TOKEN` into `server/.env`.

### B. GitHub

Push this folder to a **private** GitHub repository. `.env` files, `node_modules` and uploads are excluded by `.gitignore`.

### C. Render

1. At https://render.com, sign up and connect GitHub. Click **New → Blueprint** and pick the repository. Render reads `render.yaml`.
2. Fill in the values it asks for:

   | Setting | Value |
   |---|---|
   | `DATABASE_URL` | Your Neon connection string (from `server/.env`) |
   | `GCS_BUCKET` | The bucket name |
   | `GCS_CREDENTIALS` | The whole contents of `gcs-key.json`. Delete the file afterwards. |
   | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | From `server/.env` |
   | `PORTAL_URL` | `https://scube-portal.onrender.com` (adjust after the first deploy if Render shows a different URL) |

3. **Deploy.** When it's live, set the bucket's CORS so the browser can upload videos. Put the Render URL into `cors.json`, then run:
   ```bash
   gcloud storage buckets update gs://YOUR_BUCKET --cors-file=cors.json
   ```

### D. Daily birthday & anniversary emails

1. In GitHub, go to **Settings → Secrets and variables → Actions** and add two repository secrets:
   - `PORTAL_URL`: your Render URL.
   - `CRON_SECRET`: copy it from **Render → Environment**.
2. Test it: open **Actions → Daily birthday & anniversary emails → Run workflow**.

### E. Go live

The site starts in test mode: daily wishes only go to `TEST_RECIPIENT`.
1. Check sign-in codes, video upload and playback, and **Send test email** on the live site.
2. Delete `TEST_RECIPIENT` in **Render → Environment**.

From then on, every `git push` to `main` redeploys automatically.

On the free plan, the first visit after 15 idle minutes takes about a minute while the site wakes up.
Upgrade to Starter (about $7/month) to remove that delay.

## Deploy to Google Cloud

Do this once, from a computer with the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed.
Commands below use `asia-south1` (Mumbai). Use the region closest to your office.

### 1. Project

1. Go to https://console.cloud.google.com, signed in with your Scube admin account, and create a project (e.g. `scube-portal`).
2. Turn on billing for it.
3. In a terminal:

```bash
gcloud auth login
gcloud config set project scube-portal
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  cloudscheduler.googleapis.com iamcredentials.googleapis.com secretmanager.googleapis.com sqladmin.googleapis.com
```

### 2. Google Sign-In (optional)

Email-code sign-in works without this step: it only needs the Gmail settings in step 6.
Add Google Sign-In if you also want a "Continue with Google" button.
If you skip it, leave `GOOGLE_CLIENT_ID` out of the deploy command in step 7.

In the Cloud console, open **Google Auth Platform**:
1. **Branding:** app name "Scube Learning Portal", user type **Internal**. Internal means only your Workspace accounts can use it.
2. **Clients → Create client → Web application:**
   - Authorized JavaScript origins: `http://localhost:5173` for now. You'll add the Cloud Run URL after step 7.
3. Copy the **Client ID**. That's `GOOGLE_CLIENT_ID`.

### 3. Database

Pick one:

- **Neon (free tier, easiest).** Create a project at https://neon.tech, choose a region near you, and copy the connection string.
  That's `DATABASE_URL`, e.g. `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
- **Cloud SQL (about $10/month for the smallest instance).**

  ```bash
  gcloud sql instances create scube-db --database-version=POSTGRES_16 --edition=ENTERPRISE --tier=db-f1-micro --region=asia-south1
  gcloud sql databases create portal --instance=scube-db
  gcloud sql users create portal --instance=scube-db --password=CHOOSE_A_PASSWORD
  ```

  Then `DATABASE_URL=postgresql://portal:CHOOSE_A_PASSWORD@/portal?host=/cloudsql/scube-portal:asia-south1:scube-db`

The tables are created automatically on first start.

### 4. Video storage

```bash
gcloud storage buckets create gs://scube-portal-videos --location=asia-south1 --uniform-bucket-level-access
```

The bucket stays private. People watch through short-lived signed links that only the portal hands out.

### 5. Service account (what the portal runs as)

```bash
gcloud iam service-accounts create scube-portal
SA=scube-portal@scube-portal.iam.gserviceaccount.com
gcloud storage buckets add-iam-policy-binding gs://scube-portal-videos --member=serviceAccount:$SA --role=roles/storage.objectAdmin
# lets it sign upload/playback links without a key file
gcloud iam service-accounts add-iam-policy-binding $SA --member=serviceAccount:$SA --role=roles/iam.serviceAccountTokenCreator
# only if you use Cloud SQL:
gcloud projects add-iam-policy-binding scube-portal --member=serviceAccount:$SA --role=roles/cloudsql.client
```

### 6. Email (Gmail app password)

The emails are sent from one Workspace account, for example `raghu@scube-ergo.com`.

1. That account needs **2-Step Verification** turned on.
2. Go to https://myaccount.google.com/apppasswords and create an app password named "Scube portal".
   If the page says app passwords aren't available, a Workspace admin must allow them:
   **Admin console → Security → Authentication → 2-step verification**.
3. The 16-letter password is `SMTP_PASS`. The account is `SMTP_USER`.

If `team@scube-ergo.com` is a Google Group, make sure the sending account is allowed to post to it.

### 7. Secrets and first deploy

```bash
# random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # run twice: SESSION_SECRET and CRON_SECRET

printf 'PASTE_SESSION_SECRET' | gcloud secrets create session-secret --data-file=-
printf 'PASTE_CRON_SECRET'    | gcloud secrets create cron-secret --data-file=-
printf 'PASTE_DATABASE_URL'   | gcloud secrets create database-url --data-file=-
printf 'PASTE_APP_PASSWORD'   | gcloud secrets create smtp-pass --data-file=-
for s in session-secret cron-secret database-url smtp-pass; do
  gcloud secrets add-iam-policy-binding $s --member=serviceAccount:$SA --role=roles/secretmanager.secretAccessor
done

gcloud run deploy scube-portal --source . --region=asia-south1 --service-account=$SA --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLIENT_ID=PASTE_CLIENT_ID,GCS_BUCKET=scube-portal-videos,ADMIN_EMAILS=raghu@scube-ergo.com,TIMEZONE=Asia/Kolkata,ALL_EMPLOYEES_EMAIL=team@scube-ergo.com,TEST_RECIPIENT=raghu@scube-ergo.com,TEST_EMAIL_RECIPIENTS=raghu@scube-ergo.com,SMTP_USER=raghu@scube-ergo.com,MAIL_FROM=Scube Celebrations <raghu@scube-ergo.com>" \
  --set-secrets="SESSION_SECRET=session-secret:latest,CRON_SECRET=cron-secret:latest,DATABASE_URL=database-url:latest,SMTP_PASS=smtp-pass:latest"
# Cloud SQL only: add  --add-cloudsql-instances=scube-portal:asia-south1:scube-db
```

`--allow-unauthenticated` only makes the page reachable. Everything inside still requires an @scube-ergo.com Google sign-in.

The deploy prints the service URL, e.g. `https://scube-portal-xxxxx.a.run.app`. Then:

1. **Google Auth Platform → Clients → your client:** add the URL to Authorized JavaScript origins.
2. **Bucket CORS** (lets the browser upload videos): put the URL into `cors.json`, then run:
   ```bash
   gcloud storage buckets update gs://scube-portal-videos --cors-file=cors.json
   ```
3. **PORTAL_URL** (linked in emails):
   ```bash
   gcloud run services update scube-portal --region=asia-south1 --update-env-vars=PORTAL_URL=https://scube-portal-xxxxx.a.run.app
   ```

### 8. Daily birthday & anniversary job

```bash
gcloud scheduler jobs create http daily-wishes --location=asia-south1 \
  --schedule="0 8 * * *" --time-zone="Asia/Kolkata" \
  --uri="https://scube-portal-xxxxx.a.run.app/api/cron/daily-wishes" --http-method=POST \
  --headers="X-Cron-Secret=PASTE_CRON_SECRET"
```

### 9. Test, then go live

1. Open the portal and sign in with Google.
2. Go to **My profile** and save your birthday and joining date.
3. Go to **Overview → Upcoming celebrations → Send test email.** You should receive a `[TEST]` email.
4. Run the daily job once by hand. With `TEST_RECIPIENT` set, it only emails you:
   ```bash
   gcloud scheduler jobs run daily-wishes --location=asia-south1
   ```
5. To go live, remove `TEST_RECIPIENT`:
   ```bash
   gcloud run services update scube-portal --region=asia-south1 --remove-env-vars=TEST_RECIPIENT
   ```
   From then on, wishes go to team@scube-ergo.com every morning at 8.

### Updating the portal later

Run the same `gcloud run deploy scube-portal --source . --region=asia-south1` command. Settings and secrets are kept.

## Costs (rough, for ~50–200 employees)

| Item | Cost |
|---|---|
| Cloud Run | Usually within the free tier |
| Database | Neon free tier, or Cloud SQL from about $10/month |
| Video storage | About $0.02 per GB per month |
| Video streaming | About $0.12 per GB watched. Example: 100 people × 500 MB of video ≈ $6 |
| Cloud Scheduler, Secret Manager | Free at this size |
| Email | Free (your Workspace Gmail; one email to team@ counts as 1 recipient) |

## How it works

- **Sign-in with an email code:** the person enters their @scube-ergo.com email and gets a 6-digit code by email.
  The rules:
  - Codes expire after 10 minutes and are stored only as a keyed hash.
  - A new code replaces the old one.
  - 5 wrong tries cancel the code.
  - One code per minute and 5 per hour per address, plus a limit per network.
- **Google Sign-In (optional):** the server checks the Google token and that the account belongs to the scube-ergo.com Workspace.
- **Sessions:** both methods set a 7-day session cookie. People appear in **People & progress** after their first sign-in.
- **Admins:** anyone in `ADMIN_EMAILS`, plus anyone an admin promotes from a person's profile in **People & progress**.
- **Progress:** only the parts of a video someone actually plays count (skipping ahead doesn't). Progress saves every 15 seconds,
  on pause, and when the tab closes. It's merged on the server, so watching on two devices never loses progress.
  A course counts as completed at 90%.
- **Uploads:** the browser uploads straight to Cloud Storage through a signed link, up to 5 GB per video.
- **Celebrations:** employees add their birthday (day and month only) and joining date under **My profile**.
  Each morning the job emails `team@` for every birthday and work anniversary that day, with the person in CC.
  It never sends the same wish twice in a day.
