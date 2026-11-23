import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ROOT, writeJSON } from './lib.mjs';

// Authentication stays in the CLI credential store. No token is copied or printed.
const disabled = ['shell_tool', 'shell_snapshot', 'view_image', 'apps', 'plugins', 'multi_agent', 'multi_agent_v2', 'browser_use', 'browser_use_external', 'browser_use_full_cdp_access', 'computer_use', 'in_app_browser', 'image_generation', 'goals', 'sleep_tool', 'memories', 'hooks', 'skill_search', 'code_mode', 'code_mode_host'];
export async function decide(prompt, outputDirectory, { model, timeout = 90000 } = {}) {
  await fs.mkdir(outputDirectory, { recursive: true });
  const cwd = path.join(ROOT, '.cache/agent-empty-workspace');
  await fs.mkdir(cwd, { recursive: true });
  const args = ['exec', '--ignore-user-config', '--skip-git-repo-check', '--ephemeral', '--sandbox', 'read-only', '--json', '--color', 'never', '--output-schema', path.join(ROOT, 'configuracao-experimento/acao.schema.json'), '--output-last-message', path.join(outputDirectory, 'decision.json'), '-C', cwd];
  if (model) args.push('--model', model);
  for (const name of disabled) args.push('--disable', name);
  for (const setting of ['features.skip_host_skill_discovery=true', 'web_search="disabled"', 'project_doc_max_bytes=0', 'model_reasoning_effort="low"', 'mcp_servers={}', 'approval_policy="never"', `model_instructions_file=${JSON.stringify(path.join(ROOT, 'configuracao-experimento/instrucoes-agente.txt'))}`, `log_dir=${JSON.stringify(path.join(ROOT, '.cache/codex-logs'))}`, `sqlite_home=${JSON.stringify(path.join(ROOT, '.cache/codex-state'))}`]) args.push('-c', setting);
  args.push('-');
  await fs.writeFile(path.join(outputDirectory, 'prompt.txt'), prompt, 'utf8');
  await writeJSON(path.relative(ROOT, path.join(outputDirectory, 'invocation.json')), { executable: process.env.PCC_CODEX || 'codex', arguments: args, disabled_features: disabled, cwd });
  const child = spawn(process.env.PCC_CODEX || 'codex', args, { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', stderr = '', killed = false;
  child.stdout.on('data', data => { stdout += data; });
  child.stderr.on('data', data => { stderr += data; });
  child.stdin.end(prompt);
  const timer = setTimeout(() => { killed = true; child.kill(); }, timeout);
  let code;
  try { code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); }); }
  finally { clearTimeout(timer); }
  await fs.writeFile(path.join(outputDirectory, 'events.jsonl'), stdout, 'utf8');
  await fs.writeFile(path.join(outputDirectory, 'stderr.txt'), stderr, 'utf8');
  const events = stdout.split(/\r?\n/).filter(Boolean).map(line => { try { return JSON.parse(line); } catch { return { type: 'unparsed', text: line }; } });
  const items = events.filter(e => e.item).map(e => e.item);
  // No native CLI tool may be used. Each permitted browser action is executed by our broker only.
  const unexpected = items.filter(item => !['agent_message', 'reasoning', 'plan', 'error'].includes(item.type));
  if (unexpected.length) throw new Error('Tentativa invalidada: uso de ferramenta nativa do CLI: ' + unexpected.map(x => x.type).join(','));
  if (code !== 0 || killed) throw new Error(`Decisor indisponível: exit=${code}; timeout=${killed}; consulte ${outputDirectory}`);
  const decision = JSON.parse(await fs.readFile(path.join(outputDirectory, 'decision.json'), 'utf8'));
  const usage = events.find(e => e.type === 'turn.completed')?.usage ?? null;
  return { decision, usage, thread_id: events.find(e => e.type === 'thread.started')?.thread_id, native_tool_calls: 0, events };
}

if (process.argv.includes('--smoke')) {
  const result = await decide('Teste de infraestrutura sem aplicação e sem bug. Responda com type finish, target vazio, value vazio e reason conexão verificada. Não use ferramentas.', path.join(ROOT, 'evidencias/ambiente/llm-smoke'), { model: process.env.PCC_MODEL });
  await writeJSON('evidencias/ambiente/llm-smoke/resultado.json', { decision: result.decision, usage: result.usage, native_tool_calls: result.native_tool_calls, thread_id: result.thread_id });
  console.log(JSON.stringify({ ok: true, decision: result.decision, usage: result.usage }));
}
