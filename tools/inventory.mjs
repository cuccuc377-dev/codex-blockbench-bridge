// Development-only inventory of the installed Blockbench action registry.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const expr = `Object.values(BarItems).map(a=>({id:a.id,name:a.name,description:a.description,type:a.type,category:a.category,modes:a.modes,tool_settings:a.tool_settings,options:a.options?Object.keys(a.options):undefined}))`;
const result=JSON.parse(execFileSync(process.execPath,['tools/cdp.mjs',expr],{encoding:'utf8'}));
if(!Array.isArray(result.result?.value))throw new Error(JSON.stringify(result));
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/native-actions.json',JSON.stringify(result.result.value,null,2));
console.log(result.result.value.map(a=>`${a.id}\t${a.type}\t${a.name}`).join('\n'));
