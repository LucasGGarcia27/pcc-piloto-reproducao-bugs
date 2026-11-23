import { readJSON, writeJSON, sha256 } from './lib.mjs';
const protocol = await readJSON('configuracao-experimento/protocolo.json');
const report = await readJSON('configuracao-experimento/relato-basico.json');
const categories = { A: await readJSON('dados/interacoes.json'), B: await readJSON('dados/comunicacao.json'), C: await readJSON('dados/eventos.json') };
const manifest = {};
for (const [id, allowed] of Object.entries(protocol.configurations)) {
  // Notes about the researcher/environment are documentation, not experimental input.
  const packet = { report, categories: Object.fromEntries(allowed.map(key => [key, { category: key, records: categories[key].records }])) };
  await writeJSON(`configuracao-experimento/pacotes/${id}.json`, packet);
  manifest[id] = { allowed, sha256: sha256(JSON.stringify(packet)), report_sha256: sha256(JSON.stringify(report)) };
}
await writeJSON('evidencias/configuracoes/pacotes-manifesto.json', manifest);
console.log('Oito pacotes gerados; relato básico idêntico, categorias selecionadas por allowlist.');
