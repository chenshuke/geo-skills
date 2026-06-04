#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

function homePath(p){ return path.join(os.homedir(), ...p.split(/[\/]+/)); }
function readJson(file){ try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return null; } }
function firstEnv(...names){ for(const n of names){ if(process.env[n]) return process.env[n]; } return undefined; }
function defaultConfig(){ return { geo:{baseUrl:'https://nbgeo.aimusiclj.com',openKey:'',referer:'https://geo.bihuoai.com/'}, defaults:{companyId:0,productId:0} }; }
function configPath(){ return firstEnv('GEO_CONFIG_FILE','GEO_CONFIG','GEO_OSS_CONFIG') || homePath('.geo-skills/credentials/geo-config.json'); }
function loadGeoConfig(){
  const loaded = readJson(configPath()) || {};
  const cfg = defaultConfig();
  const geo = loaded.geo || loaded;
  cfg.geo = Object.assign(cfg.geo, geo || {});
  cfg.defaults = Object.assign(cfg.defaults, loaded.defaults || {});
  cfg.geo.baseUrl = firstEnv('GEO_BASE_URL') || cfg.geo.baseUrl;
  cfg.geo.openKey = firstEnv('GEO_OPENKEY','GEO_OPEN_KEY') || cfg.geo.openKey;
  cfg.geo.referer = firstEnv('GEO_REFERER') || cfg.geo.referer;
  return cfg;
}
function ensureConfig(){ const file=configPath(); fs.mkdirSync(path.dirname(file),{recursive:true}); if(!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultConfig(),null,2),'utf8'); return file; }
function saveGeoConfig(cfg){ const file=configPath(); fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file, JSON.stringify(cfg,null,2),'utf8'); return file; }
function mask(v){ if(!v) return '(empty)'; return String(v).length<=8 ? String(v).slice(0,2)+'****' : String(v).slice(0,4)+'****'+String(v).slice(-4); }
function headers(cfg){ return { Authorization:`Bearer ${cfg.geo.openKey}`, Referer:cfg.geo.referer || 'https://geo.bihuoai.com/', 'User-Agent':'GEO-Skills-Node/1.0' }; }
module.exports={configPath,loadGeoConfig,ensureConfig,saveGeoConfig,mask,headers,defaultConfig};

if(require.main===module){
  const args=process.argv.slice(2); const cfg=loadGeoConfig();
  if(args.includes('--init')) console.log('created:', ensureConfig());
  else console.log(JSON.stringify({path:configPath(), geo:{...cfg.geo, openKey:mask(cfg.geo.openKey)}, defaults:cfg.defaults}, null, 2));
}
