# Presentation Script (8–10 minutes)

**Before you start:** `npm run dev`, open http://localhost:5173 at desktop width. If anything was clicked beforehand, use **Demo tools → Reset demo data**.
Every value below comes from the default dataset (demo date Mon 23 Nov 2026).

## 1. Introduction (1 min)
- Sonara 2.0 replaces manual scheduling at the music school. Managers struggle to see Workload, check Availability and avoid clashes when allocating 30-minute Jobs across five Studios.
- There are three roles: **Teacher**, **Manager** and **IT Administrator**. The login screen shows the demo accounts.
- Note the fixed demo date in the top bar.

## 2. Teacher workflow (2 min) – `alice.tan / teacher123`
1. **UC03:** On the Dashboard, show this week's Jobs grouped by day (time, Instrument, Studio) and *Total Workload – November 2026*.
2. **UC01:** Go to Availability. Point out the deadline banner: December was due by Thu 19 Nov.
   - Calendar › next month › **Mon 14 Dec** › 10:00 AM – 2:00 PM › Save. The entry shows a **Late** badge (FR-10).
   - Back to November › **Wed 25 Nov** › Edit › change *To* to 6:00 PM › Save changes. It is still On time (FR-08).
   - *Alternative:* choose From 3:00 PM, To 1:00 PM. You get the field error "End time must be after the start time."
3. **UC02:** Go to Job Preferences › **Week of Mon 30 Nov** › add Mon 10 AM–4 PM and Wed 10 AM–1 PM › 14 hours › Save. Then Edit to show it updates.
4. **UC04:** Go to My Jobs › select the first Job › **Reject Job**. Read the warning aloud ("discuss this Job with your Manager"). Press **Cancel** and the Job stays. Reject again › **Confirm rejection**. The status is now **Unallocated** and the Job leaves the list. Note the Job id (e.g. J-2053).
5. *Access control:* Open `#/manager` in the address bar. **Access denied** appears. Log out.

## 3. Manager workflow (2 min) – `grace.ho / manager123`
1. **UC05:** On the Dashboard, show:
   - the Workload table (FR-01)
   - Lowest three: Isaac 2.0 h, Gabriel 2.5 h, Hui Min 4.0 h (FR-02)
   - **Above 40 hours**: Farah 45.0 h, Chloe 42.0 h, shown with a text label, icon and striped bar, not colour alone (FR-03)
   - *Unallocated Jobs this week* is now 3, including Alice's rejected Job (FR-30)
2. **FR-04:** Click Isaac's **Availability** › set the date to 2 Dec. December entries show **Late**.
3. **UC06:** Go to Teacher Profiles › Gabriel Lim › Edit Profile › years 4, add "Orchestral audition coaching" › Save. *Alternative:* clear the years field and Save to show the validation error.

## 4. Job Allocation (3 min) – still Manager
1. **Select week:** This week.
2. **Compare:** Click Isaac Koh, Gabriel Lim and Hui Min Chua, then try Alice Tan. The prototype refuses with "up to 3 Teachers" (FR-13). Walk through one card: Workload, Availability, Job Preference, Location (set the date to Tue 24 Nov), and Profile (FR-14 to FR-18).
3. **Rejections.** For each, fill the form and press *Validate and allocate Job*. Pick at least two:

| Teacher | Date | Start | Instrument | Studio | Broken rule |
|---|---|---|---|---|---|
| Isaac Koh | Wed 25 Nov | 6:00 PM | Violin | Studio 3 | FR-26 not qualified |
| Daniel Wong | Tue 24 Nov | 3:00 PM | Drums | Studio 3 | FR-24 no drum kit |
| Chloe Ng | Mon 23 Nov | 1:00 PM | Violin | Studio 4 | FR-25 continuous limit (8 h block) |
| Isaac Koh | Thu 26 Nov | 6:00 PM | Guitar | Studio 3 | FR-21 public holiday |
| Daniel Wong | Tue 24 Nov | 8:30 AM | Guitar | Studio 2 | FR-20 before opening |
| Isaac Koh | Sat 28 Nov | 10:00 AM | Guitar | Studio 4 | FR-19 no Availability |
| Isaac Koh | Tue 24 Nov | 7:00 PM | Guitar | Studio 1 | FR-22 Teacher overlap |
| Isaac Koh | Wed 25 Nov | 6:00 PM | Guitar | Studio 2 | FR-23 Studio in use (Farah) |

   Each result names the FR, explains the exact reason, and shows the full 8-rule checklist. Nothing is saved.
   *Tip:* the comparison card's "Use in allocation form" fills the Teacher field.
4. **Success:** Isaac Koh · Wed 25 Nov · 6:00 PM · Guitar · Studio 3. The allocation is confirmed, Isaac's chip goes from 2.0 h to 2.5 h, and the Job list shows "Just allocated". Submit the same again and FR-22 now fails.
5. *Optional:* Use the *Job* dropdown to load Alice's rejected Unallocated Job and allocate it to someone qualified. Log out.

## 5. IT Administrator and conclusion (1–2 min) – `it.admin / admin123`
1. Press *Create account* empty to show the field errors.
2. Create **Nora Tan**, `nora.tan`, Teacher, password `welcome123`. The success panel appears and the account is listed as **New**. Only Teacher and Manager can be chosen (FR-31).
3. Log out › sign in as `nora.tan`. Nora gets a Teacher dashboard with no Jobs.
4. Summarise role-based access:
   - the route guard sends unauthenticated users to login
   - wrong-role pages show Access denied
   - every action re-checks the role
   - Teachers only ever see their own data
   - *Demo tools → Simulate 30-minute inactivity* shows the timeout (NFR-12)
   - five wrong passwords lock the account (NFR-13)
5. Make clear this is a frontend prototype (see LIMITATIONS.md). **Reset demo data** for questions.

## Likely questions
- *Why does a 30-minute gap still count as continuous teaching?* The rule requires a break of at least 1 hour, so shorter gaps don't end a block (see LIMITATIONS.md, A3).
- *Is the holiday real?* No. All holidays are labelled mock data.
- *Does rejection reassign the Job?* No. It becomes Unallocated, and the Manager decides what to do with it.
