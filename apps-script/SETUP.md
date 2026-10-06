# Birthday & anniversary setup

How it works:

1. Each employee opens **My profile → Birthday & work anniversary** in the portal and saves their dates.
2. The dates are written to a Google Sheet (the employee directory). HR can also edit the sheet directly.
3. Every morning, `Celebrations.gs` emails `team@scube-ergo.com` (everyone) for each birthday or work anniversary that day.
   The person being celebrated is CC'd.
4. The dashboard's **Upcoming celebrations** panel reads the same sheet.

No paid tools are needed. Everything runs on Google Apps Script, which is included with Google Workspace.

## 1. Create the sheet

Create an empty Google Sheet named **Scube Employee Directory**.
You don't need to add any columns. The script creates the `Employees` tab and its columns
(Name, Email, Department, Birthday, Joining Date, Opt Out) the first time someone saves their dates.

To fill in dates for people yourself, add rows with real date cells (Format → Number → Date).

Open **File → Settings** and set the sheet's **time zone** to your office time zone.

## 2. Add the script

1. In the sheet, open **Extensions → Apps Script**.
2. Replace the contents of `Code.gs` with `Celebrations.gs` and save (Ctrl+S).
3. Open ⚙️ **Project Settings** and set the **Time zone** to the same time zone as the sheet.
4. Check the settings at the top of the script:
   - `ALL_EMPLOYEES = 'team@scube-ergo.com'`: the address that reaches everyone.
   - `TEST_RECIPIENT`: while this holds your own address, the daily job only emails you, marked `[TEST]`.
   - `ADMINS`: addresses that may receive test emails requested from the portal.

## 3. Send a test email from the editor (do this first)

1. Pick **sendTestMail** in the function drop-down and click **Run**.
2. On the first run, Google asks for permission: **Review permissions → your account → Advanced → Go to project → Allow**.
3. Check your inbox for two emails: `[TEST] 🎂 Happy Birthday…` and `[TEST] 🎉 Happy 3-year work anniversary…`.

If they look right, the email sending works.

Once people have saved dates, **sendTestMail** instead sends the *next real* birthday or anniversary from the sheet,
exactly as `team@` will get it, with a yellow note saying which day it's for. It still goes only to you.

## 4. Connect the portal

1. Click **Deploy → New deployment**, choose type **Web app**, set **Execute as: Me** and **Who has access: Anyone**, then click **Deploy**.
2. Copy the `/exec` URL into `CELEBRATIONS_URL` near the top of `app.js`.
3. Open the portal. Then:
   - **Admin → Overview → Upcoming celebrations → Send test email** sends the same two test emails from the portal.
   - **My profile → Save dates** writes a row to the sheet. Check that it appears.

After you edit the script, click **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy** so the web app picks up the change.

## 5. Test the daily job

1. Save a birthday of today on your own profile.
2. Run **sendDailyWishes** in the editor. With `TEST_RECIPIENT` set, only you get the email.
   Running it again the same day sends nothing. That's the duplicate guard.

## 6. Go live

1. Set `TEST_RECIPIENT = ''` and save.
2. Run **createDailyTrigger** once. Emails now go to `team@scube-ergo.com` every day between 8 and 9 AM.
3. Ask everyone to add their dates under **My profile**.

If `team@` is a Google Group, make sure the script owner is allowed to post to it
(admin.google.com → **Directory → Groups → team → Settings**).

## Good to know

- **Privacy:** birthdays are stored without a year (shown as "14 March"). The portal feed only returns day and month for the next 45 days.
  Anyone with the web app URL can read that list, so keep the URL internal.
- **Opt out:** ticking "Don't celebrate me" removes the person from emails and the dashboard.
- **Not yet identity-checked:** the portal's sign-in is still a demo. The web app trusts the email address the portal sends,
  so someone who knows the URL could change another employee's dates. Once the portal uses real Google Sign-In,
  the script should verify the sign-in token before saving.
- **Limits:** Workspace accounts can send to about 1,500 recipients a day. One email to `team@` counts as 1.
- **Ownership:** create the sheet and script under a long-lasting account (admin or HR). If the owner's account is removed, the automation stops.
