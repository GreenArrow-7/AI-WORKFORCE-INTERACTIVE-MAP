/**
 * Definition-of-done walkthrough (§38, §43).
 *
 * Runs against a real build in a real browser rather than in jsdom: this app's
 * core is a pan-and-zoom SVG canvas whose behaviour depends on pointer capture,
 * hit testing and layout — none of which jsdom models. Every check below maps to
 * a line of the brief's definition of done.
 *
 *   npm run build && npm start &
 *   npm run test:browser
 *
 * Environment:
 *   BASE_URL          default http://localhost:3000
 *   CHROMIUM_PATH     explicit browser binary, if Playwright cannot find one
 *   SHOTS_DIR         where screenshots and the export fixture are written
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SHOTS = process.env.SHOTS_DIR ?? path.join(process.cwd(), '.playwright');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const consoleErrors = [];
const pageErrors = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => pageErrors.push(String(err)));

// ---------------------------------------------------------------- 1. overview
await page.goto(`${BASE}/map`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const brainVisible = await page.locator('[data-node-id="company-brain"]').isVisible();
check('Company Brain node renders', brainVisible);

const deptCount = await page.locator('[data-kind="department"]').count();
check('Seven departments render', deptCount === 7, `found ${deptCount}`);

const edgeCount = await page.locator('[data-edge-kind="hierarchy"]').count();
check('Every department connects to the brain', edgeCount >= 7, `${edgeCount} hierarchy edges`);
await page.screenshot({ path: `${SHOTS}/01-overview.png` });

// ---------------------------------------------------------------- 2. camera
const scene = page.locator('[data-graph-canvas] > g');
const before = await scene.getAttribute('transform');
await page.mouse.move(700, 450);
await page.mouse.wheel(0, -240);           // mouse-wheel zoom
await page.waitForTimeout(250);
const afterZoom = await scene.getAttribute('transform');
check('Mouse wheel zooms the camera', before !== afterZoom);

await page.mouse.move(700, 450);
await page.mouse.down();
await page.mouse.move(560, 380, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(200);
const afterPan = await scene.getAttribute('transform');
check('Drag pans the camera', afterPan !== afterZoom);

await page.getByRole('button', { name: 'Fit to screen' }).click();
await page.waitForTimeout(700);
check('Fit to screen control works', (await scene.getAttribute('transform')) !== afterPan);

// ---------------------------------------------------------------- 3. department
await page.locator('[data-node-id="dep-sales"] .graph-dept-core').click();
await page.waitForTimeout(900);
check('Clicking a department updates the URL', page.url().endsWith('/map/sales'), page.url());

const fnCount = await page.locator('[data-kind="function"]').count();
const agentCount = await page.locator('[data-kind="agent"]').count();
check('Department tree shows functions', fnCount === 3, `${fnCount} functions`);
check('Department tree shows agents', agentCount === 9, `${agentCount} agents`);

const depEdges = await page.locator('[data-edge-kind="dependency"]').count();
check('Dependency edges render inside a department', depEdges > 0, `${depEdges} dependency edges`);
await page.screenshot({ path: `${SHOTS}/02-department.png` });

// ------------------------------------------------------- 4. hover highlighting
await page.locator('[data-node-id="agt-outreach-writer"] .graph-agent-core').hover();
await page.waitForTimeout(350);
const highlighting = await page.locator('[data-graph-canvas]').getAttribute('data-highlighting');
const highlighted = await page.locator('[data-hl="on"]').count();
check('Hover highlights the dependency path', highlighting === 'true' && highlighted > 1, `${highlighted} highlighted`);
await page.screenshot({ path: `${SHOTS}/03-hover-path.png` });

// ---------------------------------------------------------------- 5. drawer
await page.locator('[data-node-id="agt-outreach-writer"] .graph-agent-core').click();
await page.waitForTimeout(600);
const drawer = page.getByRole('complementary', { name: /Outreach Writer details/ });
check('Clicking an agent opens the drawer', await drawer.isVisible());
check('Agent URL is linkable', page.url().endsWith('/map/sales/outreach-writer'), page.url());

for (const section of [
  'Summary', 'What it does', 'Business outcome', 'Replaces or reduces',
  'Inputs', 'Outputs', 'Tools', 'Human in the loop', 'Dependencies',
  'Deployment notes',
]) {
  const present = await drawer.getByRole('heading', { name: section, exact: true }).count();
  check(`Drawer section: ${section}`, present > 0);
}

const upstream = await drawer.getByRole('button', { name: /Account Research Agent/ }).count();
check('Drawer lists upstream dependencies', upstream > 0);

// skill file preview
await drawer.getByRole('button', { name: /First-Touch Writing/ }).first().click();
await page.waitForTimeout(300);
const md = await drawer.locator('pre code').count();
check('Skill file preview renders Markdown', md > 0, `${md} code blocks`);
await page.screenshot({ path: `${SHOTS}/04-drawer.png` });

// ---------------------------------------------------------------- 6. status
await drawer.getByRole('radio', { name: 'Live' }).click();
await page.waitForTimeout(400);
check('Status can be set to Live', await drawer.getByRole('radio', { name: 'Live' }).getAttribute('aria-checked') === 'true');

const progressLabel = await page.getByRole('button', { name: /Workforce progress/ }).getAttribute('aria-label');
check('Company progress reflects the change', /1 of 63/.test(progressLabel ?? ''), progressLabel ?? '');

// ---------------------------------------------------------------- 7. persistence
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const afterReload = await page.getByRole('button', { name: /Workforce progress/ }).getAttribute('aria-label');
check('Status survives a refresh', /1 of 63/.test(afterReload ?? ''), afterReload ?? '');
check('Deep link restores the agent drawer', await page.getByRole('complementary', { name: /Outreach Writer details/ }).isVisible());

// ---------------------------------------------------------------- 8. search
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.keyboard.press('Control+k');
await page.waitForTimeout(400);
check('Cmd/Ctrl+K opens search', await page.getByRole('combobox', { name: 'Search query' }).isVisible());

await page.getByRole('combobox', { name: 'Search query' }).fill('churn');
await page.waitForTimeout(400);
const resultCount = await page.getByRole('option').count();
check('Fuzzy search returns results', resultCount > 0, `${resultCount} results`);
await page.screenshot({ path: `${SHOTS}/05-search.png` });

await page.getByRole('option').first().click();
await page.waitForTimeout(900);
check('Search jumps to the agent', page.url().includes('/map/customer/churn-risk'), page.url());
check('Search result opens its drawer', await page.getByRole('complementary', { name: /Churn Risk Agent details/ }).isVisible());

// ---------------------------------------------------------------- 9. filters
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.getByRole('button', { name: /^Filters/ }).click();
await page.waitForTimeout(300);
await page.getByRole('checkbox', { name: 'Fully autonomous' }).click();
await page.waitForTimeout(500);
const filteredAgents = await page.locator('[data-kind="agent"]').count();
check('Filter reduces the visible agents', filteredAgents > 0 && filteredAgents < 9, `${filteredAgents} agents shown`);
await page.keyboard.press('Escape');

// ---------------------------------------------------------------- 10. export
await page.getByRole('button', { name: 'Clear all filters' }).first().click().catch(() => {});
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Workspace menu' }).click();
await page.waitForTimeout(300);
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: 'Export progress (JSON)' }).click(),
]);
const exportPath = path.join(SHOTS, 'export.json');
await download.saveAs(exportPath);
const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
check('Export produces a valid snapshot', exported.version === '1.0' && Object.keys(exported.agentStatuses).length >= 1,
  `${Object.keys(exported.agentStatuses).length} statuses`);

// ---------------------------------------------------------------- 11. import
// The menu closes itself after exporting, so reopen it for the next action.
await page.getByRole('button', { name: 'Workspace menu' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Reset progress' }).click();
await page.getByRole('button', { name: /Confirm/ }).click();
await page.waitForTimeout(500);
const afterReset = await page.getByRole('button', { name: /Workforce progress/ }).getAttribute('aria-label');
check('Reset clears progress', /0 of 63/.test(afterReset ?? ''), afterReset ?? '');

await page.getByRole('button', { name: 'Workspace menu' }).click();
await page.waitForTimeout(200);
await page.locator('input[type="file"]').setInputFiles(exportPath);
await page.waitForTimeout(700);
const afterImport = await page.getByRole('button', { name: /Workforce progress/ }).getAttribute('aria-label');
check('Import restores progress', /1 of 63/.test(afterImport ?? ''), afterImport ?? '');

// ---------------------------------------------------------------- 12. rollout
await page.goto(`${BASE}/rollout/sales`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const lanes = await page.getByRole('heading', { level: 2 }).allTextContents();
check('Rollout shows three autonomy lanes',
  ['HUMAN-LED', 'HUMAN-ASSISTED', 'FULLY AUTONOMOUS'].every((l) =>
    lanes.some((t) => t.toUpperCase().includes(l))), lanes.join(' | '));
await page.screenshot({ path: `${SHOTS}/06-rollout.png` });

const firstRow = page.getByRole('button', { expanded: false }).filter({ hasText: 'Wave' }).first();
await firstRow.click();
await page.waitForTimeout(300);
check('Rollout row discloses detail', await page.getByText('Manual → assisted → autonomous').first().isVisible());

// ------------------------------------------------------- 13. command centers
await page.goto(`${BASE}/command-centers`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const cards = await page.getByRole('listitem').count();
check('Six command center cards render', cards === 6, `${cards} cards`);
await page.screenshot({ path: `${SHOTS}/07-command-centers.png` });

await page.getByRole('button', { name: /Sales Pipeline/ }).click();
await page.waitForTimeout(600);
check('Command center opens a dashboard', page.url().endsWith('/command-centers/pipeline'), page.url());
const widgets = await page.locator('section[aria-labelledby^="widget-"]').count();
check('Dashboard renders its widgets', widgets >= 6, `${widgets} widgets`);

// interactive control
const pipelineBefore = await page.locator('section[aria-labelledby="widget-w-pipe-metrics"]').innerText();
await page.getByRole('radio', { name: 'Last 24 hours' }).click();
await page.waitForTimeout(400);
const pipelineAfter = await page.locator('section[aria-labelledby="widget-w-pipe-metrics"]').innerText();
check('Dashboard controls are interactive', pipelineBefore !== pipelineAfter);
await page.screenshot({ path: `${SHOTS}/08-dashboard.png` });

// ---------------------------------------------------------------- 14. theme
await page.getByRole('radio', { name: 'Light' }).click();
await page.waitForTimeout(400);
const theme = await page.locator('html').getAttribute('data-theme');
check('Light theme applies', theme === 'light', String(theme));
await page.screenshot({ path: `${SHOTS}/09-light.png` });
await page.getByRole('radio', { name: 'Dark' }).click();
await page.waitForTimeout(300);

// ---------------------------------------------------------------- 15. mobile
const mobile = await context.newPage();
mobile.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[mobile] ${m.text()}`); });
mobile.on('pageerror', (e) => pageErrors.push(`[mobile] ${e}`));
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto(`${BASE}/map`, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(700);
const mobileGraph = await mobile.locator('[data-graph-canvas]').count();
const mobileDepts = await mobile.getByRole('button', { name: /Sales/ }).count();
check('Mobile shows a list, not the radial graph', mobileGraph === 0 && mobileDepts > 0,
  `graph=${mobileGraph} deptButtons=${mobileDepts}`);
await mobile.screenshot({ path: `${SHOTS}/10-mobile-departments.png` });

await mobile.getByRole('button', { name: /Sales/ }).first().click();
await mobile.waitForTimeout(500);
check('Mobile drills into a department', mobile.url().endsWith('/map/sales'), mobile.url());
await mobile.getByRole('button', { name: /Lead Sourcing Agent/ }).first().click();
await mobile.waitForTimeout(600);
check('Mobile opens the agent as a sheet',
  await mobile.getByRole('complementary', { name: /Lead Sourcing Agent details/ }).isVisible());
await mobile.screenshot({ path: `${SHOTS}/11-mobile-agent.png` });

// ---------------------------------------------------------------- 16. errors
check('No uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
const realConsoleErrors = consoleErrors.filter((e) => !/favicon|404 \(Not Found\)/i.test(e));
check('No console errors', realConsoleErrors.length === 0, realConsoleErrors.slice(0, 3).join(' | '));

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.log('\nFAILURES:');
  for (const f of failed) console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ''}`);
  process.exit(1);
}
