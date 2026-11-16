# S Cube Employee Portal

The S Cube company portal for employees: AI video training courses, with per-person watch progress, an admin dashboard,
and birthday & work-anniversary emails to the whole company.

| Part | Technology | Where it runs |
|---|---|---|
| Front end | React (Vite), in `web/` | Served by the API |
| API | Node.js + Express, in `server/` | Google Cloud Run (Singapore) |
| Database | PostgreSQL | Neon (Singapore) |
| Course videos | Google Cloud Storage (private bucket, signed links) | Singapore |
| Sign-in | 6-digit code emailed to the work address, plus optional Google Sign-In. @scube-ergo.com only | |
| Emails | Workspace Gmail (SMTP with an app password, or the Gmail API) | |
| Daily celebrations job | Cloud Scheduler, 8 AM India time | |

## Run it on your computer

Needs Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173, enter any `@scube-ergo.com` address and click **Continue**.

With no settings, local development runs in a simplified mode:
- **Database:** in memory, so data is lost when you stop the server.
- **Videos:** saved in `server/.data/`.
- **Emails:** printed in the terminal, including sign-in codes.

To use real services locally, fill in `server/.env` (see `server/.env.example`).

## Deploy to Google Cloud Run

Do this once, with the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed and `gcloud auth login` done.
Region: `asia-southeast1` (Singapore), next to the Neon database.
In the commands, replace `PROJECT_ID` with your project's ID.

### 1. Project

Create a project at https://console.cloud.google.com and turn on billing. Then:

```bash
gcloud config set project PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  cloudscheduler.googleapis.com iamcredentials.googleapis.com secretmanager.googleapis.com storage.googleapis.com
```

### 2. Video storage and the service account

```bash
gcloud storage buckets create gs://PROJECT_ID-videos --location=asia-southeast1 --uniform-bucket-level-access
gcloud iam service-accounts create scube-portal --display-name="Scube portal"
SA=scube-portal@PROJECT_ID.iam.gserviceaccount.com
gcloud storage buckets add-iam-policy-binding gs://PROJECT_ID-videos --member=serviceAccount:$SA --role=roles/storage.objectAdmin
# lets the portal sign upload/playback links without a key file
gcloud iam service-accounts add-iam-policy-binding $SA --member=serviceAccount:$SA --role=roles/iam.serviceAccountTokenCreator
```

The bucket stays private. People watch through short-lived signed links that only the portal hands out.

### 3. Secrets

The values come from `server/.env`: the Neon `DATABASE_URL` and the Gmail app password `SMTP_PASS`.
Generate new random strings for the session key and the scheduler secret.

```bash
for s in session-secret cron-secret database-url smtp-pass; do gcloud secrets create $s --replication-policy=automatic; done
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))" | gcloud secrets versions add session-secret --data-file=-
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))" | gcloud secrets versions add cron-secret --data-file=-
printf '%s' 'PASTE_DATABASE_URL' | gcloud secrets versions add database-url --data-file=-
printf '%s' 'PASTE_APP_PASSWORD' | gcloud secrets versions add smtp-pass --data-file=-
for s in session-secret cron-secret database-url smtp-pass; do
  gcloud secrets add-iam-policy-binding $s --member=serviceAccount:$SA --role=roles/secretmanager.secretAccessor
done
```

### 4. Deploy

```bash
gcloud run deploy scube-portal --source . --region=asia-southeast1 --service-account=$SA --allow-unauthenticated \
  --set-env-vars="^@^GCS_BUCKET=PROJECT_ID-videos@ADMIN_EMAILS=raghu@scube-ergo.com@TIMEZONE=Asia/Kolkata@ALL_EMPLOYEES_EMAIL=team@scube-ergo.com@TEST_RECIPIENT=raghu@scube-ergo.com@TEST_EMAIL_RECIPIENTS=raghu@scube-ergo.com,sneha@scube-ergo.com@SMTP_USER=raghu@scube-ergo.com@MAIL_FROM=Scube Celebrations <raghu@scube-ergo.com>" \
  --set-secrets="SESSION_SECRET=session-secret:latest,CRON_SECRET=cron-secret:latest,DATABASE_URL=database-url:latest,SMTP_PASS=smtp-pass:latest"
```

`^@^` makes `@` the separator between settings, so the comma inside `TEST_EMAIL_RECIPIENTS` is kept.

`--allow-unauthenticated` only makes the page reachable. Everything inside still requires an @scube-ergo.com sign-in.

The deploy prints the service URL, e.g. `https://scube-portal-xxxxx.asia-southeast1.run.app`. Then:

1. **Bucket CORS** (lets the browser upload videos): put the URL into `cors.json`, then run:
   ```bash
   gcloud storage buckets update gs://PROJECT_ID-videos --cors-file=cors.json
   ```
2. **PORTAL_URL** (linked in emails):
   ```bash
   gcloud run services update scube-portal --region=asia-southeast1 --update-env-vars=PORTAL_URL=https://YOUR-URL
   ```

### 5. Daily birthday & anniversary job

```bash
gcloud scheduler jobs create http daily-wishes --location=asia-southeast1 \
  --schedule="0 8 * * *" --time-zone="Asia/Kolkata" \
  --uri="https://YOUR-URL/api/cron/daily-wishes" --http-method=POST \
  --headers="X-Cron-Secret=$(gcloud secrets versions access latest --secret=cron-secret)"
```

### 6. Test, then go live

1. Open the portal and sign in with an emailed code.
2. Upload a course video and play it.
3. Go to **My profile** and save your birthday and joining date.
4. Go to **Overview → Upcoming celebrations → Send test email.**
5. Run the daily job by hand. With `TEST_RECIPIENT` set, it only emails you:
   ```bash
   gcloud scheduler jobs run daily-wishes --location=asia-southeast1
   ```
6. Go live: remove `TEST_RECIPIENT`. From then on, wishes go to team@scube-ergo.com every morning at 8.
   ```bash
   gcloud run services update scube-portal --region=asia-southeast1 --remove-env-vars=TEST_RECIPIENT
   ```

### Updating the portal later

```bash
gcloud run deploy scube-portal --source . --region=asia-southeast1
```

Settings and secrets are kept.

### Optional: "Continue with Google" button

1. In **Google Auth Platform**:
   - Under **Branding**, choose user type **Internal**.
   - Under **Clients**, create a **Web application** client.
   - Add the service URL as an Authorized JavaScript origin.
2. Then run `gcloud run services update scube-portal --region=asia-southeast1 --update-env-vars=GOOGLE_CLIENT_ID=...`

## Costs (rough, for ~50–200 employees)

| Item | Cost |
|---|---|
| Cloud Run | Usually within the free tier. The first visit after a quiet period takes 1–3 s to start |
| Database (Neon) | Free tier |
| Video storage | About $0.02 per GB per month |
| Video streaming | About $0.12 per GB watched. Example: 100 people × 500 MB of video ≈ $6 |
| Cloud Build, Scheduler, Secret Manager | Free or a few cents at this size |
| Email | Free (your Workspace Gmail; one email to team@ counts as 1 recipient) |

## How it works

- **Sign-in with an email code:** the person enters their @scube-ergo.com email and gets a 6-digit code by email.
  The rules:
  - Codes expire after 10 minutes and are stored only as a keyed hash.
  - A new code replaces the old one.
  - 5 wrong tries cancel the code.
  - One code per minute and 5 per hour per address, plus a limit per network.
- **Sessions:** signing in sets a 7-day session cookie. People appear in **People & progress** after their first sign-in.
- **Admins:** anyone in `ADMIN_EMAILS`, plus anyone an admin promotes from a person's profile in **People & progress**.
- **Progress:** only the parts of a video someone actually plays count (skipping ahead doesn't). Progress saves every 15 seconds,
  on pause, and when the tab closes. It's merged on the server, so watching on two devices never loses progress.
  A course counts as completed at 90%.
- **Uploads:** the browser uploads straight to Cloud Storage through a signed link, up to 5 GB per video.
- **Celebrations:** employees add their birthday (day and month only) and joining date under **My profile**.
  Each morning the job emails `team@` for every birthday and work anniversary that day, with the person in CC.
  It never sends the same wish twice in a day.
