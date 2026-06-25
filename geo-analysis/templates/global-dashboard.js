// ============================================================
// GEO 全局管理视图 DataviewJS 模板
// 聚合所有项目的关键指标，支持跨项目对比
// ============================================================
//
// 占位符列表：
//   {{PROJECTS_JSON}}  - JSON 数组，每个项目包含：
//     { name, folder, brandName, brandIcon, projectPath,
//       trackingPath, rankingPath, maturity }

(async () => {
  try {

    // ========== 配置（由技能自动替换） ==========
    const PROJECTS = {{PROJECTS_JSON}};

    // ========== 解析函数 ==========

    function parseTable(content, headerText) {
      const lines = content.split('\n');
      let start = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(headerText)) { start = i; break; }
      }
      if (start < 0) return [];
      const rows = [];
      for (let i = start; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('|') || line.includes('---')) continue;
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        if (cells[0] && isNaN(parseInt(cells[0]))) continue;
        rows.push(cells);
      }
      return rows;
    }

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

    // ========== 采集各项目数据 ==========
    const projectData = [];
    let totalArticlesAll = 0, totalContentFilesAll = 0, totalRankedAll = 0, totalChecksAll = 0;

    for (const proj of PROJECTS) {
      const data = {
        name: proj.name,
        folder: proj.folder,
        brandName: proj.brandName,
        brandIcon: proj.brandIcon,
        projectPath: proj.projectPath,
        maturity: proj.maturity,
        articleCount: 0,
        contentFileCount: 0,
        questionCount: 0,
        rankingRate: null,
        coreKwCount: 0,
        expandedKwCount: 0,
        platformRates: { 'DeepSeek': null, '豆包': null, '元宝': null, '千问': null, '文心': null },
        rankingPath: proj.rankingPath,
        trackingPath: proj.trackingPath
      };

      // 读取跟踪表
      try {
        const rawTrack = await dv.io.load(proj.trackingPath);
        if (rawTrack) {
          const rows = parseTable(rawTrack, '| 序号');
          data.articleCount = rows.length;
          totalArticlesAll += rows.length;

          // 统计核心词和拓展词
          const coreKws = new Set();
          const expKws = new Set();
          for (const r of rows) {
            coreKws.add(r[1] || '未分类');
            expKws.add(r[2] || '未分类');
          }
          data.coreKwCount = coreKws.size;
          data.expandedKwCount = expKws.size;
        }
      } catch(e) {}

      // 统计内容文件
      const contentBasePath = proj.projectPath + '/04_内容创作';
      const allFiles = app.vault.getFiles();
      const contentFiles = allFiles.filter(f =>
        f.path.startsWith(contentBasePath) && f.extension === 'md'
      );
      data.contentFileCount = contentFiles.length;
      totalContentFilesAll += contentFiles.length;

      // 读取收录监测
      try {
        if (proj.rankingPath) {
          const rawRanking = await dv.io.load(proj.rankingPath);
          if (rawRanking) {
            const ranking = parseRanking(rawRanking);
            data.questionCount = Object.keys(ranking).length;
            let checks = 0, ranked = 0;
            for (const q of Object.values(ranking)) {
              for (const v of Object.values(q.platforms)) {
                checks++;
                if (v) ranked++;
              }
            }
            data.rankingRate = checks > 0 ? Math.round(ranked / checks * 100) : 0;
            totalRankedAll += ranked;
            totalChecksAll += checks;

            // 各平台率
            const pKeys = ['DeepSeek', '豆包', '元宝', '千问', '文心'];
            for (const pk of pKeys) {
              const pRanked = Object.values(ranking).filter(q => q.platforms[pk]).length;
              const pTotal = Object.keys(ranking).length;
              data.platformRates[pk] = pTotal > 0 ? Math.round(pRanked / pTotal * 100) : 0;
            }
          }
        }
      } catch(e) {}

      projectData.push(data);
    }

    const avgRate = totalChecksAll > 0 ? Math.round(totalRankedAll / totalChecksAll * 100) : 0;

    // ========== 样式工具 ==========
    const card = 'style="background:#fff;border-radius:12px;padding:16px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.06);margin-bottom:14px;"';
    const rateColor = r => r === null ? '#ccc' : r >= 60 ? '#0d9f4f' : r >= 30 ? '#e67e22' : '#e74c3c';
    const maturityBadge = m => m === 'advanced' ? '🟢 成熟' : m === 'mid' ? '🟡 中期' : '⚪ 早期';

    // ========== 渲染 ==========
    let html = '';

    // 标题
    html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">';
    html += '<span style="font-size:36px;">🌐</span>';
    html += '<div>';
    html += '<div style="font-size:22px;font-weight:700;">GEO 多项目全局管理视图</div>';
    html += '<div style="font-size:13px;color:#888;margin-top:4px;">跨项目对比 · 全链路进度监控 · 一目了然</div>';
    html += '</div></div>';

    // 总览卡片
    html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px;">';
    const summaryCards = [
      ['项目总数', PROJECTS.length, '#4361ee', '个品牌'],
      ['文章标题', totalArticlesAll, '#0d9f4f', '篇'],
      ['内容文件', totalContentFilesAll, '#6c5ce7', '篇'],
      ['平均收录率', avgRate + '%', rateColor(avgRate), '5个平台'],
      ['收录问题', projectData.reduce((s,p) => s + p.questionCount, 0), '#e67e22', '个监测']
    ];
    for (const [label, value, color, sub] of summaryCards) {
      html += '<div ' + card + '>';
      html += '<div style="font-size:12px;color:#888;margin-bottom:4px;">' + label + '</div>';
      html += '<div style="font-size:24px;font-weight:700;color:' + color + ';">' + value + '</div>';
      html += '<div style="font-size:11px;color:#aaa;margin-top:2px;">' + sub + '</div>';
      html += '</div>';
    }
    html += '</div>';

    // 各项目对比卡片
    html += '<div style="font-size:16px;font-weight:700;margin:20px 0 12px;">📊 项目对比总览</div>';

    for (const proj of projectData) {
      const completionRate = proj.articleCount > 0 ? Math.round(proj.contentFileCount / proj.articleCount * 100) : 0;
      const dashboardLink = proj.projectPath + '/仪表盘';

      html += '<details style="margin-bottom:10px;">';
      html += '<summary style="cursor:pointer;font-size:15px;font-weight:600;padding:14px 18px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06);display:flex;align-items:center;gap:12px;list-style:none;">';
      html += '<span style="font-size:24px;">' + proj.brandIcon + '</span>';
      html += '<div style="flex:1;">';
      html += '<div style="font-size:15px;font-weight:600;">' + proj.brandName + '</div>';
      html += '<div style="font-size:11px;color:#888;margin-top:2px;">' + proj.coreKwCount + '个核心词 · ' + proj.expandedKwCount + '个拓展词 · ' + maturityBadge(proj.maturity) + '</div>';
      html += '</div>';

      // 关键指标
      html += '<div style="display:flex;gap:16px;align-items:center;">';
      html += '<div style="text-align:center;"><div style="font-size:10px;color:#888;">文章</div><div style="font-size:16px;font-weight:700;color:#0d9f4f;">' + proj.contentFileCount + '/' + proj.articleCount + '</div></div>';
      if (proj.rankingRate !== null) {
        html += '<div style="text-align:center;"><div style="font-size:10px;color:#888;">收录率</div><div style="font-size:16px;font-weight:700;color:' + rateColor(proj.rankingRate) + ';">' + proj.rankingRate + '%</div></div>';
      }
      html += '</div>';
      html += '</summary>';

      html += '<div style="padding:12px 16px;">';

      // 流水线进度条
      html += '<div style="font-size:12px;color:#888;margin-bottom:8px;">🔄 全链路进度</div>';
      html += '<div style="display:flex;align-items:center;gap:4px;margin-bottom:14px;">';
      const steps = [
        { label: '核心词', ok: proj.coreKwCount > 0 },
        { label: '拓展词', ok: proj.expandedKwCount > 0 },
        { label: '用户问题', ok: proj.questionCount > 0 },
        { label: '文章标题', ok: proj.articleCount > 0 },
        { label: '内容创作', ok: proj.contentFileCount >= proj.articleCount && proj.articleCount > 0 },
        { label: '平台发布', ok: false },
        { label: 'AI收录', ok: proj.rankingRate !== null && proj.rankingRate > 0 }
      ];
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const bg = s.ok ? '#f0faf4' : '#f5f5f5';
        const border = s.ok ? '#0d9f4f' : '#ddd';
        const color = s.ok ? '#0d9f4f' : '#ccc';
        html += '<div style="flex-shrink:0;text-align:center;padding:6px 8px;background:' + bg + ';border:1.5px solid ' + border + ';border-radius:6px;min-width:60px;">';
        html += '<div style="font-size:10px;color:' + color + ';">' + (s.ok ? '✅' : '⬜') + ' ' + s.label + '</div>';
        html += '</div>';
        if (i < steps.length - 1) html += '<span style="color:#ddd;font-size:10px;">→</span>';
      }
      html += '</div>';

      // AI 平台详情（有收录数据时）
      if (proj.rankingRate !== null) {
        html += '<div style="font-size:12px;color:#888;margin-bottom:6px;">🔍 各平台收录率</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:12px;">';
        for (const [pk, rate] of Object.entries(proj.platformRates)) {
          html += '<div style="text-align:center;padding:4px;background:#f8f9fa;border-radius:4px;">';
          html += '<div style="font-size:10px;color:#888;">' + pk + '</div>';
          html += '<div style="font-size:14px;font-weight:700;color:' + rateColor(rate) + ';">' + rate + '%</div>';
          html += '</div>';
        }
        html += '</div>';
      }

      // 跳转链接
      html += '<div style="font-size:12px;padding:8px 12px;background:#f0f4ff;border-radius:6px;">';
      html += '📂 [[' + dashboardLink + '|打开项目仪表盘 →]]';
      html += '</div>';

      html += '</div></details>';
    }

    // 快速操作
    html += '<div style="margin-top:20px;padding:14px 18px;background:#f8f9fa;border-radius:10px;">';
    html += '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">🚀 快速操作</div>';
    html += '<div style="font-size:12px;color:#666;line-height:2;">';
    html += '• <code>/geo-project-dashboard --project 示例品牌B --action create</code> — 创建/更新示例品牌B仪表盘<br>';
    html += '• <code>/geo-project-dashboard --project 示例品牌A --action create</code> — 创建/更新示例品牌A仪表盘<br>';
    html += '• <code>/geo-project-dashboard --project 示例品牌C --action create</code> — 创建/更新示例品牌C仪表盘<br>';
    html += '• <code>/geo-project-dashboard --action global</code> — 刷新全局视图';
    html += '</div></div>';

    dv.paragraph(html);

  } catch(err) {
    dv.paragraph('❌ 全局视图出错：' + err.message);
  }
})();
