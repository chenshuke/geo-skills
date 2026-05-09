// ============================================================
// GEO PDCA 排名对比追踪 DataviewJS 模板
// 对比两份不同日期的收录监测报告，识别进步/退步/稳定问题
// ============================================================
//
// 占位符列表：
//   {{BRAND_NAME}}      - 品牌名称
//   {{BRAND_ICON}}      - 品牌图标
//   {{DATE1}}           - 基准日期（较早）
//   {{DATE2}}           - 目标日期（较新）
//   {{RANKING_PATH1}}   - 基准收录监测路径
//   {{RANKING_PATH2}}   - 目标收录监测路径
//   {{PROJECT_PATH}}    - 项目路径（用于生成仪表盘链接）

(async () => {
  try {

    // ========== 配置 ==========
    const CONFIG = {
      brandName: '{{BRAND_NAME}}',
      brandIcon: '{{BRAND_ICON}}',
      date1: '{{DATE1}}',
      date2: '{{DATE2}}',
      rankingPath1: '{{RANKING_PATH1}}',
      rankingPath2: '{{RANKING_PATH2}}',
      projectPath: '{{PROJECT_PATH}}'
    };

    // ========== 解析函数 ==========
    function parseRanking(content) {
      if (!content) return {};
      const lines = content.split('\n');
      const ranking = {};
      let currentKw = '';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('核心词')) {
          currentKw = line.replace(/.*核心词\d*[:：]/, '').replace(/[（(].*$/, '').trim();
          continue;
        }
        if (line.startsWith('| 序号') || line.includes('---')) continue;
        if (line.startsWith('|') && line.split('|').length >= 10) {
          const cells = line.split('|').slice(1, -1).map(c => c.trim());
          const question = cells[3];
          if (!question || question.includes('用户常问问题')) continue;
          ranking[question] = {
            tier: cells[1] || '',
            expanded: cells[2] || '',
            question: question,
            coreKeyword: currentKw,
            score: Object.values({
              'DeepSeek': cells[4] === '✅',
              '豆包': cells[5] === '✅',
              '元宝': cells[6] === '✅',
              '千问': cells[7] === '✅',
              '文心': cells[8] === '✅'
            }).filter(Boolean).length,
            platforms: {
              'DeepSeek': cells[4] === '✅',
              '豆包': cells[5] === '✅',
              '元宝': cells[6] === '✅',
              '千问': cells[7] === '✅',
              '文心': cells[8] === '✅'
            }
          };
        }
      }
      return ranking;
    }

    // ========== 读取两份报告 ==========
    const [raw1, raw2] = await Promise.all([
      dv.io.load(CONFIG.rankingPath1),
      dv.io.load(CONFIG.rankingPath2)
    ]);
    const ranking1 = parseRanking(raw1 || '');
    const ranking2 = parseRanking(raw2 || '');

    // ========== 对比分析 ==========
    const platformKeys = ['DeepSeek', '豆包', '元宝', '千问', '文心'];
    const changes = [];

    // 处理所有在 report2 中出现的问题
    for (const [question, data2] of Object.entries(ranking2)) {
      const data1 = ranking1[question];
      if (!data1) {
        // 新增问题
        changes.push({
          question, tier: data2.tier, expanded: data2.expanded, coreKeyword: data2.coreKeyword,
          type: 'new', scoreBefore: '-', scoreAfter: data2.score,
          platforms: {}
        });
        for (const pk of platformKeys) {
          changes[changes.length - 1].platforms[pk] = data2.platforms[pk] ? 'new_up' : 'new_down';
        }
        continue;
      }
      // 已有问题，对比变化
      const diff = {};
      for (const pk of platformKeys) {
        const before = data1.platforms[pk];
        const after = data2.platforms[pk];
        if (!before && after) diff[pk] = 'improved';
        else if (before && !after) diff[pk] = 'regressed';
        else diff[pk] = 'stable';
      }
      const improvedCount = Object.values(diff).filter(v => v === 'improved').length;
      const regressedCount = Object.values(diff).filter(v => v === 'regressed').length;
      let type = 'stable';
      if (improvedCount > 0 && regressedCount === 0) type = 'improved';
      else if (regressedCount > 0 && improvedCount === 0) type = 'regressed';
      else if (improvedCount > 0 && regressedCount > 0) type = 'mixed';
      else if (data2.score > data1.score) type = 'improved';
      else if (data2.score < data1.score) type = 'regressed';

      changes.push({
        question, tier: data2.tier, expanded: data2.expanded, coreKeyword: data2.coreKeyword,
        type, scoreBefore: data1.score, scoreAfter: data2.score,
        platforms: diff
      });
    }

    // 处理消失的问题（在 report1 中有但 report2 中没有）
    for (const [question, data1] of Object.entries(ranking1)) {
      if (!ranking2[question]) {
        changes.push({
          question, tier: data1.tier, expanded: data1.expanded, coreKeyword: data1.coreKeyword,
          type: 'removed', scoreBefore: data1.score, scoreAfter: '-',
          platforms: {}
        });
        for (const pk of platformKeys) {
          changes[changes.length - 1].platforms[pk] = data1.platforms[pk] ? 'removed_down' : 'removed_stable';
        }
      }
    }

    // ========== 统计 ==========
    const improved = changes.filter(c => c.type === 'improved');
    const regressed = changes.filter(c => c.type === 'regressed');
    const mixed = changes.filter(c => c.type === 'mixed');
    const stable = changes.filter(c => c.type === 'stable');
    const newQ = changes.filter(c => c.type === 'new');
    const removed = changes.filter(c => c.type === 'removed');

    // 各平台变化统计
    const platformChanges = {};
    for (const pk of platformKeys) {
      platformChanges[pk] = { improved: 0, regressed: 0, stable: 0 };
      for (const c of changes) {
        const status = c.platforms[pk];
        if (status === 'improved' || status === 'new_up') platformChanges[pk].improved++;
        else if (status === 'regressed' || status === 'removed_down') platformChanges[pk].regressed++;
        else platformChanges[pk].stable++;
      }
    }

    // ========== 样式工具 ==========
    const card = 'style="background:#fff;border-radius:12px;padding:16px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.06);margin-bottom:14px;"';
    const typeIcon = t => t === 'improved' ? '🟢' : t === 'regressed' ? '🔴' : t === 'mixed' ? '🟡' : t === 'new' ? '🆕' : t === 'removed' ? '🗑️' : '⚪';
    const typeLabel = t => t === 'improved' ? '进步' : t === 'regressed' ? '退步' : t === 'mixed' ? '有进有退' : t === 'new' ? '新增' : t === 'removed' ? '消失' : '稳定';
    const typeBg = t => t === 'improved' ? '#f0faf4' : t === 'regressed' ? '#fff5f5' : t === 'mixed' ? '#fffbf0' : t === 'new' ? '#f0f4ff' : '#f5f5f5';
    const statusIcon = s => s === 'improved' ? '⬆️' : s === 'regressed' ? '⬇️' : s === 'new_up' ? '🆕' : s === 'new_down' ? '➖' : s === 'removed_down' ? '❌' : '—';

    // ========== 渲染 ==========
    let html = '';

    // 标题
    html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">';
    html += '<span style="font-size:36px;">📊</span>';
    html += '<div>';
    html += '<div style="font-size:22px;font-weight:700;">' + CONFIG.brandName + ' · PDCA 排名追踪</div>';
    html += '<div style="font-size:13px;color:#888;margin-top:4px;">' + CONFIG.date1 + ' → ' + CONFIG.date2 + ' · 对比分析</div>';
    html += '</div></div>';

    // 总览卡片
    html += '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:20px;">';
    const summaryItems = [
      ['进步', improved.length, '#0d9f4f', '个问题'],
      ['退步', regressed.length, '#e74c3c', '个问题'],
      ['有进有退', mixed.length, '#e67e22', '个问题'],
      ['稳定', stable.length, '#888', '个问题'],
      ['新增', newQ.length, '#4361ee', '个问题'],
      ['消失', removed.length, '#aaa', '个问题']
    ];
    for (const [label, value, color, sub] of summaryItems) {
      html += '<div ' + card + '>';
      html += '<div style="font-size:12px;color:#888;margin-bottom:4px;">' + label + '</div>';
      html += '<div style="font-size:24px;font-weight:700;color:' + color + ';">' + value + '</div>';
      html += '<div style="font-size:11px;color:#aaa;margin-top:2px;">' + sub + '</div>';
      html += '</div>';
    }
    html += '</div>';

    // 各平台变化
    html += '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">📡 各平台变化统计</div>';
    html += '<div ' + card + '>';
    html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">';
    for (const pk of platformKeys) {
      const pc = platformChanges[pk];
      html += '<div style="text-align:center;">';
      html += '<div style="font-size:12px;color:#888;">' + pk + '</div>';
      html += '<div style="font-size:14px;color:#0d9f4f;">⬆️ ' + pc.improved + '</div>';
      html += '<div style="font-size:14px;color:#e74c3c;">⬇️ ' + pc.regressed + '</div>';
      html += '<div style="font-size:11px;color:#aaa;">— ' + pc.stable + '</div>';
      html += '</div>';
    }
    html += '</div></div>';

    // 详细对比列表
    html += '<div style="font-size:16px;font-weight:700;margin:20px 0 12px;">📋 逐问题对比详情</div>';

    // 按核心词分组
    const byCore = {};
    for (const c of changes) {
      const kw = c.coreKeyword || '未分类';
      if (!byCore[kw]) byCore[kw] = [];
      byCore[kw].push(c);
    }

    for (const [kw, items] of Object.entries(byCore)) {
      html += '<details open style="margin-bottom:8px;">';
      html += '<summary style="cursor:pointer;font-size:14px;font-weight:600;padding:10px 16px;background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.06);display:flex;align-items:center;gap:8px;list-style:none;">';
      html += '<span>🔑</span>';
      html += '<span style="flex:1;">' + kw + '</span>';
      html += '<span style="font-size:12px;color:#888;">' + items.length + '个问题</span>';
      html += '</summary>';
      html += '<div style="padding:4px 0 4px 12px;">';

      for (const c of items) {
        html += '<div style="padding:8px 12px;border-radius:6px;margin-bottom:3px;background:' + typeBg(c.type) + ';">';
        html += '<div style="display:flex;align-items:center;gap:6px;">';
        html += '<span>' + typeIcon(c.type) + '</span>';
        html += '<span style="font-size:12px;font-weight:600;color:' + (c.type === 'improved' ? '#0d9f4f' : c.type === 'regressed' ? '#e74c3c' : '#888') + ';">' + typeLabel(c.type) + '</span>';
        html += '<span style="font-size:12px;color:#aaa;">' + c.tier + '</span>';
        html += '</div>';
        html += '<div style="font-size:13px;margin-top:2px;">' + c.question + '</div>';
        html += '<div style="display:flex;align-items:center;gap:12px;margin-top:4px;">';
        html += '<span style="font-size:11px;color:#888;">上榜数: <strong>' + c.scoreBefore + '</strong> → <strong>' + c.scoreAfter + '</strong></span>';
        // 各平台变化
        for (const pk of platformKeys) {
          const s = c.platforms[pk];
          html += '<span style="font-size:11px;">' + statusIcon(s) + ' ' + pk + '</span>';
        }
        html += '</div></div>';
      }

      html += '</div></details>';
    }

    // 行动建议
    if (regressed.length > 0 || mixed.length > 0) {
      html += '<div style="font-size:16px;font-weight:700;margin:20px 0 12px;">🎯 行动建议</div>';
      html += '<div ' + card + '>';

      if (regressed.length > 0) {
        html += '<div style="font-size:13px;font-weight:600;color:#e74c3c;margin-bottom:8px;">🔴 需要立即优化的退步问题（' + regressed.length + '个）</div>';
        for (const c of regressed) {
          const regressedPlatforms = Object.entries(c.platforms).filter(([k,v]) => v === 'regressed').map(([k]) => k).join('、');
          html += '<div style="font-size:12px;padding:4px 0;border-bottom:1px solid #f5f5f5;">';
          html += '❌ ' + c.question;
          html += ' <span style="color:#e74c3c;">（退步平台: ' + regressedPlatforms + '）</span>';
          html += '</div>';
        }
      }

      if (mixed.length > 0) {
        html += '<div style="font-size:13px;font-weight:600;color:#e67e22;margin:10px 0 8px;">🟡 部分退步需关注（' + mixed.length + '个）</div>';
        for (const c of mixed) {
          const regressedPlatforms = Object.entries(c.platforms).filter(([k,v]) => v === 'regressed').map(([k]) => k).join('、');
          html += '<div style="font-size:12px;padding:4px 0;border-bottom:1px solid #f5f5f5;">';
          html += '⚠️ ' + c.question;
          html += ' <span style="color:#e67e22;">（退步: ' + regressedPlatforms + '）</span>';
          html += '</div>';
        }
      }

      html += '<div style="font-size:12px;color:#888;margin-top:10px;padding:8px;background:#f8f9fa;border-radius:6px;">';
      html += '💡 优化建议：为退步的问题补充或优化对应内容，并在优化后重新检测收录';
      html += '</div></div>';
    }

    // 成功经验
    if (improved.length > 0) {
      html += '<div style="font-size:16px;font-weight:700;margin:20px 0 12px;">✅ 成功经验</div>';
      html += '<div ' + card + '>';
      html += '<div style="font-size:13px;color:#0d9f4f;margin-bottom:8px;">以下问题取得了进步（' + improved.length + '个），可复制经验：</div>';
      for (const c of improved) {
        const improvedPlatforms = Object.entries(c.platforms).filter(([k,v]) => v === 'improved').map(([k]) => k).join('、');
        html += '<div style="font-size:12px;padding:4px 0;border-bottom:1px solid #f0faf4;">';
        html += '✅ ' + c.question;
        html += ' <span style="color:#0d9f4f;">（进步平台: ' + improvedPlatforms + '）</span>';
        html += '</div>';
      }
      html += '</div>';
    }

    // 数据源链接
    html += '<div style="margin-top:20px;padding:14px 18px;background:#f8f9fa;border-radius:10px;">';
    html += '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">📁 数据源</div>';
    html += '<div style="font-size:12px;color:#666;line-height:2;">';
    html += '📊 [[' + CONFIG.rankingPath1 + '|基准报告 ' + CONFIG.date1 + ']]<br>';
    html += '📊 [[' + CONFIG.rankingPath2 + '|目标报告 ' + CONFIG.date2 + ']]<br>';
    html += '📂 [[' + CONFIG.projectPath + '/仪表盘|项目仪表盘]]';
    html += '</div></div>';

    dv.paragraph(html);

  } catch(err) {
    dv.paragraph('❌ PDCA 追踪出错：' + err.message);
  }
})();
