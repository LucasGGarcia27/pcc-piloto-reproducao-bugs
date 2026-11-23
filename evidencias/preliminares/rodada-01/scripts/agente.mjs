import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { ROOT, readJSON, writeJSON, sha256, startServer, launchBrowser, newTrial, capture, state, screenshot, observe, act } from './lib.mjs';
import { decide } from './decisor.mjs';
import { evaluateHistory } from './oraculo.mjs';

const protocol = await readJSON('configuracao-experimento/protocolo.json');
assert(protocol.llm.model, 'Fixe o modelo no protocolo antes de executar.');
const instructions = await fs.readFile(path.join(ROOT, 'configuracao-experimento/instrucoes-agente.txt'), 'utf8');
const results = [];
const selection = process.argv.find(arg => /^--config=C[0-7]$/.test(arg))?.split('=')[1];
const server = await startServer();
let browser;
try {
  browser = await launchBrowser();
  for (const id of selection ? [selection] : protocol.execution_order) {
    const directory = path.join(ROOT, 'evidencias/configuracoes', id);
    // Never overwrite an existing scientific attempt silently.
    try { await fs.access(path.join(directory, 'resultado.json')); console.log(`${id}: resultado existente, preservado`); continue; } catch {}
    await fs.mkdir(directory, { recursive: true });
    const packet = await readJSON(`configuracao-experimento/pacotes/${id}.json`);
    assert.deepEqual(Object.keys(packet.categories), protocol.configurations[id]);
    const { context, page } = await newTrial(browser, server.origin);
    const monitor = capture(page), records = [], history = [], decisions = [], usage = { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0 };
    let stopReason = 'action_limit', infrastructureError = null, executed = false, modelCalls = 0;
    const started = new Date().toISOString(), start = performance.now();
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
    try {
      await page.goto(server.origin); await page.locator('.new-todo').waitFor();
      const initial = await state(page); assert.deepEqual(initial.labels, []); assert.deepEqual(initial.storage, {});
      await writeJSON(`evidencias/configuracoes/${id}/initial-state.json`, initial);
      await screenshot(page, `evidencias/configuracoes/${id}/00-inicial.png`);
      for (let step = 1; step <= protocol.max_actions; step++) {
        const remaining = protocol.max_duration_seconds * 1000 - (performance.now() - start);
        if (remaining <= 0) { stopReason = 'time_limit'; break; }
        const ui = await observe(page);
        // Critically, no oracle, researcher state, source paths, issue URL or other packet is included here.
        const payload = { packet, history, visible_interface: ui.public, remaining_actions: protocol.max_actions - step + 1 };
        const prompt = instructions + '\n\n' + JSON.stringify(payload);
        if (prompt.length > protocol.token_budget.hard_input_limit_characters_per_decision) { stopReason = 'input_limit'; break; }
        const stepDir = path.join(directory, `decision-${String(step).padStart(2, '0')}`);
        const result = await decide(prompt, stepDir, { model: protocol.llm.model, timeout: Math.min(remaining, protocol.max_decision_seconds * 1000) });
        modelCalls++; executed = true;
        decisions.push({ step, thread_id: result.thread_id, usage: result.usage, native_tool_calls: result.native_tool_calls });
        for (const key of Object.keys(usage)) usage[key] += result.usage?.[key] || 0;
        const action = result.decision;
        if (action.type === 'finish') { history.push({ step, action }); stopReason = 'agent_finished'; break; }
        const before = await state(page);
        let error = null;
        try { await act(page, ui, action); } catch (err) { error = err.message; }
        const after = await state(page);
        const record = { step, action, before, after, error };
        records.push(record);
        // The agent sees only the next rendered interface and a sanitized action result.
        history.push({ step, action, result: error ? 'Ação não executada: operação ou alvo inválido/inacessível.' : 'Ação executada.' });
        await writeJSON(`evidencias/configuracoes/${id}/acoes.json`, records);
        await screenshot(page, `evidencias/configuracoes/${id}/${String(step).padStart(2, '0')}.png`);
        console.log(`${id} passo ${step}: ${action.type}; erro=${!!error}`);
        for (const handle of ui.targets.values()) await handle.dispose();
        if (usage.output_tokens >= protocol.token_budget.soft_cumulative_output_limit) { stopReason = 'output_token_limit'; break; }
      }
    } catch (error) { infrastructureError = error.message; stopReason = 'infrastructure_error'; }
    const durationMs = Math.round(performance.now() - start);
    const oracle = evaluateHistory(records);
    const captureData = await monitor.finish();
    await writeJSON(`evidencias/configuracoes/${id}/captura-privada.json`, captureData);
    await writeJSON(`evidencias/configuracoes/${id}/decisoes.json`, decisions);
    await writeJSON(`evidencias/configuracoes/${id}/oraculo.json`, oracle);
    await screenshot(page, `evidencias/configuracoes/${id}/final.png`);
    await context.tracing.stop({ path: path.join(directory, 'trace.zip') });
    await context.close();
    const result = { configuration: id, executed, valid: infrastructureError === null, bug_reproduced: executed && !infrastructureError ? oracle.bug_reproduced : null, actions: records.length, successful_actions: records.filter(x => !x.error).length, duration_ms: durationMs, model_calls: modelCalls, usage, model: protocol.llm.model, browser: browser.version(), started, stop_reason: stopReason, infrastructure_error: infrastructureError, cost: { api_charges_incurred: false, billed_currency_amount: null, note: 'Autenticação ChatGPT existente; consumo de franquia, sem tarifa monetária observável.' }, package_sha256: sha256(JSON.stringify(packet)), evidence: `evidencias/configuracoes/${id}/resultado.json` };
    await writeJSON(result.evidence, result); results.push(result);
    console.log(JSON.stringify(result));
    if (infrastructureError) { console.log('Execução interrompida para investigar infraestrutura; demais configurações permanecem pendentes.'); break; }
  }
} finally { if (browser) await browser.close(); await server.close(); }
await writeJSON('evidencias/configuracoes/ultima-execucao.json', { results });
