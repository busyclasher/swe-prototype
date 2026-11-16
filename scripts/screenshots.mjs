// End-to-end walkthrough + screenshots (deliverable 9).
// Drives the built app in Microsoft Edge (or Chrome) via playwright-core.
//   npm run build && npm run screenshots
// Set BROWSER_PATH to use another Chromium-based browser.

import { existsSync, mkdirSync } from 'node:fs';
import { preview } from 'vite';
import { chromium } from 'playwright-core';

const CANDIDATES = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) throw new Error('No Chromium-based browser found. Set BROWSER_PATH.');

const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } };

const server = await preview({ preview: { port: 4183, strictPort: true }, logLevel: 'silent' });
const BASE = 'http://localhost:4183/';
const browser = await chromium.launch({ executablePath, headless: true });

const results = [];
const consoleErrors = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name, e.message.split('\n')[0]]);
  }
}
const expectText = async (page, text, timeout = 3000) => {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout });
};
async function noOverflow(page, label) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (sw > cw + 1) throw new Error(`${label}: horizontal overflow ${sw}px > ${cw}px`);
}
async function newPage(vp = 'desktop') {
  const ctx = await browser.newContext({ viewport: VIEWPORTS[vp], deviceScaleFactor: vp === 'mobile' ? 2 : 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.goto(BASE);
  return page;
}
async function login(page, user, pass) {
  await page.getByLabel('Username').fill(user);
  await page.getByLabel('Password').fill(pass);
  await page.getByRole('button', { name: 'Sign in' }).click();
}
async function logout(page) {
  const btn = page.getByRole('button', { name: 'Log out' }).filter({ visible: true }).first();
  await btn.click();
  await page.getByRole('heading', { name: 'Sign in' }).waitFor();
}
const shot = (page, name, full = true) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
const go = async (page, path) => {
  await page.evaluate((p) => { window.location.hash = p; }, `#${path}`);
  await page.waitForTimeout(150);
};

// ---------------- Desktop walkthrough ----------------
const page = await newPage('desktop');

await step('Login page renders; unauthenticated access redirects to login (NFR-08)', async () => {
  await go(page, '/manager');
  await page.getByRole('heading', { name: 'Sign in' }).waitFor();
  await shot(page, 'desktop-01-login', false);
});

await step('Five failed logins lock the account (NFR-13)', async () => {
  for (let i = 0; i < 5; i++) await login(page, 'daniel.wong', 'wrong-password');
  await expectText(page, 'Account temporarily locked');
  await page.getByLabel('Password').fill('teacher123');
  if (!(await page.getByRole('button', { name: 'Sign in' }).isDisabled())) throw new Error('Sign in should be disabled while locked');
  await shot(page, 'desktop-02-login-lockout', false);
});

await step('UC03 Teacher login shows weekly Jobs and monthly Workload (FR-05, FR-06)', async () => {
  await login(page, 'alice.tan', 'teacher123');
  await expectText(page, 'Welcome, Alice');
  await expectText(page, "This week's allocated Jobs");
  await expectText(page, 'Total Workload – November 2026');
  await noOverflow(page, 'teacher dashboard');
  await shot(page, 'desktop-03-teacher-dashboard');
});

await step('Teacher cannot open Manager pages (NFR-09)', async () => {
  await go(page, '/manager/allocation');
  await expectText(page, 'Access denied');
  await shot(page, 'desktop-04-access-denied', false);
});

await step('UC01 add December Availability is marked Late (FR-07, FR-10)', async () => {
  await go(page, '/teacher/availability');
  await page.getByRole('button', { name: 'Next month, December 2026' }).click();
  await page.getByRole('button', { name: /^Mon 14 Dec 2026/ }).click();
  await page.getByLabel(/^From/).selectOption({ label: '10:00 AM' });
  await page.getByLabel(/^To/).selectOption({ label: '2:00 PM' });
  await page.getByRole('button', { name: 'Save Availability' }).click();
  await expectText(page, 'Saved just now');
  await page.locator('.avail-item', { hasText: '10:00 AM – 2:00 PM' }).getByText('Late').waitFor();
});

await step('UC01 validation: end before start is rejected', async () => {
  await page.getByLabel(/^From/).selectOption({ label: '3:00 PM' });
  await page.getByLabel(/^To/).selectOption({ label: '1:00 PM' });
  await page.getByRole('button', { name: 'Save Availability' }).click();
  await expectText(page, 'End time must be after the start time.');
});

await step('UC01 edit existing Availability (FR-08)', async () => {
  await page.getByRole('button', { name: 'Previous month, November 2026' }).click();
  await page.getByRole('button', { name: /^Wed 25 Nov 2026/ }).click();
  await page.getByRole('button', { name: /Edit Availability/ }).first().click();
  await page.getByLabel(/^To/).selectOption({ label: '6:00 PM' });
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expectText(page, '9:30 AM – 6:00 PM');
  await page.locator('.avail-item', { hasText: '9:30 AM – 6:00 PM' }).getByText('On time').waitFor();
  await shot(page, 'desktop-05-teacher-availability');
});

await step('UC02 record a Job Preference for next week (FR-09)', async () => {
  await go(page, '/teacher/preferences');
  await page.getByRole('radio', { name: /Week of Mon 30 Nov/ }).click();
  await expectText(page, 'No Job Preference recorded for this week yet');
  await page.getByRole('button', { name: 'Save Job Preference' }).click();
  await expectText(page, 'Select both a start and an end time.');
  await page.getByLabel('From').first().selectOption({ label: '10:00 AM' });
  await page.getByLabel('To').first().selectOption({ label: '4:00 PM' });
  await page.getByRole('button', { name: 'Add preferred time' }).click();
  await page.getByLabel('Day').nth(1).selectOption({ label: 'Wed 2 Dec' });
  await page.getByLabel('From').nth(1).selectOption({ label: '10:00 AM' });
  await page.getByLabel('To').nth(1).selectOption({ label: '1:00 PM' });
  await page.getByLabel('Requested teaching hours for this week').fill('14');
  await page.getByRole('button', { name: 'Save Job Preference' }).click();
  await expectText(page, 'Requested teaching hours');
  await expectText(page, '14.0 h');
  await page.getByRole('button', { name: 'Edit Job Preference' }).click();
  await page.getByLabel('Requested teaching hours for this week').fill('16.5');
  await page.getByRole('button', { name: 'Save Job Preference' }).click();
  await expectText(page, '16.5 h');
  await shot(page, 'desktop-06-job-preferences');
});

let rejectedJobId = null;
await step('UC04 reject a Job: warning, cancel keeps it, confirm makes it Unallocated (FR-28-30)', async () => {
  await go(page, '/teacher/jobs');
  const first = page.locator('.job-row-btn').first();
  rejectedJobId = (await first.locator('.job-id').textContent()).trim();
  await first.click();
  await page.getByRole('button', { name: 'Reject Job' }).click();
  await expectText(page, 'Please discuss this Job with your Manager before confirming the rejection.');
  await shot(page, 'desktop-07-reject-warning', false);
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expectText(page, 'Rejection cancelled');
  await page.locator('.job-row-btn', { hasText: rejectedJobId }).waitFor();
  await page.getByRole('button', { name: 'Reject Job' }).click();
  await page.getByRole('button', { name: 'Confirm rejection' }).click();
  await expectText(page, 'This Job is now');
  await page.locator('.sticky-card').getByText('Unallocated', { exact: true }).first().waitFor();
  if (await page.locator('.job-row-btn', { hasText: rejectedJobId }).count()) throw new Error('rejected Job still listed');
  await shot(page, 'desktop-08-reject-done');
  await logout(page);
});

await step('UC05 Manager dashboard: Workload, lowest three, above-threshold (FR-01-03)', async () => {
  await login(page, 'grace.ho', 'manager123');
  await expectText(page, 'Staff Workload');
  await expectText(page, 'Lowest allocated Workload');
  const above = await page.getByText('Above 40 hours', { exact: true }).count();
  if (above < 2) throw new Error(`expected >=2 'Above 40 hours' labels, got ${above}`);
  await noOverflow(page, 'manager dashboard');
  await shot(page, 'desktop-09-manager-dashboard');
});

await step('FR-04 Manager views Teacher Availability (late label visible)', async () => {
  await go(page, '/manager/availability?teacher=T08');
  await page.getByLabel('Date').fill('2026-12-02');
  await expectText(page, 'Isaac Koh – week of');
  await page.locator('.week-avail').getByText('Late').first().waitFor();
  await shot(page, 'desktop-10-manager-availability');
});

await step('UC06 update a Teacher Profile (FR-11)', async () => {
  await go(page, '/manager/profiles?teacher=T06');
  await page.getByRole('button', { name: 'Edit Profile' }).click();
  await page.getByLabel('Years of teaching experience').fill('');
  await page.getByRole('button', { name: 'Save Profile' }).click();
  await expectText(page, 'Enter the years of teaching experience.');
  await page.getByLabel('Years of teaching experience').fill('4');
  await page.getByLabel('Add an area of expertise').fill('Orchestral audition coaching');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Save Profile' }).click();
  await expectText(page, 'Profile updated for Gabriel Lim');
  await expectText(page, 'Orchestral audition coaching');
  await shot(page, 'desktop-11-teacher-profile');
});

const alloc = async (p, { date, start, instrument, studio, teacher }) => {
  const form = p.locator('form', { hasText: 'Validate and allocate Job' });
  await form.getByLabel('Date').selectOption(date);
  await form.getByLabel('Start time').selectOption({ label: start });
  await form.getByLabel('Instrument').selectOption(instrument);
  await form.getByLabel('Studio').selectOption({ label: studio });
  await form.getByLabel('Teacher').selectOption(teacher);
  await form.getByRole('button', { name: 'Validate and allocate Job' }).click();
  await p.waitForTimeout(120);
};

await step('UC07 compare up to three Teachers; fourth is refused (FR-13-18)', async () => {
  await go(page, '/manager/allocation');
  for (const n of ['Isaac Koh', 'Gabriel Lim', 'Hui Min Chua']) await page.getByRole('button', { name: new RegExp(`^${n}`) }).click();
  await page.getByRole('button', { name: /^Alice Tan/ }).click();
  await expectText(page, 'You can compare up to 3 Teachers');
  const cards = await page.locator('.compare-card').count();
  if (cards !== 3) throw new Error(`expected 3 comparison cards, got ${cards}`);
  for (const t of ['Workload (selected week)', 'Availability (selected week)', 'Job Preference (selected week)', 'Location on', 'Profile']) await expectText(page, t);
  await page.getByLabel('Location on date').selectOption('2026-11-24');
  await page.locator('.compare-card', { hasText: 'Isaac Koh' }).getByText('Studio 1').waitFor();
  await shot(page, 'desktop-12-comparison');
});

const scenarios = [
  ['FR-26', { date: '2026-11-25', start: '6:00 PM', instrument: 'Violin', studio: 'Studio 3', teacher: 'T08' }, 'is not qualified to teach Violin'],
  ['FR-24', { date: '2026-11-24', start: '3:00 PM', instrument: 'Drums', studio: 'Studio 3', teacher: 'T04' }, 'Drum Jobs must be held in the Studio with a drum kit'],
  ['FR-21', { date: '2026-11-26', start: '6:00 PM', instrument: 'Guitar', studio: 'Studio 3', teacher: 'T08' }, 'is a public holiday'],
  ['FR-20', { date: '2026-11-24', start: '8:30 AM', instrument: 'Guitar', studio: 'Studio 2', teacher: 'T04' }, 'starts before opening'],
  ['FR-19', { date: '2026-11-28', start: '10:00 AM', instrument: 'Guitar', studio: 'Studio 4', teacher: 'T08' }, 'has no Availability on'],
  ['FR-22', { date: '2026-11-24', start: '7:00 PM', instrument: 'Guitar', studio: 'Studio 1', teacher: 'T08' }, 'already has Job'],
  ['FR-23', { date: '2026-11-25', start: '6:00 PM', instrument: 'Guitar', studio: 'Studio 2', teacher: 'T08' }, 'is already in use by Job'],
  ['FR-25', { date: '2026-11-23', start: '1:00 PM', instrument: 'Violin', studio: 'Studio 4', teacher: 'T03' }, 'continuous teaching block'],
];
for (const [fr, input, text] of scenarios) {
  await step(`UC07 rejected allocation shows exact rule ${fr} (FR-27)`, async () => {
    await alloc(page, input);
    await expectText(page, 'Allocation rejected — 1 rule broken');
    await page.locator('.fail-list').getByText(fr).waitFor();
    await page.locator('.fail-list').getByText(text).waitFor();
    if (fr === 'FR-25') await shot(page, 'desktop-13-allocation-rejected');
  });
}

await step('UC07 successful allocation updates schedule and Workload (FR-12)', async () => {
  const before = await page.getByRole('button', { name: /^Isaac Koh/ }).textContent();
  await alloc(page, { date: '2026-11-25', start: '6:00 PM', instrument: 'Guitar', studio: 'Studio 3', teacher: 'T08' });
  await expectText(page, 'allocated');
  await page.locator('.alert-success', { hasText: 'Isaac Koh' }).waitFor();
  await page.getByText('Just allocated').first().waitFor();
  const after = await page.getByRole('button', { name: /^Isaac Koh/ }).textContent();
  if (before === after) throw new Error(`Workload chip did not change (${before})`);
  await shot(page, 'desktop-14-allocation-success');
});

await step('Same allocation again is now rejected for Teacher overlap (FR-22)', async () => {
  await alloc(page, { date: '2026-11-25', start: '6:00 PM', instrument: 'Guitar', studio: 'Studio 3', teacher: 'T08' });
  await page.locator('.fail-list').getByText('FR-22').waitFor();
});

await step('Rejected Job appears as Unallocated to the Manager and can be loaded', async () => {
  const form = page.locator('form', { hasText: 'Validate and allocate Job' });
  const opts = await form.getByLabel('Job').locator('option').allTextContents();
  if (!opts.some((o) => o.startsWith(rejectedJobId))) throw new Error(`${rejectedJobId} not offered as Unallocated`);
  await form.getByLabel('Job').selectOption({ label: opts.find((o) => o.startsWith(rejectedJobId)) });
});

await step('Manager cannot open IT Administrator pages (NFR-09)', async () => {
  await go(page, '/admin/accounts');
  await expectText(page, 'Access denied');
  await logout(page);
});

await step('FR-31 IT Administrator creates accounts; validation and role options', async () => {
  await login(page, 'it.admin', 'admin123');
  await expectText(page, 'Create account');
  const roleOptions = await page.locator('input[name="role"]').count();
  if (roleOptions !== 2) throw new Error('role options should be Teacher and Manager only');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expectText(page, 'Enter the full name.');
  await page.getByLabel('Full name').fill('Nora Tan');
  await page.getByLabel('Username').fill('alice.tan');
  await page.getByLabel('Email').fill('nora.tan@sonara.example');
  await page.getByLabel('Teacher', { exact: false }).first().check();
  await page.getByLabel('Temporary password').fill('welcome123');
  await page.getByLabel('Confirm password').fill('welcome123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expectText(page, 'is already in use');
  await page.getByLabel('Username').fill('nora.tan');
  await page.getByLabel('Temporary password').fill('welcome123');
  await page.getByLabel('Confirm password').fill('welcome123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expectText(page, 'Account created');
  await shot(page, 'desktop-15-account-created');
  await logout(page);
});

await step('Newly created Teacher account can sign in', async () => {
  await login(page, 'nora.tan', 'welcome123');
  await expectText(page, 'Welcome, Nora');
  await expectText(page, 'No Jobs allocated this week');
});

await step('Simulated 30-minute inactivity ends the session (NFR-12)', async () => {
  await page.getByRole('button', { name: /Demo tools/ }).click();
  await page.getByRole('menuitem', { name: /Simulate 30-minute inactivity/ }).click();
  await expectText(page, 'session ended after 30 minutes of inactivity');
});

await step('Reset demo data restores initial state', async () => {
  await page.getByRole('button', { name: /Demo tools/ }).click();
  await page.getByRole('menuitem', { name: /Reset demo data/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset demo data' }).click();
  await expectText(page, 'Demo data reset');
  if (await page.getByText('nora.tan /').count()) throw new Error('created account still present after reset');
  await login(page, 'daniel.wong', 'teacher123'); // lockout cleared by reset
  await expectText(page, 'Welcome, Daniel');
  await logout(page);
});
await page.context().close();

// ---------------- Responsive checks ----------------
const PAGES = {
  'alice.tan': ['/teacher', '/teacher/jobs', '/teacher/availability', '/teacher/preferences'],
  'grace.ho': ['/manager', '/manager/availability', '/manager/profiles', '/manager/allocation'],
  'it.admin': ['/admin/accounts'],
};
const PASS = { 'alice.tan': 'teacher123', 'grace.ho': 'manager123', 'it.admin': 'admin123' };
for (const vp of ['tablet', 'mobile']) {
  const p = await newPage(vp);
  await step(`${vp}: login page has no horizontal overflow`, async () => {
    await noOverflow(p, 'login');
    await shot(p, `${vp}-01-login`, false);
  });
  for (const [user, paths] of Object.entries(PAGES)) {
    await login(p, user, PASS[user]);
    await p.waitForTimeout(150);
    for (const path of paths) {
      await step(`${vp}: ${path} has no horizontal overflow`, async () => {
        await go(p, path);
        if (path === '/manager/allocation') {
          for (const n of ['Isaac Koh', 'Gabriel Lim', 'Hui Min Chua']) await p.getByRole('button', { name: new RegExp(`^${n}`) }).click();
          await alloc(p, { date: '2026-11-23', start: '1:00 PM', instrument: 'Violin', studio: 'Studio 4', teacher: 'T03' });
        }
        if (path === '/teacher/jobs') {
          await p.locator('.job-row-btn').first().click();
        }
        await noOverflow(p, path);
        const name = path.replace(/\//g, '-').replace(/^-/, '');
        await shot(p, `${vp}-${name}`);
      });
    }
    if (vp === 'mobile' && user === 'grace.ho') {
      await step('mobile: navigation drawer opens and links work', async () => {
        await p.getByRole('button', { name: 'Open menu' }).click();
        await p.locator('.drawer.open').getByRole('link', { name: 'Teacher Profiles' }).waitFor();
        await shot(p, 'mobile-nav-drawer', false);
        await p.locator('.drawer.open').getByRole('link', { name: 'Teacher Profiles' }).click();
        await expectText(p, 'Select a Teacher to view');
      });
    }
    if (vp === 'mobile' && user === 'alice.tan') {
      await step('mobile: rejection dialog fits the viewport', async () => {
        await go(p, '/teacher/jobs');
        await p.locator('.job-row-btn').first().click();
        await p.getByRole('button', { name: 'Reject Job' }).click();
        const box = await p.getByRole('dialog').boundingBox();
        if (box.x < 0 || box.y < 0 || box.x + box.width > 390 || box.y + box.height > 844) throw new Error(`dialog outside viewport ${JSON.stringify(box)}`);
        await shot(p, 'mobile-reject-dialog', false);
        await p.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
      });
    }
    await logout(p);
  }
  await p.context().close();
}

await browser.close();
await new Promise((r) => server.httpServer.close(r));

for (const r of results) console.log(r.join(' | '));
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} checks passed.`);
if (consoleErrors.length) console.log(`Console errors (${consoleErrors.length}):\n` + [...new Set(consoleErrors)].slice(0, 10).join('\n'));
process.exit(failed ? 1 : 0);
