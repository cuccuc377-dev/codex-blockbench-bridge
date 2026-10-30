/* Local file queue. The only filesystem capability the production plugin needs. */
function createFileBridge({fs, path, root, id, engine, context = () => ({}), onError = console.error}) {
    const dir = path.join(root, 'sessions', id);
    const requests = path.join(dir, 'requests'), responses = path.join(dir, 'responses');
    let running = false, busy = false, pollTimer, heartbeatTimer;
    const atomic = (file, value) => {
        const temporary = file + '.tmp';
        fs.writeFileSync(temporary, JSON.stringify(value), {encoding:'utf8', mode:0o600});
        fs.renameSync(temporary, file);
    };
    const response = (requestId, value) => atomic(path.join(responses, requestId + '.json'), value);
    const heartbeat = () => atomic(path.join(dir,'session.json'), {protocol:1, id, version:engine.version, heartbeat:Date.now(), ...context()});
    async function tick() {
        if (!running || busy) return;
        busy = true;
        try {
            const files = fs.readdirSync(requests).filter(file => /^[a-f0-9]{32}\.json$/.test(file)).sort();
            for (const file of files.slice(0, 8)) {
                if (!running) break;
                const requestId = file.slice(0,-5), source = path.join(requests,file), claimed = source + '.processing';
                try { fs.renameSync(source,claimed); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
                try {
                    // A completed request ID is never executed twice. Results stay available for timeout diagnosis.
                    if (fs.existsSync(path.join(responses,file))) continue;
                    if (fs.statSync(claimed).size > 16 * 1024 * 1024) throw Object.assign(new Error('Request exceeds 16 MB'),{code:'TOO_LARGE'});
                    const request = JSON.parse(fs.readFileSync(claimed,'utf8'));
                    if (request.protocol !== 1 || request.id !== requestId || request.session !== id || typeof request.method !== 'string') throw Object.assign(new Error('Malformed request envelope'),{code:'BAD_REQUEST'});
                    if (!Number.isFinite(request.expires_at) || request.expires_at < Date.now()) throw Object.assign(new Error('Request expired before execution'),{code:'EXPIRED'});
                    const result = await engine.call(request.method, request.params || {});
                    response(requestId,{protocol:1,id:requestId,ok:true,result});
                } catch (error) {
                    response(requestId,{protocol:1,id:requestId,ok:false,error:{code:error.code || 'OPERATION_FAILED',message:String(error.message || error)}});
                } finally {
                    try { fs.unlinkSync(claimed); } catch (error) { if (error.code !== 'ENOENT') onError(error); }
                }
            }
        } catch (error) { onError(error); }
        finally { busy = false; }
    }
    function start() {
        if (running) return;
        fs.mkdirSync(requests,{recursive:true,mode:0o700}); fs.mkdirSync(responses,{recursive:true,mode:0o700});
        running = true; heartbeat();
        pollTimer = setInterval(tick,150);
        heartbeatTimer = setInterval(() => { try { heartbeat(); } catch (error) { onError(error); } },2000);
    }
    function stop() {
        running = false; clearInterval(pollTimer); clearInterval(heartbeatTimer);
        try { if (fs.existsSync(path.join(dir,'session.json'))) fs.unlinkSync(path.join(dir,'session.json')); } catch (error) { onError(error); }
    }
    return {start,stop,tick,id,dir,get running() { return running; }};
}
if (typeof module !== 'undefined' && module.exports) module.exports = createFileBridge;
