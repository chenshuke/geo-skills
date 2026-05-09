// ============================================================
// GEO 单项目仪表盘 DataviewJS 模板
// 使用方式：将此模板中的 {{PLACEHOLDER}} 替换为实际值后
//           包裹在 ```dataviewjs ... ``` 中写入 .md 文件
// ============================================================
//
// 占位符列表：
//   {{BRAND_NAME}}      - 品牌名称（如 "多耐减振器"）
//   {{BRAND_ICON}}      - 品牌图标（如 "🏭"）
//   {{PROJECT_PATH}}    - 项目文件夹路径（如 "项目_示例品牌GEO"）
//   {{TRACKING_PATH}}   - 跟踪表路径（如 "项目_示例品牌GEO/03_规划方案/内容布局跟踪表.md"）
//   {{MAPPING_PATH}}    - 映射表路径或 null
//   {{RANKING_PATH}}    - 收录监测路径或 null
//   {{OVERVIEW_PATH}}   - 项目概览路径或 null
//   {{MATURITY}}        - 成熟度：early / mid / advanced
//   {{HAS_RANKING}}     - 是否有收录数据：true / false
//   {{HAS_MAPPING}}     - 是否有映射表：true / false

(async () => {
  try {

    // ========== 配置（由技能自动替换） ==========
    const CONFIG = {
      brandName: '{{BRAND_NAME}}',
      brandIcon: '{{BRAND_ICON}}',
      projectPath: '{{PROJECT_PATH}}',
      trackingPath: '{{TRACKING_PATH}}',
      mappingPath: {{HAS_MAPPING}} ? '{{MAPPING_PATH}}' : null,
      rankingPath: {{HAS_RANKING}} ? '{{RANKING_PATH}}' : null,
      overviewPath: '{{OVERVIEW_PATH}}',
      maturity: '{{MATURITY}}'
    };

    // ========== 读取数据源 ==========
    const loadPromises = [dv.io.load(CONFIG.trackingPath)];
    if (CONFIG.mappingPath) loadPromises.push(dv.io.load(CONFIG.mappingPath));
    if (CONFIG.rankingPath) loadPromises.push(dv.io.load(CONFIG.rankingPath));

    const results = await Promise.all(loadPromises);
    const rawTrack = results[0] || '';
    const rawMapping = CONFIG.mappingPath ? results[1] || '' : null;
    const rawRanking = CONFIG.rankingPath
      ? (CONFIG.mappingPath ? results[2] || '' : results[1] || '')
      : null;

    // ========== 解析函数 ==========

    // 通用 Markdown 表格解析器（智能列检测）
    function parseTable(content, headerText) {
      const lines = content.split('\n');
      let start = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(headerText)) { start = i; break; }
      }
      if (start < 0) return { rows: [], columns: {} };

      // 检测列头
      let headerLine = '';
      for (let i = start; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && !line.includes('---')) {
          headerLine = line;
          break;
        }
      }
      const headers = headerLine.split('|').slice(1, -1).map(c => c.trim());

      // 智能列映射（兼容不同项目的列名差异）
      const colMap = {};
      headers.forEach((h, idx) => {
        if (h.includes('核心词') || h.includes('核心关键词')) colMap.coreKw = idx;
        if (h.includes('拓展词') || h.includes('长尾词')) colMap.expandedKw = idx;
        if (h.includes('层级')) colMap.tier = idx;
        if (h.includes('内容类型') || h.includes('类型')) colMap.contentType = idx;
        if (h.includes('字数')) colMap.wordTier = idx;
        if (h.includes('标题') || h.includes('文章标题')) colMap.title = idx;
        if (h.includes('日期') || h.includes('创作日期')) colMap.date = idx;
        if (h.includes('序号')) colMap.seq = idx;
      });

      // 解析数据行
      const rows = [];
      for (let i = start; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('|') || line.includes('---')) continue;
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        const seqVal = colMap.seq !== undefined ? cells[colMap.seq] : cells[0];
        if (seqVal && isNaN(parseInt(seqVal))) continue;
        rows.push({
          coreKw: (colMap.coreKw !== undefined ? cells[colMap.coreKw] : cells[1]) || '未分类',
          expandedKw: (colMap.expandedKw !== undefined ? cells[colMap.expandedKw] : cells[2]) || '未分类',
          tier: colMap.tier !== undefined ? cells[colMap.tier] : (cells[3] || ''),
          contentType: colMap.contentType !== undefined ? cells[colMap.contentType] : (cells[4] || ''),
          title: colMap.title !== undefined ? cells[colMap.title] : (cells[6] || ''),
          date: colMap.date !== undefined ? cells[colMap.date] : (cells[7] || ''),
          raw: cells
        });
      }
      return { rows, columns: colMap };
    }

    // 解析收录监测表（按核心词分组）
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

    // ========== 构建树结构 ==========
    const { rows: trackingRows } = parseTable(rawTrack, '| 序号');
    const rankingData = parseRanking(rawRanking);

    const tree = {};
    for (const r of trackingRows) {
      const kw = r.coreKw;
      const ek = r.expandedKw;
      if (!tree[kw]) tree[kw] = {};
      if (!tree[kw][ek]) tree[kw][ek] = [];
      tree[kw][ek].push({
        title: r.title,
        contentType: r.contentType,
        date: r.date,
        tier: r.tier
      });
    }

    // 统计内容文件
    const contentBasePath = CONFIG.projectPath + '/04_内容创作';
    const allFiles = app.vault.getFiles();
    const contentFiles = allFiles.filter(f =>
      f.path.startsWith(contentBasePath) && f.extension === 'md'
    );
    const contentFileCount = contentFiles.length;

    // 全局统计
    const totalArticles = trackingRows.length;
    let totalQuestions = 0, totalRanked = 0, totalChecks = 0;
    for (const q of Object.values(rankingData)) {
      totalQuestions++;
      for (const v of Object.values(q.platforms)) {
        totalChecks++;
        if (v) totalRanked++;
      }
    }
    const overallRate = totalChecks > 0 ? Math.round(totalRanked / totalChecks * 100) : 0;
    const hasRanking = totalQuestions > 0;

    // ========== 样式工具 ==========
    const card = 'style="background:#fff;border-radius:12px;padding:16px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.06);margin-bottom:14px;"';
    const tierColor = t => t.includes('必答') ? '#0d9f4f' : t.includes('高概率') ? '#e67e22' : '#888';
    const tierIcon = t => t.includes('必答') ? '🟢' : t.includes('高概率') ? '🟡' : '🟠';
    const tierLabel = t => t.includes('必答') ? '必答' : t.includes('高概率') ? '高概率' : '突围';
    const rankDot = ok => ok ? '🟢' : '🔴';
    const rateColor = r => r >= 60 ? '#0d9f4f' : r >= 30 ? '#e67e22' : '#e74c3c';

    // ========== 渲染 ==========
    let html = '';

    // 标题
    html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">';
    html += '<span style="font-size:36px;">' + CONFIG.brandIcon + '</span>';
    html += '<div>';
    html += '<div style="font-size:22px;font-weight:700;">' + CONFIG.brandName + ' · GEO 全链路仪表盘</div>';
    html += '<div style="font-size:13px;color:#888;margin-top:4px;">核心词 → 拓展词 → 用户问题 → 文章标题 → 内容创作 → 平台发布 → AI收录 · 全链路闭环</div>';
    html += '</div></div>';

    // 全链路流水线
    const expandedKwCount = Object.values(tree).reduce((s, v) => s + Object.keys(v).length, 0);
    const pipelineSteps = [
      { label: '核心关键词', count: Object.keys(tree).length, unit: '个', status: 'done' },
      { label: '拓展关键词', count: expandedKwCount, unit: '个', status: 'done' },
      { label: '用户问题', count: totalQuestions, unit: '个', status: totalQuestions > 0 ? 'done' : 'empty' },
      { label: '文章标题', count: totalArticles, unit: '篇', status: totalArticles > 0 ? 'done' : 'empty' },
      { label: '内容创作', count: contentFileCount, unit: '篇', status: contentFileCount >= totalArticles && totalArticles > 0 ? 'done' : contentFileCount > 0 ? 'progress' : 'empty' },
      { label: '平台发布', count: 0, unit: '条', status: 'empty' },
      { label: 'AI收录', count: hasRanking ? overallRate : '-', unit: hasRanking ? '%' : '', status: hasRanking ? (overallRate >= 50 ? 'done' : 'progress') : 'empty' }
    ];

    html += '<div ' + card + '>';
    html += '<div style="font-size:13px;font-weight:600;color:#888;margin-bottom:12px;">🔄 全链路流水线（7个环节）</div>';
    html += '<div style="display:flex;align-items:center;gap:4px;overflow-x:auto;padding-bottom:4px;">';
    for (let i = 0; i < pipelineSteps.length; i++) {
      const s = pipelineSteps[i];
      const bg = s.status === 'done' ? '#f0faf4' : s.status === 'progress' ? '#fffbf0' : '#f5f5f5';
      const border = s.status === 'done' ? '#0d9f4f' : s.status === 'progress' ? '#e67e22' : '#ddd';
      const textColor = s.status === 'done' ? '#0d9f4f' : s.status === 'progress' ? '#e67e22' : '#aaa';
      const icon = s.status === 'done' ? '✅' : s.status === 'progress' ? '⏳' : '⬜';
      html += '<div style="flex-shrink:0;text-align:center;padding:10px 12px;background:' + bg + ';border:1.5px solid ' + border + ';border-radius:10px;min-width:90px;">';
      html += '<div style="font-size:18px;">' + icon + '</div>';
      html += '<div style="font-size:11px;color:#666;margin-top:4px;">' + s.label + '</div>';
      html += '<div style="font-size:18px;font-weight:700;color:' + textColor + ';margin-top:2px;">' + s.count + '<span style="font-size:11px;font-weight:400;">' + s.unit + '</span></div>';
      html += '</div>';
      if (i < pipelineSteps.length - 1) html += '<span style="color:#ccc;font-size:16px;flex-shrink:0;">→</span>';
    }
    html += '</div>';
    html += '<div style="margin-top:10px;padding:8px 14px;background:#f8f9fa;border-radius:8px;font-size:12px;color:#888;">';
    html += '📌 平台发布环节：06_发布记录/ 暂无数据，内容发布后在此记录即可自动展示';
    html += '</div></div>';

    // 核心指标卡片
    const totalPlanned = totalArticles;
    const overviewCards = [
      ['核心词', Object.keys(tree).length, '#4361ee', '个方向'],
      ['拓展词', expandedKwCount, '#6c5ce7', '个场景'],
      ['用户问题', totalQuestions, '#e67e22', '个提问'],
      ['文章标题', totalArticles, '#0d9f4f', '篇标题'],
      ['内容文件', contentFileCount + '/' + totalPlanned, contentFileCount >= totalPlanned ? '#0d9f4f' : '#e67e22', '已创作'],
      ['AI 收录率', overallRate, hasRanking ? rateColor(overallRate) : '#ccc', hasRanking ? '5个平台' : '暂无数据']
    ];

    html += '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:20px;">';
    for (const [label, value, color, sub] of overviewCards) {
      html += '<div ' + card + '>';
      html += '<div style="font-size:12px;color:#888;margin-bottom:4px;">' + label + '</div>';
      html += '<div style="font-size:24px;font-weight:700;color:' + color + ';">' + value + '</div>';
      html += '<div style="font-size:11px;color:#aaa;margin-top:2px;">' + sub + '</div>';
      html += '</div>';
    }
    html += '</div>';

    // AI 平台上榜率（仅有收录数据时展示）
    if (hasRanking) {
      html += '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">🔍 AI 平台上榜率</div>';
      html += '<div ' + card + '>';
      html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">';
      const platformKeys = ['DeepSeek', '豆包', '元宝', '千问', '文心'];
      for (const key of platformKeys) {
        const ranked = Object.values(rankingData).filter(q => q.platforms[key]).length;
        const total = Object.keys(rankingData).length;
        const rate = total > 0 ? Math.round(ranked / total * 100) : 0;
        html += '<div style="text-align:center;">';
        html += '<div style="font-size:12px;color:#888;">' + key + '</div>';
        html += '<div style="font-size:22px;font-weight:700;color:' + rateColor(rate) + ';">' + rate + '%</div>';
        html += '<div style="font-size:11px;color:#aaa;">' + ranked + '/' + total + ' 上榜</div>';
        html += '</div>';
      }
      html += '</div></div>';
    }

    // 全链路树状视图
    html += '<div style="font-size:16px;font-weight:700;margin:20px 0 12px;">🌳 全链路树状视图（点击展开每一层）</div>';

    for (const [kw, expandedKws] of Object.entries(tree)) {
      const kwArticles = Object.values(expandedKws).flat();
      const kwRanked = Object.values(rankingData).filter(q => q.coreKeyword === kw);
      const kwChecks = kwRanked.reduce((s, q) => s + Object.values(q.platforms).length, 0);
      const kwRankedCount = kwRanked.reduce((s, q) => s + Object.values(q.platforms).filter(Boolean).length, 0);
      const kwRate = kwChecks > 0 ? Math.round(kwRankedCount / kwChecks * 100) : 0;
      const kwQuestions = kwRanked.length;

      html += '<details open style="margin-bottom:8px;">';
      html += '<summary style="cursor:pointer;font-size:15px;font-weight:600;padding:12px 16px;background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.06);display:flex;align-items:center;gap:8px;list-style:none;">';
      html += '<span>🔑</span>';
      html += '<span style="flex:1;">' + kw + '</span>';
      html += '<span style="font-size:11px;color:#888;">' + Object.keys(expandedKws).length + '拓展</span>';
      html += '<span style="font-size:11px;color:#888;">' + kwQuestions + '问题</span>';
      html += '<span style="font-size:11px;color:#888;">' + kwArticles.length + '篇</span>';
      if (hasRanking) {
        html += '<span style="font-size:12px;font-weight:600;color:' + rateColor(kwRate) + ';">收录 ' + kwRate + '%</span>';
      }
      html += '</summary>';
      html += '<div style="padding:4px 0 4px 12px;">';

      for (const [ek, ekArticles] of Object.entries(expandedKws)) {
        const ekTier = ekArticles[0].tier || '';
        const ekIcon = tierIcon(ekTier);
        const ekLabel = tierLabel(ekTier);
        const ekBg = ekTier.includes('必答') ? '#f0faf4' : ekTier.includes('高概率') ? '#fffbf0' : '#f5f5f5';
        const ekRanking = Object.values(rankingData).filter(q => q.expanded === ek);
        const ekChecks2 = ekRanking.reduce((s, q) => s + Object.values(q.platforms).length, 0);
        const ekRanked2 = ekRanking.reduce((s, q) => s + Object.values(q.platforms).filter(Boolean).length, 0);
        const ekRate = ekChecks2 > 0 ? Math.round(ekRanked2 / ekChecks2 * 100) : 0;

        html += '<details style="margin-bottom:4px;">';
        html += '<summary style="cursor:pointer;font-size:14px;padding:10px 14px;border-radius:8px;background:' + ekBg + ';display:flex;align-items:center;gap:8px;list-style:none;margin-bottom:2px;">';
        html += '<span>' + ekIcon + '</span>';
        html += '<span style="flex:1;font-weight:500;">' + ek + '</span>';
        html += '<span style="font-size:11px;color:#888;">' + ekLabel + '</span>';
        html += '<span style="font-size:11px;color:#888;">' + ekRanking.length + '问</span>';
        html += '<span style="font-size:11px;color:#888;">' + ekArticles.length + '篇</span>';
        if (hasRanking && ekChecks2 > 0) {
          html += '<span style="font-size:12px;font-weight:600;color:' + rateColor(ekRate) + ';">' + ekRate + '%</span>';
        }
        html += '</summary>';
        html += '<div style="padding:2px 0 2px 16px;">';

        // 用户问题 + 收录状态
        if (ekRanking.length > 0) {
          for (const qr of ekRanking) {
            const rankedCount = Object.values(qr.platforms).filter(Boolean).length;
            const aiList = Object.entries(qr.platforms).map(([ai, ok]) => rankDot(ok) + ai).join(' ');
            const rowBg = rankedCount === 5 ? '#f0faf4' : rankedCount > 0 ? '#fffbf0' : '#fff5f5';
            html += '<div style="padding:6px 12px;border-radius:6px;margin-bottom:3px;background:' + rowBg + ';">';
            html += '<div style="font-size:13px;">❓ ' + qr.question + '</div>';
            html += '<div style="font-size:11px;color:#888;margin-top:2px;letter-spacing:1px;">' + aiList + '</div>';
            html += '</div>';
          }
        } else if (!hasRanking) {
          html += '<div style="font-size:12px;color:#ccc;padding:8px;">暂无收录监测数据（执行收录检测后自动展示）</div>';
        } else {
          html += '<div style="font-size:12px;color:#ccc;padding:8px;">该拓展词暂无收录监测数据</div>';
        }

        // 文章标题
        html += '<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #e8ecf1;">';
        html += '<div style="font-size:11px;color:#aaa;margin-bottom:4px;">📄 对应文章（' + ekArticles.length + '篇）</div>';
        for (const art of ekArticles) {
          html += '<div style="font-size:12px;padding:4px 10px;margin-bottom:2px;background:#fafbfc;border-radius:4px;border-left:3px solid #4361ee;">';
          html += '<span style="color:#888;">' + (art.contentType || '') + '</span> · ';
          html += '<span style="color:#666;">' + art.title + '</span>';
          html += '</div>';
        }

        // 发布状态
        html += '<div style="margin-top:6px;padding:6px 10px;background:#f8f9fa;border-radius:4px;">';
        html += '<div style="font-size:11px;color:#bbb;">🚀 平台发布：暂无记录（内容发布后在 06_发布记录/ 中登记）</div>';
        html += '</div>';

        html += '</div></details>';
      }
      html += '</div></details>';
    }

    // 链路断点分析（仅有收录数据时展示）
    if (hasRanking) {
      html += '<div style="font-size:16px;font-weight:700;margin:20px 0 12px;">⚠️ 链路断点分析</div>';

      const noRank = Object.values(rankingData).filter(q => Object.values(q.platforms).filter(Boolean).length === 0);
      const lowRank = Object.values(rankingData).filter(q => Object.values(q.platforms).filter(Boolean).length === 1);
      const fullRank = Object.values(rankingData).filter(q => Object.values(q.platforms).filter(Boolean).length === 5);

      // 全平台未上榜
      html += '<details style="margin-bottom:8px;">';
      html += '<summary style="cursor:pointer;font-size:14px;font-weight:600;padding:12px 16px;background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.06);display:flex;align-items:center;gap:8px;list-style:none;">';
      html += '<span>🔴</span><span style="flex:1;">全平台未上榜（0/5）</span>';
      html += '<span style="font-size:12px;font-weight:600;color:#e74c3c;">' + noRank.length + ' 个</span></summary>';
      html += '<div style="padding:4px 0 4px 16px;">';
      if (noRank.length === 0) {
        html += '<div style="font-size:13px;color:#0d9f4f;">🎉 没有全平台未上榜的问题！</div>';
      } else {
        for (const q of noRank) {
          html += '<div style="font-size:13px;padding:4px 0;border-bottom:1px solid #f5f5f5;"><span style="color:#e74c3c;">❌</span> <span style="color:#888;">' + q.tier + '</span> ' + q.question + '</div>';
        }
      }
      html += '</div></details>';

      // 仅1个平台上榜
      html += '<details style="margin-bottom:8px;">';
      html += '<summary style="cursor:pointer;font-size:14px;font-weight:600;padding:12px 16px;background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.06);display:flex;align-items:center;gap:8px;list-style:none;">';
      html += '<span>🟡</span><span style="flex:1;">仅 1 个平台上榜（需重点优化）</span>';
      html += '<span style="font-size:12px;font-weight:600;color:#e67e22;">' + lowRank.length + ' 个</span></summary>';
      html += '<div style="padding:4px 0 4px 16px;">';
      if (lowRank.length === 0) {
        html += '<div style="font-size:13px;color:#0d9f4f;">🎉 没有仅 1 个平台上榜的问题！</div>';
      } else {
        for (const q of lowRank) {
          const rp = Object.entries(q.platforms).find(([k,v]) => v);
          html += '<div style="font-size:13px;padding:4px 0;border-bottom:1px solid #f5f5f5;"><span style="color:#e67e22;">⚠️</span> <span style="color:#888;">' + q.tier + '</span> ' + q.question + ' <span style="color:#0d9f4f;font-weight:500;">✅ ' + (rp ? rp[0] : '') + '</span></div>';
        }
      }
      html += '</div></details>';

      // 全平台上榜
      html += '<details style="margin-bottom:8px;">';
      html += '<summary style="cursor:pointer;font-size:14px;font-weight:600;padding:12px 16px;background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.06);display:flex;align-items:center;gap:8px;list-style:none;">';
      html += '<span>🟢</span><span style="flex:1;">全平台上榜（5/5）— 壁垒已建立</span>';
      html += '<span style="font-size:12px;font-weight:600;color:#0d9f4f;">' + fullRank.length + ' 个</span></summary>';
      html += '<div style="padding:4px 0 4px 16px;">';
      if (fullRank.length === 0) {
        html += '<div style="font-size:13px;color:#888;">暂无全平台上榜的问题</div>';
      } else {
        for (const q of fullRank) {
          html += '<div style="font-size:13px;padding:4px 0;border-bottom:1px solid #f5f5f5;"><span style="color:#0d9f4f;">✅</span> <span style="color:#888;">' + q.tier + '</span> ' + q.question + '</div>';
        }
      }
      html += '</div></details>';
    }

    // 数据源
    html += '<div style="margin-top:20px;padding:14px 18px;background:#f8f9fa;border-radius:10px;">';
    html += '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">📁 数据源（点击跳转）</div>';
    html += '<div style="font-size:12px;color:#666;line-height:2;">';
    html += '📋 [[' + CONFIG.trackingPath + '|内容布局跟踪表]]（核心词 → 拓展词 → 文章标题）<br>';
    if (CONFIG.mappingPath) {
      html += '🔗 [[' + CONFIG.mappingPath + '|关键词映射表]]（拓展词 → 用户问题 → 映射标题）<br>';
    }
    if (CONFIG.rankingPath) {
      html += '🔍 [[' + CONFIG.rankingPath + '|收录排名监测]]（用户问题 → 5个AI平台收录情况）';
    }
    html += '</div></div>';

    dv.paragraph(html);

  } catch(err) {
    dv.paragraph('❌ 仪表盘出错：' + err.message);
  }
})();
