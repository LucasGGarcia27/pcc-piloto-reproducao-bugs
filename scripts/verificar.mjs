import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { ROOT, readJSON, writeJSON, sha256, startServer, launchBrowser, newTrial, observe, act, state } from './lib.mjs';
import { evaluateHistory } from './oraculo.mjs';

const checks = [];
const source = await readJSON('evidencias/fontes/source-integrity.json');
for (const file of source) assert.equal(sha256(await fs.readFile(path.join(ROOT, 'aplicacao/todomvc', file.path))), file.sha256);
checks.push({ name: 'upstream_source_unchanged', passed: true, count: source.length });
const originals = JSON.parse((await fs.readFile(path.join(ROOT, 'evidencias/ambiente/originais-sha256.json'), 'utf8')).replace(/^\uFEFF/, ''));
for (const file of originals) assert.equal(sha256(await fs.readFile(file.Path)).toUpperCase(), file.Hash);
checks.push({ name: 'original_context_documents_unchanged', passed: true, count: originals.length });
const protocol = await readJSON('configuracao-experimento/protocolo.json');
const base = await readJSON('configuracao-experimento/relato-basico.json');
const files = { A: 'interacoes', B: 'comunicacao', C: 'eventos' };
for (const [id, allowed] of Object.entries(protocol.configurations)) {
  const packet = await readJSON(`configuracao-experimento/pacotes/${id}.json`);
  assert.deepEqual(packet.report, base); assert.deepEqual(Object.keys(packet.categories), allowed);
  for (const key of allowed) {
    const source = await readJSON(`dados/${files[key]}.json`);
    assert.deepEqual(packet.categories[key], { category: key, records: source.records });
  }
}
checks.push({ name: 'eight_packets_exact_allowlists_and_identical_report', passed: true });
const reference = await readJSON('evidencias/referencia/resultado.json');
assert.equal(reference.bug_reproduced, true);
assert.equal(reference.states.after_escape.editing_count, 1);
assert.deepEqual(reference.states.after_blur.labels, ['changed']);
const initialEdit = { labels: ['old'], editing_count: 1, editing_indices: [0], edit_values: ['new'] };
const finished = { labels: ['new'], editing_count: 0, editing_indices: [], edit_values: [] };
const positive = [{ step: 1, action: { type: 'press', value: 'Escape' }, before: initialEdit, after: initialEdit }, { step: 2, action: { type: 'click' }, before: initialEdit, after: finished }];
assert.equal(evaluateHistory(positive).bug_reproduced, true);
assert.equal(evaluateHistory([{ step: 1, action: { type: 'press', value: 'Enter' }, before: initialEdit, after: finished }]).bug_reproduced, false);
assert.equal(evaluateHistory(positive.slice(0, 1)).bug_reproduced, false);
assert.equal(evaluateHistory([{ ...positive[0], after: { ...finished, labels: ['old'] } }, positive[1]]).bug_reproduced, false);
assert.equal(evaluateHistory([]).bug_reproduced, false);
checks.push({ name: 'oracle_positive_and_negative_controls', passed: true, note: 'Controles unitários do avaliador; não são tentativas LLM.' });
const server = await startServer(); let browser;
try {
  browser = await launchBrowser();
  const trial = await newTrial(browser, server.origin); await trial.page.goto(server.origin); await trial.page.locator('.new-todo').waitFor();
  const ui = await observe(trial.page);
  for (const action of [ {type:'evaluate',value:'localStorage'}, {type:'fill',target:'.new-todo',value:'x'}, {type:'press',target:ui.public.elements.find(e=>e.tag==='input').id,value:'F12'} ]) await assert.rejects(act(trial.page, ui, action));
  const external = ui.public.elements.find(e => e.tag === 'a');
  if (external) await assert.rejects(act(trial.page, ui, {type:'click',target:external.id}));
  const response = await fetch(server.origin + '/../../dados/interacoes.json'); assert.equal(response.status, 404);
  assert.equal((await fetch(server.origin + '/app.bundle.js.map')).status, 404);
  assert.deepEqual((await state(trial.page)).labels, []);
  await trial.context.close();
  checks.push({ name: 'real_browser_broker_blocks_eval_selectors_devtools_external_links_and_server_files', passed: true });
} finally { if (browser) await browser.close(); await server.close(); }
await writeJSON('evidencias/ambiente/verificacao.json', { timestamp: new Date().toISOString(), checks });
console.log(`${checks.length} verificações aprovadas.`);
