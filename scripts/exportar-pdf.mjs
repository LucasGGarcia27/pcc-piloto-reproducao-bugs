import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, launchBrowser, writeJSON } from './lib.mjs';

const escape = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function inline(text) {
  return escape(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
function markdown(text) {
  const lines = text.split(/\r?\n/), output = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const heading = /^(#{1,4}) (.+)$/.exec(line);
    if (heading) { output.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); continue; }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) { if (!/^\|[\s:|\-]+\|$/.test(lines[i])) rows.push(lines[i].slice(1,-1).split('|').map(c=>c.trim())); i++; }
      i--; output.push('<table><thead><tr>'+rows[0].map(c=>`<th>${inline(c)}</th>`).join('')+'</tr></thead><tbody>'+rows.slice(1).map(row=>'<tr>'+row.map(c=>`<td>${inline(c)}</td>`).join('')+'</tr>').join('')+'</tbody></table>'); continue;
    }
    if (line.startsWith('- ')) {
      const items=[]; while (i<lines.length && lines[i].startsWith('- ')) items.push(`<li>${inline(lines[i++].slice(2))}</li>`); i--; output.push(`<ul>${items.join('')}</ul>`); continue;
    }
    const paragraph=[line]; while (i+1<lines.length && lines[i+1].trim() && !/^(#|\||- )/.test(lines[i+1])) paragraph.push(lines[++i]);
    output.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  return output.join('\n');
}
const report = await fs.readFile(path.join(ROOT,'docs/relatorio-piloto.md'),'utf8');
const academic = await fs.readFile(path.join(ROOT,'docs/texto-para-pcc.md'),'utf8');
const images = await Promise.all(['03-apos-escape.png','04-apos-blur.png'].map(async name => 'data:image/png;base64,' + (await fs.readFile(path.join(ROOT,'evidencias/capturas',name))).toString('base64')));
const html = `<!DOCTYPE html><html lang="pt-BR"><meta charset="utf-8"><title>Estudo piloto PCC</title><style>
@page{size:A4;margin:17mm 16mm 18mm}*{box-sizing:border-box}body{font:10pt/1.42 Arial,sans-serif;color:#18212d;margin:0}h1{font-size:21pt;margin:0 0 18px;color:#163e5b}h2{font-size:13pt;margin:22px 0 8px;color:#163e5b;break-after:avoid}h3{font-size:11pt;break-after:avoid}p{margin:0 0 10px;orphans:3;widows:3}a{color:#165879;text-decoration:none;overflow-wrap:anywhere}code{font:8.5pt Consolas,monospace;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;font-size:8pt;margin:12px 0 18px;table-layout:auto}th{background:#edf3f7;text-align:left}th,td{border:1px solid #bccbd5;padding:5px;overflow-wrap:anywhere;vertical-align:top}tr{break-inside:avoid}thead{display:table-header-group}ul{padding-left:20px}li{margin-bottom:5px}.appendix{break-before:page}figure{margin:10px 0 18px;break-inside:avoid}figure img{display:block;width:100%;border:1px solid #cad2dc}figcaption{font-size:9pt;margin-top:6px;color:#344455}.screen{max-width:900px;margin:auto;padding:32px}@media print{.screen{padding:0;max-width:none}}
</style><body><main class="screen">${markdown(report)}<section class="appendix"><h1>Capturas da reprodução de referência</h1><figure><img src="${images[0]}"><figcaption>Após Escape: o campo de edição permanece aberto com o texto changed.</figcaption></figure><figure><img src="${images[1]}"><figcaption>Após a mudança de foco: changed aparece como título da tarefa, substituindo buy milk.</figcaption></figure></section><section class="appendix">${markdown(academic)}</section></main></body></html>`;
await fs.writeFile(path.join(ROOT,'docs/relatorio-piloto.html'),html,'utf8');
const browser = await launchBrowser();
try {
  const page = await browser.newPage({viewport:{width:1000,height:1000}});
  await page.setContent(html, {waitUntil:'load'});
  await page.pdf({path:path.join(ROOT,'docs/relatorio-piloto.pdf'),format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font:8px Arial;width:100%;text-align:center;color:#667">Piloto PCC · 23/11/2026 · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',preferCSSPageSize:true});
  await page.screenshot({path:path.join(ROOT,'evidencias/capturas/relatorio-preview.png')});
  const result = await page.evaluate(()=>({title:document.title,tables:document.querySelectorAll('table').length,images:[...document.images].map(i=>({loaded:i.complete,width:i.naturalWidth})),text_length:document.body.innerText.length}));
  if (result.images.some(i=>!i.loaded||!i.width)) throw new Error('Imagem não carregada no PDF');
  await writeJSON('evidencias/ambiente/exportacao-pdf.json',result);
  console.log('PDF e HTML gerados, imagens carregadas e prévia salva.');
} finally { await browser.close(); }
