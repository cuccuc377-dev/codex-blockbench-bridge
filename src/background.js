/* Keep queued updates and animation playback moving when native rendering pauses.
 * Uses Node timers supplied by the plugin bundle; never focuses/restores the window. */
function createBackgroundController({onError = console.error} = {}) {
    let running = false, timer, lastFrame = 0, fallbackTicks = 0, lastError = '';
    const rendered = () => { lastFrame = Date.now(); };
    const isBackground = () => document.hidden || !document.hasFocus();
    function flush() {
        if (typeof Project !== 'undefined' && Project && !Undo.current_save) TickUpdates.Run();
    }
    function tick() {
        if (!running || !isBackground() || Date.now() - lastFrame < 100) return;
        if (typeof Project === 'undefined' || !Project || Undo.current_save) return;
        try {
            flush();
            if (Animator.open && Timeline.playing) Timeline.loop();
            fallbackTicks++;
            lastError = '';
        } catch (error) {
            const message = String(error.message || error);
            if (message !== lastError) onError(error);
            lastError = message;
        }
    }
    function start() {
        if (running) return;
        running = true;
        lastFrame = Date.now();
        Blockbench.on('render_frame', rendered);
        timer = setInterval(tick, 50);
    }
    function stop() {
        running = false;
        clearInterval(timer);
        Blockbench.removeListener('render_frame', rendered);
    }
    function describe() {
        return {enabled:running,scheduler:'node',visibility:document.visibilityState,focused:document.hasFocus(),
            fallback_ticks:fallbackTicks,playing:typeof Timeline !== 'undefined' && !!Timeline.playing,
            timeline_time:typeof Timeline !== 'undefined' ? Timeline.time : null,last_error:lastError || null};
    }
    return {start,stop,tick,flush,describe};
}
if (typeof module !== 'undefined' && module.exports) module.exports = createBackgroundController;
