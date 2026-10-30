// Development-only evaluator for an explicitly launched isolated Blockbench instance.
import fs from 'node:fs';
const port = process.env.BB_CDP_PORT || '9337';
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = targets.find(t => t.type === 'page' && t.url.includes('index.html'));
if (!target) throw new Error('No Blockbench test page');
const expression = process.argv[2] === '--file' ? fs.readFileSync(process.argv[3], 'utf8') : process.argv[2];
const socket = new WebSocket(target.webSocketDebuggerUrl);
const timer = setTimeout(() => { console.error('CDP timeout'); process.exit(1); }, 30000);
socket.addEventListener('open', () => socket.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression, awaitPromise: true, returnByValue: true}})));
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id !== 1) return;
  clearTimeout(timer);
  console.log(JSON.stringify(message.result || message.error, null, 2));
  socket.close();
  if (message.error || message.result?.exceptionDetails) process.exitCode = 1;
});
