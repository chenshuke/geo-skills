#!/usr/bin/env node
const fs=require('fs'), path=require('path'), child_process=require('child_process');
const {configPath,loadGeoConfig,ensureConfig,mask,headers}=require('./credentials.js');
const args=process.argv.slice(2);
const suite=path.resolve(__dirname,'../..');
const required=['geo-runtime','geo-hub','geo-workflow-hub','geo-config','geo-account','geo-article','geo-indexing','geo-publish','geo-brand','geo-knowledge','geo-content','geo-content-production','geo-content-audit','geo-content-archive','geo-analysis'];
function ok(s,m){return {status:s,message:m};}
function hasCmd(cmd){try{child_process.execFileSync(cmd,['--version'],{stdio:'ignore'});return true;}catch{return false;}}
async function main(){
 if(args.includes('--init-config')) console.log('Config template:', ensureConfig());
 const cfg=loadGeoConfig();
 const skills=required.map(n=>({name:n, exists:fs.existsSync(path.join(suite,n,'SKILL.md'))}));
 const report={
   runtime:'node-no-python',
   node: ok(process.versions.node?'OK':'FAIL', process.version),
   larkCli: ok(hasCmd('lark-cli')?'OK':'WARN', hasCmd('lark-cli')?'lark-cli available':'lark-cli not found; 飞书功能需安装'),
   config:{path:configPath(), exists:fs.existsSync(configPath()), openKey:mask(cfg.geo.openKey), baseUrl:cfg.geo.baseUrl, referer:cfg.geo.referer, defaults:cfg.defaults},
   skills,
   python:{status:'OPTIONAL', message:'Python is no longer required for core GEO Skills. Legacy scripts may still use it if present.'}
 };
 if(args.includes('--check-api')){
   if(!cfg.geo.openKey) report.api=ok('SKIP','openKey empty');
   else{
     try{ const res=await fetch(`${cfg.geo.baseUrl.replace(/\/$/,'')}/v1/geo-company?page=1&limit=1`,{headers:headers(cfg)}); report.api=ok(res.ok?'OK':'WARN',`HTTP ${res.status}`); }
     catch(e){ report.api=ok('FAIL',e.message); }
   }
 }
 if(args.includes('--json')) console.log(JSON.stringify(report,null,2));
 else{
   console.log('GEO Skills Doctor (Node / no Python mode)');
   console.log('Node:', report.node.status, report.node.message);
   console.log('lark-cli:', report.larkCli.status, report.larkCli.message);
   console.log('Config:', report.config.exists?'OK':'WARN', report.config.path, 'openKey=', report.config.openKey);
   console.log('Skills:', skills.filter(x=>x.exists).length+'/'+skills.length, skills.filter(x=>!x.exists).map(x=>x.name).join(', ') || 'all present');
   if(report.api) console.log('API:', report.api.status, report.api.message);
   console.log('Python:', report.python.status, report.python.message);
 }
}
main().catch(e=>{console.error(e);process.exit(1)});
