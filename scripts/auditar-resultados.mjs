import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { ROOT, readJSON, writeJSON, sha256 } from './lib.mjs';
import { evaluateHistory } from './oraculo.mjs';

const protocol = await readJSON('configuracao-experimento/protocolo.json');
const frozen = JSON.parse((await fs.readFile(path.join(ROOT, 'evidencias/configuracoes/protocolo-antes-tentativas-sha256.json'), 'utf8')).replace(/^\uFEFF/, ''));
for (const file of frozen) assert.equal(sha256(await fs.readFile(path.join(ROOT, path.relative(ROOT, file.Path)))).toUpperCase(), file.Hash, `Protocolo alterado: ${file.Path}`);
const instructions = await fs.readFile(path.join(ROOT, 'configuracao-experimento/instrucoes-agente.txt'), 'utf8');
const threads = new Set(), rows = [], warnings = new Set();
let promptCount = 0, nativeCalls = 0;
for (const id of protocol.execution_order) {
  const result = await readJSON(`evidencias/configuracoes/${id}/resultado.json`);
  assert(result.executed && result.valid, `Tentativa não concluída: ${id}`);
  assert.equal(result.model, protocol.llm.model);
  const initial = await readJSON(`evidencias/configuracoes/${id}/initial-state.json`);
  assert.deepEqual(initial.labels, []); assert.deepEqual(initial.storage, {});
  const records = await readJSON(`evidencias/configuracoes/${id}/acoes.json`);
  assert.equal(records.length, result.actions);
  assert.deepEqual(evaluateHistory(records), await readJSON(`evidencias/configuracoes/${id}/oraculo.json`));
  assert.equal(evaluateHistory(records).bug_reproduced, result.bug_reproduced);
  const packet = await readJSON(`configuracao-experimento/pacotes/${id}.json`);
  assert.equal(sha256(JSON.stringify(packet)), result.package_sha256);
  const decisions = await readJSON(`evidencias/configuracoes/${id}/decisoes.json`);
  assert.equal(decisions.length, result.model_calls);
  const usage = { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0 };
  for (const decision of decisions) {
    const directory = path.join(ROOT, `evidencias/configuracoes/${id}/decision-${String(decision.step).padStart(2, '0')}`);
    const prompt = await fs.readFile(path.join(directory, 'prompt.txt'), 'utf8');
    assert(prompt.startsWith(instructions + '\n\n'));
    const payload = JSON.parse(prompt.slice(instructions.length + 2));
    assert.deepEqual(Object.keys(payload), ['packet', 'history', 'visible_interface', 'remaining_actions']);
    assert.deepEqual(payload.packet, packet);
    assert.deepEqual(Object.keys(payload.packet.categories), protocol.configurations[id]);
    assert.deepEqual(payload.history.map(x => x.step), Array.from({length: decision.step - 1}, (_, i) => i + 1));
    for (const h of payload.history) assert.deepEqual(h.action, records[h.step - 1].action);
    assert.deepEqual(Object.keys(payload.visible_interface), ['text', 'elements']);
    const events = (await fs.readFile(path.join(directory, 'events.jsonl'), 'utf8')).trim().split(/\r?\n/).map(JSON.parse);
    for (const event of events) {
      if (event.item?.type === 'error') warnings.add(event.item.message);
      if (event.item && !['agent_message', 'reasoning', 'plan', 'error'].includes(event.item.type)) nativeCalls++;
    }
    const thread = events.find(e => e.type === 'thread.started')?.thread_id;
    assert(thread && !threads.has(thread)); threads.add(thread);
    assert.equal(thread, decision.thread_id);
    const completion = events.find(e => e.type === 'turn.completed'); assert(completion);
    for (const key of Object.keys(usage)) usage[key] += completion.usage?.[key] || 0;
    const invocation = JSON.parse(await fs.readFile(path.join(directory, 'invocation.json'), 'utf8'));
    assert(invocation.arguments.includes('--ephemeral')); assert(invocation.arguments.includes('--ignore-user-config'));
    for (const feature of ['shell_tool', 'view_image', 'apps', 'plugins', 'browser_use', 'computer_use', 'multi_agent', 'memories']) assert(invocation.disabled_features.includes(feature));
    promptCount++;
  }
  assert.deepEqual(usage, result.usage);
  rows.push({ configuration: id, result, oracle: evaluateHistory(records) });
}
assert.equal(nativeCalls, 0);
await writeJSON('evidencias/configuracoes/auditoria.json', { timestamp: new Date().toISOString(), configurations: rows.length, prompt_count: promptCount, unique_cli_threads: threads.size, native_tool_calls: nativeCalls, frozen_protocol_files_unchanged: frozen.length, exact_packet_allowlists: true, histories_local_to_configuration: true, initial_states_empty: true, results_recomputed: true, cli_warnings: [...warnings], rows });
console.log(JSON.stringify({ audited: rows.length, prompts: promptCount, independent_threads: threads.size, native_tool_calls: nativeCalls }));
