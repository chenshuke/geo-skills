#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

function homePath(p){ return path.join(os.homedir(), ...p.split(/[\\/]+/)); }
function readJson(file){ try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return null; } }
function defaultConfig(){ return { geo:{baseUrl:'https://nbgeo.aimusiclj.com',openKey:'',referer:'https://geo.bihuoai.com/'}, defaults:{companyId:0,productId:0} }; }
function configPath(){ return process.env.GEO_CONFIG_FILE || homePath('.geo-skills/credentials/geo-config.json'); }
function loadGeoConfig(){
  const cfg = Object.assign(defaultConfig(), readJson(configPath()) || {});
  cfg.geo = Object.assign(defaultConfig().geo, cfg.geo || {});
  cfg.defaults = Object.assign(defaultConfig().defaults, cfg.defaults || {});
  if(process.env.GEO_BASE_URL) cfg.geo.baseUrl = process.env.GEO_BASE_URL;
  if(process.env.GEO_OPEN_KEY) cfg.geo.openKey = process.env.GEO_OPEN_KEY;
  if(process.env.GEO_REFERER) cfg.geo.referer = process.env.GEO_REFERER;
  return cfg;
}
function ensureConfig(){ const file=configPath(); fs.mkdirSync(path.dirname(file),{recursive:true}); if(!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultConfig(),null,2),'utf8'); return file; }
function saveGeoConfig(cfg){ const file=configPath(); fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file, JSON.stringify(cfg,null,2),'utf8'); return file; }
function mask(v){ if(!v) return '(empty)'; return v.length<=8 ? v.slice(0,2)+'****' : v.slice(0,4)+'****'+v.slice(-4); }
function headers(cfg){ return { Authorization:`Bearer ${cfg.geo.openKey}`, Referer:cfg.geo.referer || 'https://geo.bihuoai.com/', 'User-Agent':'GEO-Skills-Node/1.0' }; }
module.exports={configPath,loadGeoConfig,ensureConfig,saveGeoConfig,mask,headers,defaultConfig};

if(require.main===module){
  const args=process.argv.slice(2); const cfg=loadGeoConfig();
  if(args.includes('--init')) console.log('created:', ensureConfig());
  else console.log(JSON.stringify({path:configPath(), geo:{...cfg.geo, openKey:mask(cfg.geo.openKey)}, defaults:cfg.defaults}, null, 2));
}
