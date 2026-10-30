function createAnimationOperations(api) {
    const {check,obj,number,vec,name,project,resolve,transaction,integer,enumeration} = api;
    function requireAnimation(p) {project(p);check(Format.animation_mode,'This project format does not support animation');}
    function animation(id) {return resolve(id,{},Animator.animations);}
    function describe(a,detail=false) {
        const result={uuid:a.uuid,name:a.name,length:a.length,loop:a.loop,snapping:a.snapping,selected:a===Animation.selected};
        if(detail) result.tracks=Object.values(a.animators).filter(track=>track.type!=='effect').map(track=>({target:track.uuid,name:track.name,channels:Object.keys(track.channels),keyframes:track.keyframes.map(k=>({uuid:k.uuid,channel:k.channel,time:k.time,interpolation:k.interpolation,value:k.data_points[0] ? ['x','y','z'].map(axis=>k.data_points[0][axis]) : []}))}));
        return result;
    }
    function properties(p,existing) {
        const data={name:name(p.name,existing?.name || 'animation')};
        if(p.length!==undefined){check(number(p.length) && p.length>0 && p.length<=10000,'length must be >0 and <=10000 seconds');data.length=p.length;}
        if(p.loop!==undefined)data.loop=enumeration(p.loop,['once','loop','hold'],'loop');
        if(p.snapping!==undefined)data.snapping=integer(p.snapping,10,500,'snapping');
        return data;
    }
    function trackData(p,a) {
        check(Array.isArray(p.tracks) && p.tracks.length>0 && p.tracks.length<=256,'tracks requires 1–256 tracks');
        const seen=new Set();let count=0;
        return p.tracks.map(track=>{
            check(obj(track),'Track must be an object');
            const target=resolve(track.target);check(target.constructor.animator,'Target cannot be animated directly; put cube/mesh in a group or bind mesh to bones');
            check(!seen.has(target.uuid),'Merge channels for a target into one track entry');seen.add(target.uuid);
            const animator=a.getBoneAnimator(target);check(animator,'No animator available for target');
            check(Array.isArray(track.keyframes) && track.keyframes.length>0,'Each track needs keyframes');
            const times=new Set();
            const keyframes=track.keyframes.map(frame=>{
                count++;check(count<=10000,'At most 10000 keyframes per request');
                const channel=enumeration(frame.channel,['position','rotation','scale'],'channel');
                check(animator.channels[channel],'Target does not support this channel');
                check(number(frame.time) && frame.time>=0 && frame.time<=10000,'Keyframe time must be 0–10000 seconds');
                const key=channel+':'+frame.time;check(!times.has(key),'Duplicate channel/time in track');times.add(key);
                const value=vec(frame.value,3,'keyframe value');
                const interpolation=enumeration(frame.interpolation || 'linear',['linear','step','catmullrom','bezier'],'interpolation');
                const data={channel,time:frame.time,interpolation,data_points:[Object.fromEntries(['x','y','z'].map((axis,i)=>[axis,String(value[i])]))]};
                for(const key of ['bezier_left_time','bezier_right_time','bezier_left_value','bezier_right_value'])if(frame[key]!==undefined)data[key]=vec(frame[key]);
                return data;
            });
            return {animator,keyframes};
        });
    }
    function putTracks(p,a) {
        const tracks=trackData(p,a);
        for(const {animator,keyframes} of tracks) {
            if(p.replace===true) for(const channel of new Set(keyframes.map(k=>k.channel))) animator[channel].slice().forEach(k=>k.remove());
            for(const data of keyframes) {
                animator[data.channel].filter(k=>Math.abs(k.time-data.time)<1e-8).forEach(k=>k.remove());
                animator.addKeyframe(data);
            }
        }
        a.setLength();a.saved=false;
        if(Modes.animate && Animation.selected===a)Animator.preview();
        return describe(a,true);
    }
    return {
        'animation.list'(p){requireAnimation(p);return Animator.animations.map(a=>describe(a,p.detail===true));},
        'animation.get'(p){requireAnimation(p);return describe(animation(p.id),true);},
        'animation.create'(p){
            requireAnimation(p);const data=properties(p);if(data.length===undefined)data.length=1;
            const animations=[];
            return transaction({animations},'Codex create animation',()=>{
                const a=new Animation(data).add(false);animations.push(a);if(p.tracks)putTracks(p,a);return describe(a,true);
            });
        },
        'animation.update'(p){requireAnimation(p);const a=animation(p.id),data=properties(p,a);return transaction({animations:[a]},'Codex update animation',()=>{a.extend(data);a.saved=false;return describe(a,true);});},
        'animation.keyframes'(p){
            requireAnimation(p);check(!Undo.current_save,'Finish the current edit first');const a=animation(p.id);
            // Blockbench restores saved tracks, but does not delete tracks absent from a snapshot.
            // Include empty tracks before the edit, so undo can remove their new keyframes.
            const oldKeys=new Set(Object.keys(a.animators));
            try { trackData(p,a); }
            catch(error){for(const key of Object.keys(a.animators))if(!oldKeys.has(key))a.removeAnimator(key);throw error;}
            const aspects={animations:[a]};
            try{return transaction(aspects,'Codex edit keyframes',()=>putTracks(p,a));}
            catch(error){for(const key of Object.keys(a.animators))if(!oldKeys.has(key))a.removeAnimator(key);throw error;}
        },
        'animation.remove'(p){requireAnimation(p);const a=animation(p.id);return transaction({animations:Animator.animations},'Codex remove animation',()=>{a.remove(false,false);return {removed:a.uuid};});},
        'animation.keyframes.remove'(p){
            requireAnimation(p);const a=animation(p.id);check(Array.isArray(p.keyframes) && p.keyframes.length>0,'keyframes must list keyframe UUIDs');
            const all=Object.values(a.animators).flatMap(track=>track.keyframes),selected=p.keyframes.map(id=>{const k=all.find(k=>k.uuid===id);check(k,'Unknown keyframe UUID');return k;});
            return transaction({animations:[a]},'Codex remove keyframes',()=>{selected.forEach(k=>k.remove());a.saved=false;return describe(a,true);});
        },
        'animation.preview'(p){
            requireAnimation(p);check(!Undo.current_save,'Finish the current edit first');const a=animation(p.id);
            check(p.time===undefined || (number(p.time) && p.time>=0 && p.time<=10000),'time must be 0–10000 seconds');
            Timeline.pause();Modes.options.animate.select();a.select();Timeline.setTime(p.time || 0);Animator.preview();
            return {animation:a.uuid,time:Timeline.time};
        },
        'animation.play'(p){requireAnimation(p);check(!Undo.current_save,'Finish the current edit first');const a=animation(p.id);Modes.options.animate.select();a.select();Timeline.start();return {animation:a.uuid,playing:Timeline.playing};},
        'animation.stop'(p){requireAnimation(p);Timeline.pause();return {playing:false,time:Timeline.time};},
        'animation.rest'(p){requireAnimation(p);check(!Undo.current_save,'Finish the current edit first');Timeline.pause();Modes.options.edit.select();Canvas.updateAll();return {mode:'edit'};},
        'animation.export'(p){requireAnimation(p);const list=p.id?[animation(p.id)]:Animator.animations;return {format:'blockbench-animation',content:JSON.stringify({format_version:'1.0',animations:list.map(a=>a.getUndoCopy({save:true}))},null,2)};}
    };
}
