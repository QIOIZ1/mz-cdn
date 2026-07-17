// ==UserScript==
// @name 羊羊得意
// @namespace http://tampermonkey.net/
// @version 5.2.7
// @description 小🐏向前冲
// @author 🐏
// @match *://avg.163.com/me/edit
// @match *://wap.avg.163.com/me/edit
// @match *://avg.163.com/enginejs/index.html*
// @match *://avg.163.com/engine/index.html*
// @match *://wap.avg.163.com/enginejs/index.html*
// @match *://wap.avg.163.com/engine/index.html*
// @match *://avg.163.com/game/detail/*
// @match *://wap.avg.163.com/game/detail/*
// @match *://avg.163.com/debugPlayer.html*
// @match *://wap.avg.163.com/debugPlayer.html*
// @icon https://www.google.com/s2/favicons?sz=64&domain=163.com
// @grant unsafeWindow
// @grant GM_getValue
// @grant GM_setValue
// @updateURL   https://cdn.jsdelivr.net/gh/QIOIZ1/mz-cdn@main/ycy-km.meta.js
// @downloadURL https://cdn.jsdelivr.net/gh/QIOIZ1/mz-cdn@main/ycy-km.user.js
// @run-at document-start
// ==/UserScript==

(function() {
    "use strict";

    if (typeof unsafeWindow === 'undefined') {
        window.unsafeWindow = window;
    }

    // ==========================================
    // 0. 最早注入：劫持 Proxy 构造函数（必须在游戏脚本加载前执行）
    // ==========================================
    const origProxy = unsafeWindow.Proxy;
    const ycyProxyTypeMap = new WeakMap();
    const ycyProxyTargetMap = new WeakMap();

    unsafeWindow.Proxy = function(target, handler) {
        if (handler && typeof handler === 'object') {
            const origGet = handler.get;
            if (origGet) {
                handler.get = function(obj, prop, receiver) {
                    try {
                        if (unsafeWindow.$jksj && typeof prop === 'string' && !prop.startsWith('_') && prop !== 'constructor' && prop !== 'prototype' && prop !== 'then' && prop !== 'Symbol' && prop !== 'length' && prop !== 'toString' && prop !== 'valueOf') {
                            let type = '';
                            if (ycyProxyTypeMap.has(receiver)) {
                                type = ycyProxyTypeMap.get(receiver);
                            } else if (unsafeWindow.ac) {
                                if (unsafeWindow.ac.var === receiver) type = 'var';
                                else if (unsafeWindow.ac.arr === receiver) type = 'arr';
                                else if (unsafeWindow.ac.cVar === receiver) type = 'cVar';
                                else if (unsafeWindow.ac.cArr === receiver) type = 'cArr';
                                if (type) ycyProxyTypeMap.set(receiver, type);
                            }
                            if (type) {
                                try { unsafeWindow.$jkddsj[`ac.${type}['${prop}']`] = true; } catch(e) {}
                            }
                        }
                    } catch(e) {}
                    return origGet.call(this, obj, prop, receiver);
                };
            }
            const result = new origProxy(target, handler);
            ycyProxyTargetMap.set(result, target);
            return result;
        }
        return new origProxy(target, handler);
    };
    unsafeWindow.Proxy.revocable = origProxy.revocable;

    // ==========================================
    // 1. 常量与配置
    // ==========================================
    const CONSTANTS = {
        COLORS: ["#4a7c59", "#5d8a6b", "#6fa07d", "#83b48f", "#9cc5a4", "#b5d5bb", "#5a7a9c", "#6b8cb0", "#7c9ec4", "#8a6d9c", "#9a7db0", "#a86464", "#b87769", "#c88a6e", "#d89d74", "#e0b088", "#e5c3a0", "#ead6b8", "#2d2d2d", "#5a5a5a", "#8c8c8c", "#f2f2f2"],
        MZ_FALLBACK_URL: "https://cdn.jsdelivr.net/gh/QIOIZ1/mz-cdn@main/game.min.js"
    };

    // ==========================================
    // 2. 工具函数 (Utils)
    // ==========================================
    const Utils = {
        hexToRgbComponents: (hex) => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) }),
        positionDropdown: (btn, dropdown) => {
            if (!btn || !dropdown) return;
            const tool = document.getElementById("gmtool");
            if (!tool) return;
            const btnRect = btn.getBoundingClientRect();
            const toolRect = tool.getBoundingClientRect();
            const left = btnRect.left - toolRect.left;
            const top = btnRect.bottom - toolRect.top + 5;
            dropdown.style.left = left + "px";
            dropdown.style.top = top + "px";
            dropdown.style.transform = "none";
        },
        closeAllDropdowns: () => document.querySelectorAll('.dropdown-panel').forEach(el => el.style.display = 'none')
    };

    // ==========================================
    // 4. UI 模板与逻辑 (UIManager) - 易次元专用
    // ==========================================
    const UITemplates = {
        getColorPickerHtml: () => CONSTANTS.COLORS.map(c => `<div class="cp-color" data-color="${c}" style="background:${c};"></div>`).join(""),
        getHeader: () => `
            <div style="width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;padding:0 calc(1vh * var(--panel-scale)) 0 calc(2vh * var(--panel-scale));height:calc(6vh * var(--panel-scale));min-height:calc(6vh * var(--panel-scale));background:var(--theme-header);border-bottom:1px solid var(--theme-border);border-radius:20px 20px 0 0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);" id="toolHeader">
                <div style="flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:calc(2.5vh * var(--panel-scale));color:#fff;font-weight:600;text-shadow:0 2px 6px rgba(0,0,0,0.25);letter-spacing:1px;">🐑 羊羊得意</div>
                <div style="flex:0 0 auto;display:flex;align-items:center;gap:calc(0.8vh * var(--panel-scale));">
                    <div id="minimize" style="flex:0 0 auto;width:calc(4vh * var(--panel-scale));height:calc(4vh * var(--panel-scale));min-width:24px;min-height:24px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;font-size:calc(2.4vh * var(--panel-scale));background:rgba(255,255,255,0.12);transition:all 0.2s;box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);">−</div>
                    <div id="maximize" style="flex:0 0 auto;width:calc(4vh * var(--panel-scale));height:calc(4vh * var(--panel-scale));min-width:24px;min-height:24px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;font-size:calc(2vh * var(--panel-scale));background:rgba(255,255,255,0.12);transition:all 0.2s;box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);">⛶</div>
                    <div id="关" style="flex:0 0 auto;width:calc(4vh * var(--panel-scale));height:calc(4vh * var(--panel-scale));min-width:24px;min-height:24px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;font-size:calc(2.4vh * var(--panel-scale));background:rgba(185,74,72,0.55);transition:all 0.2s;box-shadow:inset 0 1px 0 rgba(255,255,255,0.15);">✕</div>
                </div>
            </div>`,
        getSidebar: () => `
            <div style="width:calc(14vh * var(--panel-scale));background: var(--theme-sidebar);display:flex;flex-direction:column;padding:calc(1.5vh * var(--panel-scale)) calc(0.8vh * var(--panel-scale));border-right:1px solid var(--theme-border);">
                <div class="theme-sidebar-item active" id="主页Btn">🏠 主页</div>
                <div class="theme-sidebar-item" id="batchModifyBtn">✏️ 一键修改</div>
                <div class="theme-sidebar-item" id="一键检测Btn">🔍 一键检测</div>
                <div class="theme-sidebar-item" id="clearSave">🗑️ 清除存档</div>
                <div class="theme-sidebar-item" id="downloadCode">📥 下载代码</div>
                <div style="flex:1;"></div>
                <div class="theme-sidebar-item" style="border-top:1px solid var(--theme-border);padding-top:calc(1.5vh * var(--panel-scale));margin-top:calc(1vh * var(--panel-scale));" id="settings">⚙️ 系统设置</div>
            </div>`,
        getTopbar: () => `
            <div style="display:flex;align-items:center;gap:calc(1.5vh * var(--panel-scale));padding:calc(1.2vh * var(--panel-scale)) calc(1.5vh * var(--panel-scale));background:var(--theme-item);border-bottom:1px solid var(--theme-border);">
                <div style="display:flex;align-items:center;"><div style="color:rgba(255,255,255,0.8);font-size:calc(2vh * var(--panel-scale));margin-right:calc(0.8vh * var(--panel-scale));">类型</div><div class="theme-select dropdown-trigger" data-target="typeShow" id="type" style="display:flex;align-items:center;justify-content:center;width:calc(12vh * var(--panel-scale));">-类型-</div></div>
                <div style="display:flex;align-items:center;"><div style="color:rgba(255,255,255,0.8);font-size:calc(2vh * var(--panel-scale));margin-right:calc(0.8vh * var(--panel-scale));">分组</div><div class="theme-select dropdown-trigger" data-target="fenZu" id="selectFenZu" style="display:flex;align-items:center;justify-content:center;width:calc(12vh * var(--panel-scale));">-分组-</div></div>
                <div style="display:flex;align-items:center;"><div style="color:rgba(255,255,255,0.8);font-size:calc(2vh * var(--panel-scale));margin-right:calc(0.8vh * var(--panel-scale));">数据</div><div class="theme-select dropdown-trigger" data-target="dataList" id="selectData" style="display:flex;align-items:center;justify-content:center;width:calc(18vh * var(--panel-scale));">-数据-</div></div>
                <div style="flex:1;"></div>
                <input id="_str" class="theme-input" style="width:calc(20vh * var(--panel-scale));" placeholder="🔍 搜索内容...">
                <div class="theme-btn" style="width:calc(9vh * var(--panel-scale));height:calc(4.2vh * var(--panel-scale));font-size:calc(2vh * var(--panel-scale));" id="sousuo">搜索</div>
            </div>`,
        getRightbar: () => `
            <div style="width:calc(16vh * var(--panel-scale));padding:calc(1.2vh * var(--panel-scale));display:flex;flex-direction:column;gap:calc(1vh * var(--panel-scale));background:var(--theme-bg);border-left:1px solid var(--theme-border);">
                <div class="theme-btn" id="clear">🗑️ 清空代码</div>
                <div class="theme-btn run-btn" id="run">▶️ 运行代码</div>
                <div class="theme-btn" id="jksj2">📊 监控数据</div>
                <div class="theme-btn" id="dqjq2">📖 读取剧情</div>
            </div>`,
        getEditorArea: () => `
            <div style="flex:1;padding:calc(1.5vh * var(--panel-scale));display:flex;flex-direction:column;overflow:hidden;background:var(--theme-bg);">
                <textarea id="textarea" placeholder="✨ 在这里输入或修改代码数据~" style="flex:1;padding:calc(1.8vh * var(--panel-scale));resize:none;outline:none;font-size:calc(2.2vh * var(--panel-scale));line-height:1.6;letter-spacing:0.3px;"></textarea>
            </div>`,
        getFooter: () => `
            <div style="display:flex;align-items:center;padding:calc(0.8vh * var(--panel-scale)) calc(2vh * var(--panel-scale));height:calc(4.5vh * var(--panel-scale));background:var(--theme-header);border-top:1px solid var(--theme-border);border-radius:0 0 20px 20px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.05);">
                <div style="display:flex;align-items:center;gap:calc(1vh * var(--panel-scale));">
                    <div style="width:calc(1.3vh * var(--panel-scale));height:calc(1.3vh * var(--panel-scale));border-radius:50%;background:#86c896;box-shadow:0 0 10px #86c896;animation:pulse 2s infinite;"></div>
                    <div style="color:rgba(255,255,255,0.78);font-size:calc(1.8vh * var(--panel-scale));font-weight:500;">系统正常运行中</div>
                </div>
            </div>`,
        getSettingsPanel: () => `
            <div style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--theme-bg);border:1px solid var(--theme-border);border-radius:16px;padding:18px 16px;width:260px;max-width:92vw;z-index:99999;box-shadow:0 20px 60px rgba(0,0,0,0.6);backdrop-filter:blur(25px);font-family:'Microsoft YaHei',Arial,sans-serif;" id="settingsPanel">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--theme-border);">
                    <div style="color:#fff;font-size:15px;font-weight:700;letter-spacing:1px;">⚙️ 系统设置</div>
                    <div style="width:26px;height:26px;border-radius:8px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);cursor:pointer;font-size:14px;transition:all 0.2s;" id="closeSettings">✕</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:10px;background:var(--theme-item);border:1px solid var(--theme-border);">
                        <span style="color:rgba(255,255,255,0.85);font-size:13px;font-weight:600;">🎨 主题颜色</span>
                        <div id="bgColorBtn" class="dropdown-trigger" data-target="colorPicker" style="height:28px;width:60px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.4);cursor:pointer;background-color:var(--theme-base);box-shadow:0 2px 8px rgba(0,0,0,0.2);transition:transform 0.2s;"></div>
                    </div>
                    <div style="padding:8px 12px;border-radius:10px;background:var(--theme-item);border:1px solid var(--theme-border);">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;"><span style="color:rgba(255,255,255,0.85);font-size:13px;font-weight:600;">👁️ 不透明度</span><span style="color:#fff;font-size:12px;font-weight:600;background:var(--theme-base);padding:2px 8px;border-radius:5px;" id="opacityLabel">100%</span></div>
                        <input type="range" id="bgOpacity" min="0.3" max="1" step="0.05" value="1" style="width:100%;accent-color:var(--theme-base);cursor:pointer;">
                    </div>
                    <div style="padding:8px 12px;border-radius:10px;background:var(--theme-item);border:1px solid var(--theme-border);">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;"><span style="color:rgba(255,255,255,0.85);font-size:13px;font-weight:600;">📐 界面缩放</span><span style="color:#fff;font-size:12px;font-weight:600;background:var(--theme-base);padding:2px 8px;border-radius:5px;" id="scaleLabel">100%</span></div>
                        <input type="range" id="panelScaleSlider" min="0.5" max="1.8" step="0.05" value="1" style="width:100%;accent-color:var(--theme-base);cursor:pointer;">
                    </div>
                </div>
            </div>`,
        getColorPicker: () => `<div id="colorPicker" class="dropdown-panel" data-dropdown="true" style="display:none;background:var(--theme-bg);border:1px solid var(--theme-border);border-radius:16px;padding:calc(1.8vh * var(--panel-scale));grid-template-columns:repeat(6,1fr);gap:calc(1.2vh * var(--panel-scale));backdrop-filter:blur(30px) saturate(140%);box-shadow:0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15);width:fit-content;max-width:90%;">${UITemplates.getColorPickerHtml()}</div>`,
        getYiCiYuanDropdowns: (isEngineJs) => `
            <div id="typeShow" class="dropdown-panel" style="width:calc(16vh * var(--panel-scale));border:1px solid var(--theme-border);z-index:99999;color:#fff;font-size:calc(2.2vh * var(--panel-scale));background:var(--theme-bg);display:none;flex-direction:column;border-radius:12px;overflow:hidden;backdrop-filter:blur(20px);box-shadow:0 10px 30px rgba(0,0,0,0.4);">
                ${isEngineJs ? `<div data-type="var" class="type-opt theme-sidebar-item" style="border-radius:0;margin:0;padding:calc(1.5vh * var(--panel-scale));">var</div><div data-type="arr" class="type-opt theme-sidebar-item" style="border-radius:0;margin:0;padding:calc(1.5vh * var(--panel-scale));">arr</div><div data-type="cVar" class="type-opt theme-sidebar-item" style="border-radius:0;margin:0;padding:calc(1.5vh * var(--panel-scale));">cVar</div><div data-type="cArr" class="type-opt theme-sidebar-item" style="border-radius:0;margin:0;padding:calc(1.5vh * var(--panel-scale));">cArr</div>` : `<div data-type="all" class="type-opt theme-sidebar-item" style="border-radius:0;margin:0;padding:calc(1.5vh * var(--panel-scale));">全部</div>`}
            </div>
            <div id="fenZu" class="dropdown-panel" style="flex-direction:column;background:var(--theme-bg);color:#fff;font-size:calc(2.2vh * var(--panel-scale));border:1px solid var(--theme-border);border-radius:12px;width:calc(16vh * var(--panel-scale));z-index:99999;overflow-y:auto;max-height:60vh;display:none;backdrop-filter:blur(20px);box-shadow:0 10px 30px rgba(0,0,0,0.4);"></div>
            <div id="dataList" class="dropdown-panel" style="color:#fff;width:calc(32vh * var(--panel-scale));font-size:calc(2.2vh * var(--panel-scale));max-height:60vh;display:none;align-items:flex-start;justify-content:flex-start;z-index:99999;border:1px solid var(--theme-border);background:var(--theme-bg);flex-direction:column;overflow-y:auto;border-radius:12px;backdrop-filter:blur(20px);box-shadow:0 10px 30px rgba(0,0,0,0.4);padding:calc(1vh * var(--panel-scale)) 0;"></div>`,
        getLayout: (isEngineJs) => `${UITemplates.getHeader()}<div style="display:flex;width:100%;height:calc(100% - calc(10.5vh * var(--panel-scale)));">${UITemplates.getSidebar()}<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">${UITemplates.getTopbar()}<div style="display:flex;flex:1;overflow:hidden;">${UITemplates.getEditorArea()}${UITemplates.getRightbar()}</div></div></div>${UITemplates.getFooter()}${UITemplates.getSettingsPanel()}${UITemplates.getColorPicker()}${UITemplates.getYiCiYuanDropdowns(isEngineJs)}`
    };

    const UIManager = {
        currentColor: "#4a7c59",
        init: (htmlTemplate) => { UIManager.injectCSS(); UIManager.injectHTML(htmlTemplate); UIManager.bindBaseEvents(); UIManager.bindDragDrop(); },
        injectCSS: () => {
            const meta = document.querySelector('meta[name="viewport"]');
            if (meta) meta.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover");
            else { const m = document.createElement("meta"); m.name = "viewport"; m.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"; document.head.appendChild(m); }
            const style = document.createElement("style");
            style.textContent = `
                :root { --theme-base: #4a7c59; --theme-bg: rgba(26,58,42,0.95); --theme-header: rgba(30,65,45,0.98); --theme-sidebar: rgba(35,75,50,0.95); --theme-border: rgba(100,150,120,0.25); --theme-item: rgba(255,255,255,0.08); --theme-editor: rgba(36,85,55,0.85); --theme-btn-bg: linear-gradient(135deg,rgba(74,124,89,0.85) 0%,rgba(50,95,68,0.9) 100%); --theme-btn-hover: linear-gradient(135deg,rgba(86,140,102,0.9) 0%,rgba(60,110,80,0.95) 100%); --theme-btn-border: rgba(100,150,120,0.3); --theme-btn-run: linear-gradient(135deg,rgba(90,155,110,0.92) 0%,rgba(55,105,75,0.96) 100%); --theme-btn-run-border: rgba(120,180,140,0.5); }
                #gmtool { display:none; --panel-scale: 1; --u: calc(1vh * var(--panel-scale)); }
                #gmtool * { white-space:nowrap; touch-action:manipulation; }
                #gmtool textarea { white-space:pre-wrap; }
                ::placeholder { color:rgba(255,255,255,0.7); opacity:1; }
                .theme-btn { width:100%;height:calc(5vh * var(--panel-scale));background:var(--theme-btn-bg);color:#fff;border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:calc(2.3vh * var(--panel-scale));border:1px solid var(--theme-btn-border);box-shadow:0 3px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15);transition:all 0.25s;user-select:none; }
                .theme-btn:hover { transform:translateY(-2px);box-shadow:0 5px 15px rgba(0,0,0,0.3);background:var(--theme-btn-hover); }
                .theme-btn:active { transform:translateY(1px);box-shadow:0 2px 6px rgba(0,0,0,0.2); }
                .theme-btn.run-btn { background:var(--theme-btn-run);border-color:var(--theme-btn-run-border);box-shadow:0 4px 14px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2); }
                .theme-select { height:calc(4vh * var(--panel-scale));background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.95);border:1px solid rgba(100,150,120,0.3);border-radius:10px;font-size:calc(2vh * var(--panel-scale));padding:0 calc(0.8vh * var(--panel-scale));cursor:pointer;outline:none;transition:all 0.2s; }
                .theme-select:hover { background:rgba(255,255,255,0.12);border-color:rgba(120,180,140,0.4); }
                .theme-select option { background:rgba(26,58,42,0.98);color:#fff; }
                .theme-sidebar-item { color:rgba(255,255,255,0.85);font-size:calc(2.3vh * var(--panel-scale));text-align:center;padding:calc(1.2vh * var(--panel-scale)) calc(0.5vh * var(--panel-scale));border-radius:10px;margin-bottom:calc(0.6vh * var(--panel-scale));cursor:pointer;display:flex;align-items:center;justify-content:center;gap:calc(0.5vh * var(--panel-scale));transition:all 0.25s;user-select:none;white-space:nowrap;border:1px solid transparent; }
                .theme-sidebar-item:hover { background:var(--theme-item);color:#fff;transform:translateX(2px);border-color:var(--theme-border); }
                .theme-sidebar-item.active { background:var(--theme-item);color:#fff;border:1px solid var(--theme-border);box-shadow:inset 0 1px 0 rgba(255,255,255,0.1); }
                .theme-input { height:calc(4vh * var(--panel-scale));background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.95);border:1px solid rgba(100,150,120,0.3);border-radius:10px;font-size:calc(2vh * var(--panel-scale));padding:0 calc(1vh * var(--panel-scale));outline:none;transition:all 0.2s; }
                .theme-input:focus { background:rgba(255,255,255,0.12);border-color:rgba(120,180,140,0.5);box-shadow:0 0 0 3px rgba(74,124,89,0.3); }
                .cp-color { width:calc(4.2vh * var(--panel-scale));height:calc(4.2vh * var(--panel-scale));border-radius:50%;cursor:pointer;border:2px solid rgba(255,255,255,0.3);transition:all 0.25s;box-shadow:0 2px 6px rgba(0,0,0,0.2); }
                .cp-color:hover { transform:scale(1.15);border-color:rgba(255,255,255,0.6);box-shadow:0 4px 10px rgba(0,0,0,0.3); }
                #gmtool textarea::-webkit-scrollbar { width:6px;height:6px; }
                #gmtool textarea::-webkit-scrollbar-track { background:rgba(0,0,0,0.2);border-radius:3px; }
                #gmtool textarea::-webkit-scrollbar-thumb { background:rgba(100,150,120,0.5);border-radius:3px; }
                #gmtool textarea::-webkit-scrollbar-thumb:hover { background:rgba(120,180,140,0.7); }
                #gmtool textarea, #gmtool #textarea { background:var(--theme-editor) !important;color:rgba(255,255,255,0.95) !important;border:1px solid var(--theme-border) !important;border-radius:10px !important; }
            `;
            document.head.appendChild(style);
        },
        injectHTML: (htmlTemplate) => {
            const tool = document.createElement("div");
            tool.id = "gmtool";
            tool.style.cssText = "position:fixed;width:70vw;max-width:80vw;height:75vh;max-height:85vh;top:50%;left:50%;display:none;flex-direction:column;background:var(--theme-bg);border-radius:20px;box-shadow:0 25px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1);backdrop-filter:blur(20px);transform:translate(-50%,-50%);z-index:999;overflow:hidden;border:1px solid var(--theme-border);touch-action:manipulation;";
            tool.innerHTML = htmlTemplate;
            document.body.appendChild(tool);
            const btnContainer = document.createElement("div");
            btnContainer.style.cssText = "position:fixed;width:7vh;height:7vh;left:1vh;top:1vh;display:flex;justify-content:center;align-items:center;font-size:4vh;background:rgba(255,255,255,0.2);backdrop-filter:blur(8px);color:#fff;border-radius:15px;box-shadow:0 4px 12px rgba(0,0,0,0.2);border:2px solid rgba(255,255,255,0.4);cursor:pointer;z-index:1000;user-select:none;touch-action:manipulation;";
            btnContainer.textContent = "🐑";
            btnContainer.id = "on";
            document.body.appendChild(btnContainer);
            const dropdowns = ["typeShow", "fenZu", "dataList", "colorPicker", "settingsPanel"];
            dropdowns.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.position = "absolute";
                    el.style.zIndex = id === "colorPicker" ? "100001" : "10000";
                    tool.appendChild(el);
                }
            });
        },
        bindBaseEvents: () => {
            const qs = s => document.querySelector(s);
            const tool = qs("#gmtool");
            const openBtn = qs("#on");
            const getUserScale = () => GM_getValue("ycy_scale", 1);
            const setPanelScale = () => {
                if (!tool) return;
                if (tool.dataset.minimized === "true") {
                    const r = tool.getBoundingClientRect();
                    const baseH = window.innerHeight * 0.8;
                    const scale = Math.max(0.4, Math.min(1.2, r.height / baseH));
                    tool.style.setProperty("--panel-scale", scale);
                } else {
                    tool.style.setProperty("--panel-scale", getUserScale());
                }
            };
            if (openBtn) openBtn.onclick = () => { tool.style.display = tool.style.display === "flex" ? "none" : "flex"; setPanelScale(); };
            qs("#关").onclick = () => tool.style.display = "none";
            qs("#minimize").onclick = () => {
                if (tool.style.display === "none") tool.style.display = "flex";
                else if (tool.dataset.minimized === "true") {
                    Object.assign(tool.style, { width: "75vw", maxWidth: "85vw", height: "70vh", maxHeight: "80vh", top: "50%", left: "50%", transform: "translate(-50%, -50%)", resize: "none", overflow: "visible" });
                    tool.dataset.minimized = "false";
                    qs("#resizeHandle").remove();
                    tool.style.setProperty("--panel-scale", getUserScale());
                } else {
                    const vh = window.innerHeight, vw = window.innerWidth;
                    const initW = Math.min(vw * 0.65, vh * 0.7);
                    const initH = Math.min(vh * 0.5, vw * 0.55);
                    Object.assign(tool.style, { width: initW + "px", minWidth: "280px", maxWidth: vw + "px", height: initH + "px", minHeight: "220px", maxHeight: vh + "px", top: Math.max(10, vh * 0.08) + "px", left: Math.max(10, vw * 0.06) + "px", transform: "none", resize: "none", overflow: "visible" });
                    tool.dataset.minimized = "true";
                    setPanelScale();
                    let handle = qs("#resizeHandle");
                    if (!handle) {
                        handle = document.createElement("div");
                        handle.id = "resizeHandle";
                        handle.style.cssText = "position:absolute;right:-10px;bottom:-10px;width:34px;height:34px;border-radius:50%;background:rgba(74,124,89,0.85);border:3px solid rgba(255,255,255,0.6);cursor:se-resize;z-index:1001;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);touch-action:none;user-select:none;";
                        handle.innerHTML = "↘";
                        tool.appendChild(handle);
                        let resizing = false, startX, startY, startW, startH;
                        const beginResize = (e) => {
                            if (tool.dataset.minimized !== "true") return;
                            if (e.cancelable) e.preventDefault();
                            resizing = true;
                            startX = e.clientX;
                            startY = e.clientY;
                            const r = tool.getBoundingClientRect();
                            startW = r.width;
                            startH = r.height;
                            tool.style.transition = "none";
                            document.body.style.userSelect = "none";
                            handle.style.pointerEvents = "auto";
                            if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
                        };
                        const doResize = (e) => {
                            if (!resizing) return;
                            if (e.cancelable) e.preventDefault();
                            const x = e.clientX;
                            const y = e.clientY;
                            if (x === undefined || y === undefined) return;
                            const vw = window.innerWidth, vh = window.innerHeight;
                            const currW = startW + (x - startX);
                            const currH = startH + (y - startY);
                            const newW = Math.max(280, Math.min(vw - 20, currW));
                            const newH = Math.max(220, Math.min(vh - 20, currH));
                            tool.style.width = newW + "px";
                            tool.style.height = newH + "px";
                            setPanelScale();
                        };
                        const endResize = () => {
                            if (!resizing) return;
                            resizing = false;
                            tool.style.transition = "";
                            document.body.style.userSelect = "";
                            handle.style.pointerEvents = "";
                        };
                        handle.addEventListener("pointerdown", beginResize);
                        document.addEventListener("pointermove", doResize);
                        document.addEventListener("pointerup", endResize);
                        document.addEventListener("pointercancel", endResize);
                    }
                }
            };
            qs("#maximize").onclick = () => {
                if (document.fullscreenElement) document.exitFullscreen();
                else document.documentElement.requestFullscreen();
            };
            const repositionOnResize = () => {
                const t = qs("#gmtool");
                if (!t) return;
                if (t.dataset.minimized === "true") {
                    const r = t.getBoundingClientRect();
                    const vw = window.innerWidth, vh = window.innerHeight;
                    const newLeft = Math.min(Math.max(0, r.left), vw - r.width);
                    const newTop = Math.min(Math.max(0, r.top), vh - r.height);
                    Object.assign(t.style, { left: newLeft + "px", top: newTop + "px", transform: "none" });
                } else if (t.style.display === "flex") {
                    Object.assign(t.style, { top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
                }
            };
            document.addEventListener("fullscreenchange", repositionOnResize);
            window.addEventListener("resize", repositionOnResize);
            window.addEventListener("orientationchange", repositionOnResize);
            qs("#settings").onclick = () => { const p = qs("#settingsPanel"); if (p) p.style.display = p.style.display === "flex" ? "none" : "flex"; };
            qs("#closeSettings").onclick = () => { const p = qs("#settingsPanel"); if (p) p.style.display = "none"; };

            document.body.addEventListener('click', e => {
                if (!e.target.closest('.dropdown-trigger') && !e.target.closest('.dropdown-panel')) Utils.closeAllDropdowns();
                const cp = qs("#colorPicker"); if (cp && !e.target.closest('#bgColorBtn')) cp.style.display = "none";
            });

            document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
                trigger.onclick = e => {
                    e.stopPropagation();
                    const targetId = trigger.getAttribute('data-target');
                    if (!targetId) return;
                    const panel = qs("#" + targetId);
                    if (panel.style.display === "none") { Utils.closeAllDropdowns(); Utils.positionDropdown(trigger, panel); panel.style.display = targetId === "colorPicker" ? "grid" : "flex"; }
                    else panel.style.display = "none";
                };
            });
            if (qs("#bgColorBtn")) qs("#bgColorBtn").onclick = e => { e.stopPropagation(); const cp = qs("#colorPicker"); Utils.closeAllDropdowns(); Utils.positionDropdown(qs("#bgColorBtn"), cp); cp.style.display = "grid"; };

            document.querySelectorAll(".cp-color").forEach(el => el.onclick = e => {
                e.stopPropagation();
                UIManager.currentColor = el.getAttribute("data-color");
                qs("#bgColorBtn").style.backgroundColor = UIManager.currentColor;
                qs("#colorPicker").style.display = "none";
                UIManager.updateBgOpacity();
                GM_setValue("ycy_color", UIManager.currentColor);
            });

            const opacitySlider = qs("#bgOpacity");
            if (opacitySlider) opacitySlider.oninput = () => { UIManager.updateBgOpacity(); GM_setValue("ycy_opacity", parseFloat(opacitySlider.value)); };
            const scaleSlider = qs("#panelScaleSlider");
            if (scaleSlider) scaleSlider.oninput = () => {
                const scale = parseFloat(scaleSlider.value);
                const label = qs("#scaleLabel");
                if (label) label.textContent = Math.round(scale * 100) + "%";
                const tool = qs("#gmtool");
                if (tool) tool.style.setProperty("--panel-scale", scale);
                GM_setValue("ycy_scale", scale);
            };
            const savedOpacity = GM_getValue("ycy_opacity", null);
            if (savedOpacity !== null && opacitySlider) { opacitySlider.value = savedOpacity; UIManager.updateBgOpacity(); }
            const savedScale = GM_getValue("ycy_scale", null);
            if (savedScale !== null && scaleSlider) { scaleSlider.value = savedScale; const lbl = qs("#scaleLabel"); if (lbl) lbl.textContent = Math.round(savedScale * 100) + "%"; const tool = qs("#gmtool"); if (tool) tool.style.setProperty("--panel-scale", savedScale); }
            const savedColor = GM_getValue("ycy_color", null);
            if (savedColor) { UIManager.currentColor = savedColor; const btn = qs("#bgColorBtn"); if (btn) btn.style.backgroundColor = savedColor; UIManager.updateBgOpacity(); }
        },
        updateBgOpacity: () => {
            const opacity = parseFloat(document.querySelector("#bgOpacity").value);
            const label = document.querySelector("#opacityLabel");
            if (label) label.textContent = Math.round(opacity * 100) + "%";
            const rgb = Utils.hexToRgbComponents(UIManager.currentColor);
            document.documentElement.style.setProperty('--theme-base', UIManager.currentColor);
            document.documentElement.style.setProperty('--theme-bg', `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})`);
            document.documentElement.style.setProperty('--theme-header', `rgba(${rgb.r + 4},${rgb.g + 7},${rgb.b + 3},${Math.min(opacity + 0.03, 1)})`);
            document.documentElement.style.setProperty('--theme-sidebar', `rgba(${rgb.r + 9},${rgb.g + 20},${rgb.b + 8},${opacity})`);
            document.documentElement.style.setProperty('--theme-border', `rgba(${rgb.r + 50},${rgb.g + 80},${rgb.b + 40},${Math.min(opacity * 0.3, 0.4)})`);
            document.documentElement.style.setProperty('--theme-item', `rgba(255,255,255,${Math.min(opacity * 0.1, 0.15)})`);
            document.documentElement.style.setProperty('--theme-editor', `rgba(${rgb.r + 10},${rgb.g + 25},${rgb.b + 15},${Math.min(opacity * 0.85, 0.9)})`);
            const btnOp = Math.min(opacity * 0.95, 1);
            document.documentElement.style.setProperty('--theme-btn-bg', `linear-gradient(135deg,rgba(${rgb.r + 12},${rgb.g + 30},${rgb.b + 15},${btnOp}) 0%,rgba(${rgb.r + 6},${rgb.g + 18},${rgb.b + 10},${btnOp}) 100%)`);
            document.documentElement.style.setProperty('--theme-btn-hover', `linear-gradient(135deg,rgba(${rgb.r + 20},${rgb.g + 45},${rgb.b + 22},${btnOp}) 0%,rgba(${rgb.r + 10},${rgb.g + 28},${rgb.b + 14},${btnOp}) 100%)`);
            document.documentElement.style.setProperty('--theme-btn-border', `rgba(${rgb.r + 50},${rgb.g + 80},${rgb.b + 45},${Math.min(opacity * 0.4, 0.5)})`);
            document.documentElement.style.setProperty('--theme-btn-run', `linear-gradient(135deg,rgba(${rgb.r + 28},${rgb.g + 55},${rgb.b + 30},${btnOp}) 0%,rgba(${rgb.r + 12},${rgb.g + 32},${rgb.b + 16},${btnOp}) 100%)`);
            document.documentElement.style.setProperty('--theme-btn-run-border', `rgba(${rgb.r + 70},${rgb.g + 100},${rgb.b + 60},${Math.min(opacity * 0.5, 0.6)})`);
        },
        bindDragDrop: () => {
            const header = document.querySelector("#toolHeader");
            const tool = document.querySelector("#gmtool");
            if (!header || !tool) return;
            let isDragging = false, startX, startY, initialLeft, initialTop;
            if (header) header.style.touchAction = "none";
            const start = (e) => {
                if (tool.dataset.minimized !== "true") return;
                const target = e.target.closest("#minimize, #关, #maximize");
                if (target) return;
                if (e.cancelable) e.preventDefault();
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const r = tool.getBoundingClientRect();
                initialLeft = r.left;
                initialTop = r.top;
                tool.style.cursor = "grabbing";
                tool.style.transform = "none";
                tool.style.transition = "none";
                document.body.style.userSelect = "none";
                header.style.pointerEvents = "auto";
                if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
            };
            const move = (e) => {
                if (!isDragging) return;
                if (e.cancelable) e.preventDefault();
                const x = e.clientX;
                const y = e.clientY;
                if (x === undefined || y === undefined) return;
                const vw = window.innerWidth, vh = window.innerHeight;
                const r = tool.getBoundingClientRect();
                tool.style.left = Math.max(0, Math.min(vw - r.width, initialLeft + x - startX)) + "px";
                tool.style.top = Math.max(0, Math.min(vh - r.height, initialTop + y - startY)) + "px";
            };
            const end = () => {
                if (!isDragging) return;
                isDragging = false;
                tool.style.cursor = "default";
                tool.style.transition = "";
                document.body.style.userSelect = "";
                header.style.pointerEvents = "";
            };
            header.addEventListener("pointerdown", start);
            document.addEventListener("pointermove", move);
            document.addEventListener("pointerup", end);
            document.addEventListener("pointercancel", end);
        }
    };

    const qs = s => document.querySelector(s);

    // ==========================================
    // 5. 易次元业务逻辑
    // ==========================================
    const AvgEngineHandler = {
        engineType: '',
        initEarly: () => {
            if (Env.isYiCiYuanJS()) AvgEngineHandler.engineType = 'enginejs';
            else if (Env.isYiCiYuanH5()) AvgEngineHandler.engineType = 'engine';
            else if (Env.isDebugPlayer()) {
                const iframe = document.querySelector('iframe[src*="enginejs/index.html"]');
                if (iframe) AvgEngineHandler.engineType = 'enginejs';
                else AvgEngineHandler.engineType = 'engine';
            }
            if (AvgEngineHandler.engineType === 'enginejs') AvgEngineHandler.injectScriptModifiers();
            if (AvgEngineHandler.engineType === 'engine' && !unsafeWindow.AVGErrorHandler) {
                unsafeWindow.AVGErrorHandler = { init: function() {}, report: function() {}, catchException: function() { return function() {}; }, setErrorHandler: function() {} };
            }
            AvgEngineHandler.hookGlobalFunctions();
        },
        initUI: () => {
            const setup = () => {
                if (!document.querySelector("#gameCanvas")) { setTimeout(setup, 30); return; }
                UIManager.init(UITemplates.getLayout(AvgEngineHandler.engineType === 'enginejs'));
                AvgEngineHandler.bindSpecificUIEvents();
            };
            setup();
        },
        hookGlobalFunctions: () => {
            // 合并三个轮询任务，用低频 setTimeout 代替三个独立的 60fps requestAnimationFrame，
            // 避免和游戏引擎自身的渲染循环抢占同一帧时间片（这是手机端启动慢的主要原因之一）
            let retinaDone = false, baseDone = false, ctsDone = false;
            const pollTick = () => {
                if (!retinaDone && typeof cc != "undefined" && cc.view) {
                    cc.view.isRetinaEnabled = function() { this._devicePixelRatio = unsafeWindow.devicePixelRatio; return true; };
                    retinaDone = true;
                }
                if (!baseDone && !unsafeWindow.$III && unsafeWindow.BaseUtils?.decryptoNumber) {
                    unsafeWindow.$III = true;
                    const orig = unsafeWindow.BaseUtils.decryptoNumber;
                    unsafeWindow.BaseUtils.decryptoNumber = function(num, id) {
                        const res = orig.apply(this, arguments);
                        if (unsafeWindow.$jksj && unsafeWindow.AVG_GLOBAL_VARIABLES_ID_NAME) unsafeWindow.$jkddsj[`AVGCmdCalcUtils['calc']("@${unsafeWindow.AVG_GLOBAL_VARIABLES_ID_NAME[id]}")`] = true;
                        return res;
                    };
                    baseDone = true;
                }
                if (!ctsDone && !window.$OOO && unsafeWindow.AVG_GLOBAL_CONFIG?.cts) {
                    window.$OOO = true;
                    unsafeWindow.AVG_GLOBAL_CONFIG.cts = {};
                    ctsDone = true;
                }
                if (!retinaDone || !baseDone || !ctsDone) setTimeout(pollTick, 30);
            };
            pollTick();
            // JSON.parse Hook
            const origParse = JSON.parse;
            unsafeWindow.JSON.parse = function(text) {
                let data = origParse(text);
                if (!data || typeof data !== "object") return data; // 非对象/数组结果不可能命中下面任何一条规则，直接跳过
                try { if (data.jsList && AvgEngineHandler.engineType === 'enginejs') data.jsList.pop(); } catch {}
                try { if (Object.keys(data).length == 8 && text.includes('{"name":"sys_balance","value":')) { data.forEach(item => { if (item.name == "sys_is_order") item.value = 1; if (["sys_punch_count", "sys_consume_coin", "sys_order_num"].includes(item.name)) item.value = 1000000; }); } } catch {}
                try { if (data.commands?.length > 0 && (AvgEngineHandler.engineType === 'enginejs' || data.chapter)) data.commands = data.commands.filter(cmd => !cmd.includes("createLock")); } catch {}
                try { if (data.state?.code) { data.state.code = 200000; if (!data.data) data.data = { v: 1, s: "2a1904a826b64a94725ab2611dbedcda", data: "{}" }; } } catch {}
                try {
                    const k = Object.keys(data);
                    if (k.length === 1) { if (k[0] === "level") data.level = 100; else if (k[0] === "count") data.count = 100; }
                } catch {}
                return data;
            };
            unsafeWindow.$jkddsj = {};
            unsafeWindow.$jksj = false;
            unsafeWindow["商品购买数量"] = 1;
            unsafeWindow["功能列表"] = [];
            unsafeWindow.hser = true;
        },
        injectScriptModifiers: () => {
            const autoAdapt = (text) => {
                let adapted = 0;
                let m = text.match(/\w+\((\w+)\['currentGameId'\]\)\['then'\]\(function\((\w+)\)\{if\(\w+\['log'\]\('游戏配置的JSON资源加载完毕'\)/);
                if (m) { text = text.replace(m[0], m[0] + m[2] + ".data.cts={};"); adapted++; }
                m = text.match(/(\w+)\=\{'isIndieGame'/);
                if (m) { text = text.replace(m[1] + "={", m[1] + "=window.glb={"); adapted++; }
                const proxies = [
                    { type: 'var', ac: 'var', ctx: "['sent']()" },
                    { type: 'arr', ac: 'arr', ctx: "['id']))" },
                    { type: 'cVar', ac: 'cVar', ctx: "constValueUpdate" },
                    { type: 'cArr', ac: 'cArr', ctx: "={};}var" }
                ];
                proxies.forEach(p => {
                    const re = /new Proxy\(\{\},\{'get':function\((\w+),(\w+)\)\{if\(Object\['prototype'\]\['hasOwnProperty'\]\['call'\]\((\w+),\2\)\)/g;
                    let match;
                    while ((match = re.exec(text)) !== null) {
                        const ctxStart = Math.max(0, match.index - 200);
                        if (text.substring(ctxStart, match.index).includes(p.ctx)) {
                            text = text.replace(match[0], match[0] + "window.ymlf" + p.type + "=" + match[3] + ";if(window.$jksj){window.$jkddsj[`ac." + p.ac + "['${" + match[2] + "}']`]=true};");
                            adapted++;
                            break;
                        }
                    }
                    if (!text.includes("window.ymlf" + p.type)) {
                        const re2 = new RegExp("new Proxy\\(\\{\\},\\{'get':function\\((\\w+),(\\w+)\\)\\{");
                        const m2 = re2.exec(text);
                        if (m2) {
                            const ctxCheck = Math.max(0, m2.index - 300);
                            const ctxText = text.substring(ctxCheck, m2.index);
                            if (ctxText.includes(p.ctx) || p.ctx === "") {
                                text = text.replace(m2[0], m2[0] + "window.ymlf" + p.type + "=" + m2[1] + ";if(window.$jksj){window.$jkddsj[`ac." + p.ac + "['${" + m2[2] + "}']`]=true};");
                                adapted++;
                            }
                        }
                    }
                });
                return { text, adapted };
            };
            const findOrigUrl = async () => {
                const s = Array.from(document.querySelectorAll('script[src*="game."]')).find(s => s.src && s.src.includes('.min.js'));
                if (s) return s.src;
                const resp = await fetch(location.href, { credentials: 'include' });
                const html = await resp.text();
                const m = html.match(/src=["']([^"']*enginejs\/game\.[^"']*\.min\.js)["']/) || html.match(/["']([^"']*\/game\.[^"']*\.min\.js)["']/);
                return m ? m[1] : null;
            };
            const origAppend = HTMLBodyElement.prototype.appendChild;
            HTMLBodyElement.prototype.appendChild = function(node) {
                if (node.nodeName == "SCRIPT" && node.src && node.src.includes("enginejs/aWeblib.")) {
                    setTimeout(async () => {
                        let script = document.createElement("script"), text = null;
                        try {
                            const url = await findOrigUrl();
                            if (url) {
                                const result = autoAdapt(await (await fetch(url)).text());
                                if (result.adapted === 6) text = result.text;
                            }
                        } catch {}
                        if (text === null) {
                            try {
                                const resp = await fetch(CONSTANTS.MZ_FALLBACK_URL);
                                text = await resp.text();
                                const fallbackResult = autoAdapt(text);
                                if (fallbackResult.adapted === 6) text = fallbackResult.text;
                            } catch {}
                        }
                        if (text) { script.textContent = text; document.body.appendChild(script); }
                        if (unsafeWindow.cc?.game) { unsafeWindow.cc.game.onStart = unsafeWindow.initGame; unsafeWindow.cc.game.run(); }
                    }, 3000);
                }
                if (node.nodeName == "SCRIPT" && node.text && node.text.includes("var ac = {")) {
                    node.text = node.text.replace("var ac = {", "var ac = window.ac={")
                        .replace("var window = null;", "").replace("var setTimeout = null;", "")
                        .replace("ac.getBuyCount(convertAttrs);", "window.商品购买数量;")
                        .replace("return ac.createRedeemBox(convertAttrs);", "let run=arguments[0].onRedeemSucceed;setTimeout(function(){run()},10);\nreturn ac.createRedeemBox(convertAttrs);")
                        .replace("ac.createLock(convertAttrs)", "").replace("ac.createCheatDetect(convertAttrs)", "")
                        .replace("createOptionGroup: (function(ac) {\n return function() {", "createOptionGroup: (function(ac) {\n return function() {\n\t\t\twindow[\"选项\"]=[];\n\t\t\tfor(let i=0;i<arguments[0].optionGroup.length;i++){\n\t\t\t\ttry{\n\t\t\t\t\twindow[\"选项\"].push(arguments[0].optionGroup[i].clickFunc);\n\t\t\t\t}catch(e){}\n\t\t\t}");
                }
                return origAppend.apply(this, arguments);
            };
            const hookAcObject = () => {
                if (unsafeWindow.ac && !unsafeWindow.ac._ycyHooked) {
                    unsafeWindow.ac._ycyHooked = true;
                    const origAc = unsafeWindow.ac;
                    const types = ['var', 'arr', 'cVar', 'cArr'];
                    types.forEach(type => {
                        if (origAc[type]) {
                            const acProxy = origAc[type];

                            let targetObj = null;

                            // 方法1：从 Proxy target 记录中查找
                            if (ycyProxyTargetMap.has(acProxy)) {
                                targetObj = ycyProxyTargetMap.get(acProxy);
                            }

                            // 方法2：如果 ymlf* 已经由注入代码设置，优先使用它
                            if (unsafeWindow['ymlf' + type] && typeof unsafeWindow['ymlf' + type] === 'object') {
                                targetObj = unsafeWindow['ymlf' + type];
                            }

                            // 方法3：如果都没找到，使用 Proxy 本身
                            if (!targetObj) {
                                targetObj = acProxy;
                            }

                            try {
                                unsafeWindow['ymlf' + type] = targetObj;
                            } catch(e) {}
                        }
                    });

                    // 延迟类型映射
                    types.forEach(type => {
                        const acProxy = origAc[type];
                        if (acProxy) {
                            ycyProxyTypeMap.set(acProxy, type);
                        }
                    });

                    return true;
                }
                return false;
            };
            const pollAc = () => {
                if (hookAcObject()) return;
                setTimeout(pollAc, 500);
            };
            pollAc();
        },
        bindSpecificUIEvents: () => {
            unsafeWindow.xgsj = (el) => {
                let expr = el.textContent, val;
                try { val = new Function("ac", "return " + expr + ";")(unsafeWindow.ac); } catch(e) { return; }
                const tb = qs("#textarea");
                if (!tb) return;
                if (AvgEngineHandler.engineType === 'enginejs') {
                    if (typeof val == "string") val = "`" + val + "`";
                    if (expr.indexOf("ac.arr") != -1 || expr.indexOf("ac.cArr") != -1) {
                        try {
                            let code = new Function("let txt=\"\";\n" + expr + ".map((a,b)=>{\nif(typeof a==\"string\"){ a = `\\`${a}\\``; }\nif(typeof a==\"object\"){ a=JSON.stringify(a); }\ntxt+=`" + expr + "[${b}]=${a};\\n\\r`;\n});\nreturn txt;")();
                            tb.value = code;
                        } catch(e) {
                            tb.value = expr + "=" + JSON.stringify(val) + ";";
                        }
                    } else {
                        tb.value = (tb.value ? tb.value + "\n" : "") + expr + "=" + val + ";";
                    }
                } else {
                    if (typeof val == "string") val = "`" + val + "`";
                    if (expr.split("@").length == 2) expr = expr.replace(/\((.+?)\)/, (match, inner) => match.replace(inner, `"${inner.slice(1, -1)}=${typeof val === "object" ? JSON.stringify(val) : val}"`));
                    else expr += ";//=" + val;
                    tb.value = (tb.value ? tb.value + "\n" : "") + expr + ";";
                }
                Utils.closeAllDropdowns();
            };
            unsafeWindow.fenZu = (idx) => {
                let html = "";
                try {
                    unsafeWindow.dataFenZu[idx].forEach(item => html += `<div onclick='xgsj(this)'>${item}</div>`);
                } catch(e) {
                    html = '<div style="padding:10px;color:rgba(255,255,255,0.6);">读取数据失败</div>';
                }
                const dl = qs("#dataList");
                if (dl) { dl.innerHTML = html; Utils.positionDropdown(qs("#selectData"), dl); dl.style.display = "flex"; }
            };
            unsafeWindow.dqjq = (id) => { try { unsafeWindow.ac.jump({ plotID: id, transition: "normal" }); } catch (e) {} };

            document.querySelectorAll(".type-opt").forEach(opt => {
                opt.onclick = (e) => {
                    e.stopPropagation();
                    unsafeWindow.dataFenZu = [];
                    const type = opt.getAttribute('data-type');
                    qs(".dropdown-trigger[data-target='typeShow']").textContent = opt.textContent;
                    qs("#typeShow").style.display = "none";
                    let keys = [];
                    try {
                        if (type === 'all') {
                            const obj = unsafeWindow.AVG_GLOBAL_VARIABLES_ID_NAME;
                            keys = obj ? Object.values(obj) : [];
                        } else {
                            const obj = unsafeWindow['ymlf' + type];
                            keys = obj ? (Array.isArray(obj) ? [] : Object.keys(obj)) : [];
                        }
                    } catch(err) {
                        keys = [];
                    }
                    for (let i = 0; i < keys.length; i++) {
                        let group = Math.floor(i / 500);
                        if (!unsafeWindow.dataFenZu[group]) unsafeWindow.dataFenZu[group] = [];
                        if (type === 'all') unsafeWindow.dataFenZu[group].push(`AVGCmdCalcUtils['calc']("@${keys[i]}")`);
                        else unsafeWindow.dataFenZu[group].push(`ac.${type}["${keys[i]}"]`);
                    }
                    qs("#fenZu").innerHTML = unsafeWindow.dataFenZu.map((_, idx) => `<div onclick="fenZu(${idx})">分组${idx + 1}</div>`).join('');
                    const f = qs("#fenZu");
                    if (f) { Utils.positionDropdown(qs(".dropdown-trigger[data-target='fenZu']"), f); f.style.display = "flex"; }
                };
            });

            if (qs("#batchModifyBtn")) qs("#batchModifyBtn").onclick = () => {
                const tb = qs("#textarea");
                if (!tb || !tb.value.trim()) { alert("代码区为空，请先选择要修改的属性"); return; }
                const old = document.getElementById("ycyBatchDialog");
                if (old) old.remove();
                const mask = document.createElement("div");
                mask.id = "ycyBatchDialog";
                mask.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(8px);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:'Microsoft YaHei',Arial,sans-serif;";
                const html = '<div style="width:min(92vw,430px);background:linear-gradient(160deg,#1e3a2d,#12281c);border:1px solid rgba(120,180,140,0.4);border-radius:18px;padding:26px 24px 22px;box-shadow:0 25px 70px rgba(0,0,0,0.6);color:#fff;">' +
                    '<div style="font-size:21px;font-weight:700;letter-spacing:2px;text-align:center;margin-bottom:6px;">✏️ 一键修改</div>' +
                    '<div style="font-size:13px;color:rgba(255,255,255,0.7);text-align:center;margin-bottom:20px;">你要集体修改的属性值为：</div>' +
                    '<input id="ycyBatchInput" type="text" placeholder="请输入新的属性值" ' +
                    'style="width:100%;box-sizing:border-box;padding:11px 14px;border-radius:10px;border:1px solid rgba(120,180,140,0.4);background:rgba(255,255,255,0.07);color:#fff;font-size:15px;outline:none;" autocomplete="off" spellcheck="false">' +
                    '<div id="ycyBatchMsg" style="min-height:22px;margin-top:10px;font-size:13px;color:#ff9b9b;"></div>' +
                    '<div style="display:flex;gap:10px;margin-top:6px;">' +
                    '<button id="ycyBatchCancel" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.25);background:transparent;color:#fff;font-size:14px;cursor:pointer;">取消</button>' +
                    '<button id="ycyBatchSubmit" style="flex:2;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,#5a9b70,#3f7550);color:#fff;font-size:14px;font-weight:600;cursor:pointer;">确 定</button>' +
                    '</div></div>';
                mask.innerHTML = html;
                document.body.appendChild(mask);
                const input = document.getElementById("ycyBatchInput");
                const msg = document.getElementById("ycyBatchMsg");
                setTimeout(() => input.focus(), 80);
                input.addEventListener("keydown", e => {
                    if (e.key === "Enter") document.getElementById("ycyBatchSubmit").click();
                    if (e.key === "Escape") document.getElementById("ycyBatchCancel").click();
                });
                document.getElementById("ycyBatchSubmit").onclick = () => {
                    const newVal = input.value.trim();
                    if (newVal === "") { msg.textContent = "请输入属性值"; return; }
                    const lines = tb.value.split("\n");
                    const modified = lines.map(line => {
                        const trimmed = line.trim();
                        if (!trimmed) return line;
                        if (trimmed.startsWith("ac.")) {
                            const eqIdx = trimmed.indexOf("=");
                            if (eqIdx !== -1) {
                                const expr = trimmed.substring(0, eqIdx);
                                return expr + "=" + newVal + ";";
                            }
                        } else if (trimmed.startsWith("AVGCmdCalcUtils")) {
                            const commentIdx = trimmed.indexOf(";//=");
                            if (commentIdx !== -1) {
                                return trimmed.substring(0, commentIdx + 4) + newVal + ";";
                            }
                            const eqInQuote = trimmed.lastIndexOf("=");
                            if (eqInQuote !== -1) {
                                const before = trimmed.substring(0, eqInQuote + 1);
                                const rest = trimmed.substring(eqInQuote + 1);
                                const quoteIdx = rest.indexOf('"');
                                if (quoteIdx !== -1) {
                                    const suffix = rest.substring(quoteIdx);
                                    return before + newVal + suffix;
                                }
                            }
                        }
                        return line;
                    });
                    tb.value = modified.join("\n");
                    mask.remove();
                };
                document.getElementById("ycyBatchCancel").onclick = () => mask.remove();
            };
            if (qs("#run")) qs("#run").onclick = () => {
                try {
                    const tb = qs("#textarea");
                    let code = tb ? tb.value : "";
                    if (!code.trim()) return;
                    new Function("功能列表", "商品购买数量", code + ";")(unsafeWindow["功能列表"], unsafeWindow["商品购买数量"]);
                } catch (e) { alert("执行失败: " + e.message); }
            };
            const clearBtn2 = qs("#clear");
            if (clearBtn2) clearBtn2.onclick = () => { if (qs("#textarea")) qs("#textarea").value = ""; if (qs("#_str") || qs("#searchInput")) (qs("#_str") || qs("#searchInput")).value = ""; };

            const doSearch = (e) => {
                e && e.stopPropagation();
                const kw = qs("#_str") ? qs("#_str").value : qs("#searchInput").value;
                let html = "";
                try {
                    if (AvgEngineHandler.engineType === 'enginejs') {
                        ['var', 'arr', 'cVar', 'cArr'].forEach(t => {
                            const obj = unsafeWindow[`ymlf${t}`];
                            if (obj && !Array.isArray(obj)) {
                                Object.keys(obj).forEach(k => {
                                    if (k.includes(kw)) html += `<div onclick='xgsj(this)'>ac.${t}["${k}"]</div>`;
                                });
                            }
                        });
                    } else {
                        const obj = unsafeWindow.AVG_GLOBAL_VARIABLES_ID_NAME;
                        if (obj) {
                            Object.values(obj).forEach(k => {
                                if (k.includes(kw)) html += `<div onclick="xgsj(this)">AVGCmdCalcUtils['calc']("@${k}")</div>`;
                            });
                        }
                    }
                } catch {}
                const dl = qs("#dataList");
                if (dl) { dl.innerHTML = html; Utils.closeAllDropdowns(); Utils.positionDropdown(qs(".dropdown-trigger[data-target='dataList']") || qs("#selectData"), dl); dl.style.display = "flex"; }
            };
            if (qs("#sousuo") || qs("#searchBtn")) (qs("#sousuo") || qs("#searchBtn")).onclick = doSearch;

            const monBtn = qs("#jksj2");
            if (monBtn) monBtn.onclick = function(e) {
                e.stopPropagation();
                unsafeWindow.$jksj = !unsafeWindow.$jksj;
                if (!unsafeWindow.$jksj) {
                    this.style.color = "white";
                    let html = "";
                    const recordedKeys = Object.keys(unsafeWindow.$jkddsj || {});
                    if (recordedKeys.length > 0) {
                        recordedKeys.forEach(k => html += `<div onclick="xgsj(this)">${k}</div>`);
                        unsafeWindow.$jkddsj = {};
                    } else {
                        html = '<div style="padding:10px;color:rgba(255,255,255,0.6);">暂无监控数据，请先开启监控并运行游戏</div>';
                    }
                    const dl = qs("#dataList");
                    if (dl) { Utils.closeAllDropdowns(); dl.innerHTML = html; Utils.positionDropdown(qs(".dropdown-trigger[data-target='dataList']") || qs("#selectData"), dl); dl.style.display = "flex"; }
                } else {
                    this.style.color = "#a7ffa7";
                }
            };
            const plotBtn = qs("#dqjq2");
            if (plotBtn) plotBtn.onclick = function(e) {
                e.stopPropagation();
                let html = "";
                const walk = node => { if (node.scenes) node.scenes.forEach(s => html += `<div onclick="dqjq(${s.id})">${s.name}</div>`); if (node.sections) node.sections.forEach(walk); };
                try {
                    const glb = unsafeWindow.glb;
                    if (glb && glb.gameGlobalConfig && glb.gameGlobalConfig.chapters) {
                        glb.gameGlobalConfig.chapters.forEach(walk);
                    } else {
                        html = '<div style="padding:10px;color:rgba(255,255,255,0.6);">无法读取剧情数据，请确保游戏已加载</div>';
                    }
                } catch(err) {
                    html = '<div style="padding:10px;color:rgba(255,255,255,0.6);">读取剧情数据失败: ' + err.message + '</div>';
                }
                const dl = qs("#dataList");
                if (dl) { Utils.closeAllDropdowns(); dl.innerHTML = html; Utils.positionDropdown(qs(".dropdown-trigger[data-target='dataList']") || qs("#selectData"), dl); dl.style.display = "flex"; }
            };
        }
    };

    // ==========================================
    // 6. 环境检测与主入口
    // ==========================================
    const Env = {
        isYiCiYuanJS: () => location.href.includes("avg.163.com/enginejs/index.html"),
        isYiCiYuanH5: () => location.href.includes("avg.163.com/engine/index.html"),
        isDebugPlayer: () => location.href.includes("avg.163.com/debugPlayer.html")
    };

    // 调试播放器跳转逻辑
    function tryAvg163DetailToDebugPlayer() {
        if (!location.hostname.includes("avg.163.com")) return false;
        const whole = location.href, hash = location.hash || "";
        if (whole.includes("debugPlayer") || whole.includes("enginejs/index") || whole.includes("engine/index")) return false;
        const m = /\/game\/detail\/(\d+)/.exec(whole) || /game\/detail\/(\d+)/.exec(hash) || /detail\/(\d+)/.exec(hash) || /[?&]gameId=(\d+)/.exec(whole + hash);
        if (m) {
            location.href = `https://avg.163.com/debugPlayer.html?gameId/${m[1]}`;
            return true;
        }
        return false;
    }

    const mainFunction = () => {
        if (tryAvg163DetailToDebugPlayer()) return;
        AvgEngineHandler.initUI();
    };

    window.addEventListener("hashchange", tryAvg163DetailToDebugPlayer, false);

    // 立即执行脚本拦截和全局hook（必须在游戏脚本加载前完成）
    if (!tryAvg163DetailToDebugPlayer()) {
        AvgEngineHandler.initEarly();
    }

    setTimeout(() => {
        try {
            mainFunction();
        } catch (e) {}
    }, 100);
})();