import assert from 'node:assert/strict';
import { startServer, launchBrowser, newTrial, capture, state, screenshot, writeJSON } from './lib.mjs';

const server = await startServer();
let browser;
try {
  browser = await launchBrowser();
  const { context, page } = await newTrial(browser, server.origin);
  const monitor = capture(page), actions = [], states = {};
  const start = performance.now(), started = new Date().toISOString();
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  async function action(type, element, value, fn) {
    const record = { order: actions.length + 1, t_ms: Math.round(performance.now() - start), type, element, ...(value !== undefined ? { value } : {}) };
    await fn(); actions.push(record);
  }
  await action('navigate', 'application', '/', () => page.goto(server.origin));
  await page.locator('.new-todo').waitFor();
  states.initial = await state(page);
  assert.equal(states.initial.labels.length, 0);
  await screenshot(page, 'evidencias/capturas/01-inicial.png');
  await action('fill', 'What needs to be done?', 'buy milk', () => page.locator('.new-todo').fill('buy milk'));
  await action('press', 'What needs to be done?', 'Enter', () => page.locator('.new-todo').press('Enter'));
  states.created = await state(page); assert.deepEqual(states.created.labels, ['buy milk']);
  await screenshot(page, 'evidencias/capturas/02-criado.png');
  await action('dblclick', 'todo label: buy milk', undefined, () => page.locator('.todo-list label').dblclick());
  await action('fill', 'Edit todo', 'changed', () => page.locator('.edit').fill('changed'));
  await action('press', 'Edit todo', 'Escape', () => page.locator('.edit').press('Escape'));
  states.after_escape = await state(page);
  await screenshot(page, 'evidencias/capturas/03-apos-escape.png');
  await action('click', 'What needs to be done?', undefined, () => page.locator('.new-todo').click());
  states.after_blur = await state(page);
  await screenshot(page, 'evidencias/capturas/04-apos-blur.png');
  const bug = states.after_escape.editing_count === 1 && states.after_escape.edit_values[0] === 'changed' && states.after_blur.labels[0] === 'changed';
  assert.equal(bug, true, 'O comportamento documentado não foi observado');
  const recordings = await monitor.finish();
  await context.tracing.stop({ path: 'evidencias/referencia/trace.zip' });
  await writeJSON('evidencias/referencia/resultado.json', { kind: 'deterministic_reference_not_llm', started, browser: browser.version(), actions: actions.length, duration_ms: Math.round(performance.now() - start), bug_reproduced: bug, states, criteria: 'Após Escape, editor mantém changed; após blur, rótulo passa de buy milk a changed.' });
  await writeJSON('evidencias/referencia/rede-bruta.json', recordings.network);
  await writeJSON('evidencias/referencia/eventos-brutos.json', recordings.events);
  await writeJSON('dados/interacoes.json', { category: 'A', records: actions });
  await writeJSON('dados/comunicacao.json', { category: 'B', records: recordings.network, limitations: ['Esta versão mantém tarefas em memória React; nenhuma API funcional de tarefas.', 'Corpos de HTML/JS/CSS não são disponibilizados para evitar acesso ao código-fonte.', 'learn.json é recurso auxiliar ausente no dist oficial; seu 404 não é o bug.'] });
  const lifecycle = recordings.events.filter(e => e.type === 'lifecycle');
  const relevant = recordings.events.filter(e => e.type === 'javascript_exception' || (e.type === 'console' && !e.message.includes('Failed to load resource')));
  await writeJSON('dados/eventos.json', { category: 'C', records: [...lifecycle, ...relevant].sort((a,b) => a.order-b.order), limitations: ['Eventos de ciclo de vida são observações do navegador, sem instrumentação de funções da aplicação.', 'Erros de carregamento de recursos auxiliares são mantidos na evidência bruta, mas excluídos deste pacote.'] });
  // Separate fresh context proves reset does not rely on clearing only part of the state.
  await context.close();
  const reset = await newTrial(browser, server.origin);
  await reset.page.goto(server.origin); await reset.page.locator('.new-todo').waitFor();
  const resetState = await state(reset.page); assert.deepEqual(resetState.labels, []);
  await writeJSON('evidencias/referencia/reset.json', { strategy: 'new non-persistent browser context', verified: true, state: resetState });
  await reset.context.close();
  console.log(JSON.stringify({ bug_reproduced: bug, actions: actions.length, network_records: recordings.network.length, raw_events: recordings.events.length, package_C_records: lifecycle.length + relevant.length, browser: browser.version() }));
} finally { if (browser) await browser.close(); await server.close(); }
