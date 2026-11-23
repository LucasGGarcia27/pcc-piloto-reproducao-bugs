import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export async function writeJSON(file, data) {
  const target = path.resolve(ROOT, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
export async function readJSON(file) { return JSON.parse(await fs.readFile(path.resolve(ROOT, file), 'utf8')); }
export async function startServer() {
  const dist = path.join(ROOT, 'aplicacao/todomvc/examples/react/dist');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  const allowed = new Set(['index.html', 'app.bundle.js', 'base.js', 'app.css']);
  const server = http.createServer(async (req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (req.method !== 'GET' || !allowed.has(name)) { res.writeHead(404); res.end(); return; }
    const bytes = await fs.readFile(path.join(dist, name));
    res.writeHead(200, { 'Content-Type': types[path.extname(name)] + '; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(bytes);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(4173, '127.0.0.1', resolve); });
  return { origin: 'http://127.0.0.1:4173', close: () => new Promise(resolve => server.close(resolve)) };
}
export async function launchBrowser() {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(ROOT, '.cache/browsers');
  const temp = path.join(ROOT, '.cache/tmp');
  await fs.mkdir(temp, { recursive: true });
  process.env.TEMP = temp; process.env.TMP = temp;
  const { chromium } = await import('playwright');
  return chromium.launch({ headless: true });
}
export async function newTrial(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'));
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  return { context, page };
}
export function capture(page) {
  const start = performance.now(), network = [], events = [], pending = [], requests = new Map();
  const ms = () => Math.round(performance.now() - start);
  page.on('request', request => {
    const record = { order: network.length + 1, t_ms: ms(), method: request.method(), endpoint: new URL(request.url()).pathname, resource_type: request.resourceType(), parameters: Object.fromEntries(new URL(request.url()).searchParams), status: null };
    // No cookies, auth headers or JavaScript/HTML response bodies enter category B.
    network.push(record); requests.set(request, record);
  });
  page.on('response', response => {
    const record = requests.get(response.request());
    if (record) {
      record.status = response.status(); record.response_t_ms = ms();
      if (['xhr', 'fetch'].includes(record.resource_type) && response.headers()['content-type']?.includes('application/json')) {
        pending.push(response.json().then(body => { record.response_json = body; }).catch(error => { record.body_error = error.message; }));
      }
    }
  });
  page.on('requestfailed', request => { const record = requests.get(request); if (record) record.failure = request.failure()?.errorText; });
  page.on('console', message => events.push({ order: events.length + 1, t_ms: ms(), type: 'console', level: message.type(), message: message.text(), location: message.location() }));
  page.on('pageerror', error => events.push({ order: events.length + 1, t_ms: ms(), type: 'javascript_exception', message: error.message, stack: error.stack }));
  for (const name of ['domcontentloaded', 'load']) page.on(name, () => events.push({ order: events.length + 1, t_ms: ms(), type: 'lifecycle', name }));
  return { network, events, finish: async () => { await Promise.all(pending); return { network, events, duration_ms: ms() }; } };
}
export async function state(page) {
  return page.evaluate(() => ({
    labels: [...document.querySelectorAll('.todo-list li label')].map(e => e.textContent),
    editing_count: document.querySelectorAll('.todo-list li.editing').length,
    editing_indices: [...document.querySelectorAll('.todo-list li')].flatMap((e, i) => e.classList.contains('editing') ? [i] : []),
    edit_values: [...document.querySelectorAll('input.edit')].map(e => e.value),
    visible_text: document.body.innerText,
    storage: { ...localStorage }
  }));
}
export async function screenshot(page, relative) { await page.screenshot({ path: path.join(ROOT, relative), fullPage: true }); }

// IDs map only to currently rendered controls. No selector or JavaScript is accepted from the LLM.
export async function observe(page) {
  const handles = await page.locator('input,button,a,label').elementHandles();
  const elements = [], targets = new Map();
  for (const handle of handles) {
    if (!(await handle.isVisible())) { await handle.dispose(); continue; }
    const info = await handle.evaluate(e => ({ tag: e.tagName.toLowerCase(), type: e.getAttribute('type') || '', name: e.getAttribute('aria-label') || e.innerText || e.getAttribute('placeholder') || '', value: 'value' in e ? e.value : '', checked: 'checked' in e ? e.checked : null }));
    const id = String(elements.length + 1); targets.set(id, handle); elements.push({ id, ...info });
  }
  return { public: { text: await page.locator('body').innerText(), elements }, targets };
}
export async function act(page, observation, action) {
  const allowed = new Set(['click', 'dblclick', 'fill', 'press', 'reload', 'finish']);
  if (!allowed.has(action.type)) throw new Error('Ação não permitida');
  if (action.type === 'finish') return;
  if (action.type === 'reload') { await page.reload(); return; }
  const target = observation.targets.get(String(action.target));
  if (!target) throw new Error('Elemento inválido ou ausente da interface visível');
  if (action.type === 'press' && !['Enter', 'Escape', 'Tab', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Control+A'].includes(action.value)) throw new Error('Tecla não permitida');
  if (action.type === 'fill' && (typeof action.value !== 'string' || action.value.length > 200)) throw new Error('Valor inválido');
  if (action.type === 'click' || action.type === 'dblclick') {
    const href = await target.getAttribute('href');
    if (href && new URL(href, page.url()).origin !== new URL(page.url()).origin) throw new Error('Navegação externa não permitida');
    await target[action.type]();
  } else await target[action.type](action.value);
}
