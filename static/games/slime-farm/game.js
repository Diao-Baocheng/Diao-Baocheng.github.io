// 游戏状态 (Game State)
let state = {
    coins: 0,
    gems: 0,
    slime: {
        level: 1,
        exp: 0,
        maxExp: 100,
        type: 'normal',
        name: '果冻史莱姆'
    },
    stamina: {
        current: 10,
        max: 10,
        regenRate: 1000, // 毫秒/点
        lastRegenTime: Date.now()
    },
    upgrades: {
        maxStaminaLvl: 0,
        regenLvl: 0,
        autoLvl: 0
    },
    lastSaveTime: Date.now()
};

// --- 本地存储 (Save/Load) ---
const SAVE_KEY = 'slime_farm_save';

function saveGame() {
    state.lastSaveTime = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function loadGame() {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // 合并默认状态以防版本更新缺字段
            state = { ...state, ...parsed };
            // 修复离线体力恢复
            const now = Date.now();
            const timePassedMs = now - state.stamina.lastRegenTime;
            
            // 离线时间限制 (最大允许 12 小时)
            const MAX_OFFLINE_MS = 12 * 60 * 60 * 1000; 
            const effectiveTimePassed = Math.min(timePassedMs, MAX_OFFLINE_MS);

            const staminaRecovered = Math.floor(effectiveTimePassed / state.stamina.regenRate);
            state.stamina.current = Math.min(state.stamina.max, state.stamina.current + staminaRecovered);
            state.stamina.lastRegenTime = now - (effectiveTimePassed % state.stamina.regenRate);
            
            // 离线自动投喂收益计算
            if (state.upgrades.autoLvl > 0) {
                const idleSeconds = Math.floor(effectiveTimePassed / 1000);
                const idleExp = idleSeconds * (state.upgrades.autoLvl * 5);
                
                // 放置收益也会获取极微量金币 (比如基础每秒获取 autoLvl * 0.05)
                const currentMultiplier = slimeTypes.find(t => t.id === state.slime.type).coinMultiplier;
                const idleCoins = Math.floor(idleSeconds * state.upgrades.autoLvl * currentMultiplier * (state.slime.level * 0.05));

                if (idleExp > 0 || idleCoins > 0) {
                    state.coins += idleCoins;
                    gainExp(idleExp, null, null);
                    
                    const timeStr = effectiveTimePassed === MAX_OFFLINE_MS ? "12 小时 (已达上限)" : `${(idleSeconds/60).toFixed(1)} 分钟`;
                    addLog(`�� 离线了 ${timeStr}。小助手为你赚取了 ${idleExp} 经验和 ${idleCoins} 🪙！`, "rare");
                }
            } else {
                 addLog(`💾 存档已加载！欢迎回来！`, "system");
            }
        } catch (e) {
            console.error("存档加载失败", e);
        }
    }
}

// 史莱姆变异种类 (概率学应用)
const slimeTypes = [
    { id: 'normal', name: '果冻史莱姆', weight: 60, coinMultiplier: 1 },
    { id: 'water', name: '水滴史莱姆', weight: 25, coinMultiplier: 1.5 },
    { id: 'fire', name: '烈焰史莱姆', weight: 10, coinMultiplier: 2.5 },
    { id: 'gold', name: '黄金史莱姆', weight: 5, coinMultiplier: 10 }
];

// DOM 元素引用
const els = {
    coins: document.getElementById('coins'),
    gems: document.getElementById('gems'),
    slime: document.getElementById('slime'),
    slimeName: document.getElementById('slime-name'),
    expText: document.getElementById('exp-text'),
    expFill: document.getElementById('exp-fill'),
    staminaText: document.getElementById('stamina-text'),
    staminaFill: document.getElementById('stamina-fill'),
    btnFeed: document.getElementById('btn-feed'),
    btnAdStamina: document.getElementById('btn-ad-stamina'),
    btnFeedGem: document.getElementById('btn-feed-gem'),
    log: document.getElementById('log'),
    app: document.getElementById('app'),

    // 商店 DOM
    btnBuyMaxStamina: document.getElementById('btn-buy-max-stamina'),
    btnBuyRegen: document.getElementById('btn-buy-regen'),
    btnBuyAuto: document.getElementById('btn-buy-auto'),
    btnReset: document.getElementById('btn-reset'),

    costMaxStamina: document.getElementById('cost-max-stamina'),
    costRegen: document.getElementById('cost-regen'),
    costAuto: document.getElementById('cost-auto'),

    lvlMaxStamina: document.getElementById('lvl-max-stamina'),
    lvlRegen: document.getElementById('lvl-regen'),
    lvlAuto: document.getElementById('lvl-auto'),

    // 导航 DOM
    tabBtns: document.querySelectorAll('.tab-btn'),
    views: document.querySelectorAll('.view')
};

// --- 商店数据配置 ---
const shopData = {
    maxStamina: {
        baseCost: 100,
        costMult: 1.5,
        action: () => {
            state.upgrades.maxStaminaLvl++;
            state.stamina.max += 5;
            state.stamina.current += 5;
        }
    },
    regen: {
        baseCost: 150,
        costMult: 1.8,
        action: () => {
            state.upgrades.regenLvl++;
            state.stamina.regenRate = Math.max(200, state.stamina.regenRate - 100); // 最快 0.2s/点
        }
    },
    auto: {
        baseCost: 500,
        costMult: 2.5,
        action: () => {
            state.upgrades.autoLvl++;
        }
    }
};

function getCost(type) {
    const lvl = state.upgrades[`${type}Lvl`];
    return Math.floor(shopData[type].baseCost * Math.pow(shopData[type].costMult, lvl));
}

function buyUpgrade(type) {
    const cost = getCost(type);
    if (state.coins >= cost) {
        state.coins -= cost;
        shopData[type].action();
        addLog(`🛒 购买成功！`, "rare");
        spawnParticles(window.innerWidth / 2, window.innerHeight / 2, 20, '#2ecc71');
        saveGame();
        updateUI();
    } else {
        addLog(`金币不足！需要 ${cost} 🪙`, "system");
    }
}

// --- 视觉反馈效果 ---
function spawnFloatingText(text, type, x, y) {
    const el = document.createElement('div');
    el.className = `floating-text ${type}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    els.app.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.backgroundColor = color;
        particle.style.width = `${Math.random() * 6 + 4}px`;
        particle.style.height = particle.style.width;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;

        // 随机角度和距离
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 50 + 20;
        particle.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);

        els.app.appendChild(particle);
        setTimeout(() => particle.remove(), 600);
    }
}

// --- 核心逻辑 (循环与概率) ---

// 1. 行为：投喂 (Input)
function feed(e) {
    if (state.stamina.current < 1) {
        addLog("体力不足！", "system");

        // 点击按钮抖动反馈
        els.btnFeed.style.transform = "translateX(-5px)";
        setTimeout(() => els.btnFeed.style.transform = "translateX(5px)", 50);
        setTimeout(() => els.btnFeed.style.transform = "translateX(0)", 100);
        return;
    }

    // 消耗体力
    state.stamina.current -= 1;

    // 基础收益
    const baseExp = 15;
    const currentMultiplier = slimeTypes.find(t => t.id === state.slime.type).coinMultiplier;
    let earnedCoins = Math.floor((Math.random() * 5 + 5) * currentMultiplier * state.slime.level);

    // 视觉与物理反馈
    const rect = els.slime.getBoundingClientRect();
    const clickX = e.clientX || rect.left + rect.width / 2;
    const clickY = e.clientY || rect.top + rect.height / 2;

    els.slime.classList.remove('clicked');
    void els.slime.offsetWidth; // 触发重绘重置动画
    els.slime.classList.add('clicked');

    // 概率事件：暴击掉落钻石 (10% 概率)
    const isCritical = Math.random() < 0.1;
    if (isCritical) {
        state.gems += 1;
        addLog(`✨ 暴击！史莱姆吐出了一颗钻石！`, "critical");
        spawnFloatingText("+1 💎", "crit", clickX, clickY - 40);
        spawnParticles(clickX, clickY, 15, '#e056fd');
    // 自动投喂机逻辑：按秒触发
    const currentSecond = Math.floor(now / 1000);
    const lastSavedSecond = Math.floor(state.lastSaveTime / 1000);
    
    // 如果秒数变更了，并且有自动等级
    if (state.upgrades.autoLvl > 0 && currentSecond > lastSavedSecond) {
        // 每秒基础获取经验
        const expGain = state.upgrades.autoLvl * 5;
        // 每秒获取微量金币
        const currentMultiplier = slimeTypes.find(t => t.id === state.slime.type).coinMultiplier;
        const coinGain = Math.floor(state.upgrades.autoLvl * currentMultiplier * (state.slime.level * 0.05)) || 0; 
        
        state.coins += coinGain;
        gainExp(expGain, null, null);
        
        // 视觉反馈：偶尔冒一个很小的自动粒子气泡，不要太频繁
        if (Math.random() < 0.2) {
             const cx = window.innerWidth / 2;
             const cy = 150; // 近似史莱姆的位置
             spawnFloatingText(`+${expGain} EXP`, "exp", cx - 40 + Math.random()*80, cy - 30);
             if (coinGain > 0 && Math.random() < 0.5) spawnFloatingText(`+${coinGain}`, "", cx - 40 + Math.random()*80, cy - 10);
        }
        
        updateUI();
    }
    
    // 定期存档 (每 10 秒)
    if (now - state.lastSaveTime > 10000) {
        saveGame();
    }
}

// 1.5 行为：高级投喂 (消耗钻石)
function feedGem(e) {
    if (state.gems < 1) {
        addLog("钻石不足！", "system");
        return;
    }

    // 消耗钻石，不需要消耗体力
    state.gems -= 1;

    const baseExp = 100 * state.slime.level; // 巨大的经验收益
    let earnedCoins = 100 * slimeTypes.find(t => t.id === state.slime.type).coinMultiplier * state.slime.level;

    const rect = els.slime.getBoundingClientRect();
    const clickX = e.clientX || rect.left + rect.width / 2;
    const clickY = e.clientY || rect.top + rect.height / 2;

    els.slime.classList.remove('clicked');
    void els.slime.offsetWidth;
    els.slime.classList.add('clicked');

    spawnFloatingText(`巨量收益!`, "gem", clickX, clickY - 40);
    spawnFloatingText(`+${baseExp} EXP`, "exp", clickX, clickY - 20);
    spawnParticles(clickX, clickY, 30, '#9b59b6');

    state.coins += earnedCoins;
    addLog(`💎 使用钻石投喂了豪华大餐！史莱姆非常满足！`, "rare");
    gainExp(baseExp, clickX, clickY);
    updateUI();
}

// 2. 逻辑：经验与升级
function gainExp(amount, x, y) {
    state.slime.exp += amount;

    if (x && y && amount < 50) { // 防止与钻石投喂的文字重叠
        spawnFloatingText(`+${amount} EXP`, "exp", x + 30, y - 10);
    }

    if (state.slime.exp >= state.slime.maxExp) {
        levelUp();
    }
}

// 3. 概率学应用：升级与变异
function levelUp() {
    state.slime.level += 1;
    state.slime.exp -= state.slime.maxExp;
    state.slime.maxExp = Math.floor(state.slime.maxExp * 1.5); // 数值膨胀

    // 满血复活
    state.stamina.max += 2;
    state.stamina.current = state.stamina.max;

    addLog(`🎉 升级了！当前等级 Lv.${state.slime.level}`, "rare");

    // 变异概率判定 (根据权重随机)
    if (state.slime.level % 3 === 0) {
        mutate();
    }
}

function mutate() {
    const totalWeight = slimeTypes.reduce((sum, type) => sum + type.weight, 0);
    let randomNum = Math.random() * totalWeight;

    let newType = slimeTypes[0];
    for (const type of slimeTypes) {
        if (randomNum < type.weight) {
            newType = type;
            break;
        }
        randomNum -= type.weight;
    }

    if (newType.id !== state.slime.type) {
        state.slime.type = newType.id;
        state.slime.name = newType.name;
        addLog(`🧬 基因突变！史莱姆进化成了 ${newType.name}!`, "rare");
    }
}

// 4. 商业化挂钩：看广告恢复体力
function watchAdForStamina() {
    addLog(`📺 正在播放广告...`, "system");
    els.btnAdStamina.disabled = true;
    els.btnAdStamina.textContent = "广告播放中...";

    // 模拟广告播放 (3秒)
    setTimeout(() => {
        state.stamina.current = state.stamina.max;
        addLog(`🎁 广告观看完毕！体力已回满！`, "rare");
        els.btnAdStamina.disabled = false;
        els.btnAdStamina.textContent = "📺 看广告回满体力";
        updateUI();
    }, 3000);
}

// 5. 游戏引擎循环 (Game Loop) - 处理自然恢复
function gameLoop() {
    const now = Date.now();
    // 每 1000ms 恢复 1 点体力 (如果不足最大值)
    if (now - state.stamina.lastRegenTime >= state.stamina.regenRate) {
        if (state.stamina.current < state.stamina.max) {
            state.stamina.current += 1;
            updateUI();
        }
        state.stamina.lastRegenTime = now;
    }

    // 自动投喂机逻辑
    if (state.upgrades.autoLvl > 0 && Math.floor(now / 1000) > Math.floor(state.lastSaveTime / 1000)) {
        gainExp(state.upgrades.autoLvl * 5, null, null);
    }

    // 定期存档 (每 10 秒)
    if (now - state.lastSaveTime > 10000) {
        saveGame();
    }

    requestAnimationFrame(gameLoop);
}

// --- 渲染逻辑 (UI Update) ---
function updateUI() {
    els.coins.textContent = state.coins;
    els.gems.textContent = state.gems;

    els.slimeName.textContent = `${state.slime.name} (Lv.${state.slime.level})`;

    // 更新史莱姆外观样式
    els.slime.className = `slime ${state.slime.type}`;

    els.expText.textContent = `${state.slime.exp} / ${state.slime.maxExp}`;
    els.expFill.style.width = `${(state.slime.exp / state.slime.maxExp) * 100}%`;

    els.staminaText.textContent = `${state.stamina.current} / ${state.stamina.max}`;
    els.staminaFill.style.width = `${(state.stamina.current / state.stamina.max) * 100}%`;

    els.btnFeed.disabled = state.stamina.current < 1;

    // 更新商店 UI
    els.lvlMaxStamina.textContent = `Lv.${state.upgrades.maxStaminaLvl}`;
    els.lvlRegen.textContent = `Lv.${state.upgrades.regenLvl}`;
    els.lvlAuto.textContent = `Lv.${state.upgrades.autoLvl}`;

    els.costMaxStamina.textContent = getCost('maxStamina');
    els.btnBuyMaxStamina.disabled = state.coins < getCost('maxStamina');

    els.costRegen.textContent = getCost('regen');
    els.btnBuyRegen.disabled = state.coins < getCost('regen') || state.upgrades.regenLvl >= 8; // 满级限制

    els.costAuto.textContent = getCost('auto');
    els.btnBuyAuto.disabled = state.coins < getCost('auto');
}

function addLog(text, type = "normal") {
    const logEl = document.createElement('div');
    logEl.className = `log-item ${type}`;
    logEl.textContent = text;
    els.log.insertBefore(logEl, els.log.firstChild);

    // 保持日志数量不过多
    if (els.log.children.length > 20) {
        els.log.removeChild(els.log.lastChild);
    }
}

// --- 事件绑定 ---
els.btnFeed.addEventListener('click', feed);
if (els.btnFeedGem) els.btnFeedGem.addEventListener('click', feedGem);
els.btnAdStamina.addEventListener('click', watchAdForStamina);

// 为史莱姆添加点击互动 (无消耗，仅为了好玩和看动画)
els.slime.addEventListener('click', (e) => {
    els.slime.classList.remove('clicked');
    void els.slime.offsetWidth;
    els.slime.classList.add('clicked');

    spawnParticles(e.clientX, e.clientY, 5, '#8bc34a');

    // 极小概率白嫖掉落金币 (比如 5% 概率摸出 1 个金币)
    if (Math.random() < 0.05) {
        state.coins += 1;
        spawnFloatingText("+1", "", e.clientX, e.clientY - 20);
        updateUI();
    }
});

// 商店绑定
els.btnBuyMaxStamina.addEventListener('click', () => buyUpgrade('maxStamina'));
els.btnBuyRegen.addEventListener('click', () => buyUpgrade('regen'));
els.btnBuyAuto.addEventListener('click', () => buyUpgrade('auto'));

els.btnReset.addEventListener('click', () => {
    if (confirm("确定要清除所有进度重新开始吗？这无法撤销！")) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
});

// 标签页切换逻辑
els.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // 更新按钮状态
        els.tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 更新视图显示
        const targetId = btn.getAttribute('data-target');
        els.views.forEach(v => {
            if (v.id === targetId) {
                v.classList.add('active');
                v.classList.remove('hidden');
            } else {
                v.classList.remove('active');
                v.classList.add('hidden');
            }
        });
    });
});

// 浏览器关闭/隐藏时强制存档
window.addEventListener('beforeunload', saveGame);
window.addEventListener('visibilitychange', () => {
    if (document.hidden) saveGame();
});

// --- 初始化 ---
loadGame(); // 先读取存档
updateUI();
gameLoop();
