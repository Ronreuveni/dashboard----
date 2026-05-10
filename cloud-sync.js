// ============================================================
// Cloud Sync — GitHub Gist as backend (cross-device data sync)
// ============================================================
// Stores the full dataset as a single JSON file inside a private Gist.
// Keys (localStorage):
//   studio_cloud_token  — GitHub Personal Access Token (gist scope)
//   studio_cloud_gist   — Gist ID
//   studio_cloud_lastSync — ISO timestamp of last successful sync (push or pull)
//   studio_cloud_remoteStamp — exportedAt value of the last remote we saw
// ============================================================

const CLOUD_KEYS = {
    token: 'studio_cloud_token',
    gist:  'studio_cloud_gist',
    lastSync: 'studio_cloud_lastSync',
    remoteStamp: 'studio_cloud_remoteStamp'
};
const CLOUD_FILENAME = 'studio-os-data.json';

function cloudConfig() {
    return {
        token: localStorage.getItem(CLOUD_KEYS.token) || '',
        gistId: localStorage.getItem(CLOUD_KEYS.gist) || ''
    };
}
function cloudIsConfigured() {
    const c = cloudConfig();
    return !!(c.token && c.gistId);
}
function cloudSetStatus(text, kind) {
    // kind: 'ok' | 'sync' | 'err' | 'off'
    const dot = document.querySelector('#backup-indicator .backup-dot');
    const txt = document.querySelector('#backup-indicator .backup-text');
    if (!dot || !txt) return;
    txt.textContent = text;
    dot.style.background = kind === 'ok' ? '#22c55e'
        : kind === 'sync' ? '#f59e0b'
        : kind === 'err' ? '#ef4444'
        : '';
}

async function cloudPull(opts = {}) {
    if (!cloudIsConfigured()) return null;
    const { token, gistId } = cloudConfig();
    cloudSetStatus('טוען מהענן…', 'sync');
    try {
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const gist = await res.json();
        const file = gist.files && gist.files[CLOUD_FILENAME];
        if (!file) {
            cloudSetStatus('Gist ריק', 'ok');
            return null;
        }
        let raw = file.content;
        if (file.truncated && file.raw_url) {
            const r2 = await fetch(file.raw_url);
            raw = await r2.text();
        }
        const data = JSON.parse(raw);
        if (opts.apply !== false) cloudApplyRemote(data);
        localStorage.setItem(CLOUD_KEYS.lastSync, new Date().toISOString());
        if (data.exportedAt) localStorage.setItem(CLOUD_KEYS.remoteStamp, data.exportedAt);
        cloudSetStatus('מסונכרן', 'ok');
        return data;
    } catch (e) {
        console.warn('Cloud pull failed:', e);
        cloudSetStatus('שגיאת ענן', 'err');
        return null;
    }
}

function cloudApplyRemote(data) {
    if (!data || typeof data !== 'object') return;
    if (data.tasks)      localStorage.setItem(STORAGE_KEYS.tasks,      JSON.stringify(data.tasks));
    if (data.projects)   localStorage.setItem(STORAGE_KEYS.projects,   JSON.stringify(data.projects));
    if (data.team)       localStorage.setItem(STORAGE_KEYS.team,       JSON.stringify(data.team));
    if (data.statuses)   localStorage.setItem(STORAGE_KEYS.statuses,   JSON.stringify(data.statuses));
    if (data.priorities) localStorage.setItem(STORAGE_KEYS.priorities, JSON.stringify(data.priorities));
    if (data.teamGroups) localStorage.setItem(STORAGE_KEYS.teamGroups, JSON.stringify(data.teamGroups));
    if (typeof rerenderActiveView === 'function') rerenderActiveView();
    else { try { renderToday(); } catch(_) {} try { renderTaskTable(); } catch(_) {} try { renderTeam(); } catch(_) {} try { renderProjects(); } catch(_) {} }
    try { updateBadges(); } catch(_) {}
    try { refreshBackupIndicator(); } catch(_) {}
}

let _cloudPushTimer = null;
function cloudSchedulePush() {
    if (!cloudIsConfigured()) return;
    if (_cloudPushTimer) clearTimeout(_cloudPushTimer);
    cloudSetStatus('שינויים ממתינים…', 'sync');
    _cloudPushTimer = setTimeout(cloudPush, 1500);
}

async function cloudPush() {
    if (!cloudIsConfigured()) return;
    const { token, gistId } = cloudConfig();
    cloudSetStatus('שומר בענן…', 'sync');
    const payload = collectAllData();
    try {
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: { [CLOUD_FILENAME]: { content: JSON.stringify(payload, null, 2) } }
            })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        localStorage.setItem(CLOUD_KEYS.lastSync, new Date().toISOString());
        if (payload.exportedAt) localStorage.setItem(CLOUD_KEYS.remoteStamp, payload.exportedAt);
        cloudSetStatus('מסונכרן ✓', 'ok');
    } catch (e) {
        console.warn('Cloud push failed:', e);
        cloudSetStatus('שגיאת שמירה', 'err');
    }
}

async function cloudConnect() {
    const tokenIn = document.getElementById('cloud-token-input');
    const gistIn  = document.getElementById('cloud-gist-input');
    const token = (tokenIn?.value || '').trim();
    const gistId = (gistIn?.value || '').trim();
    if (!token || !gistId) { toast('יש להזין גם טוקן וגם Gist ID', 'error'); return; }

    // Validate by trying to read the Gist
    try {
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const gist = await res.json();
        const hasFile = gist.files && gist.files[CLOUD_FILENAME];
        const remoteHasData = hasFile && gist.files[CLOUD_FILENAME].size > 10;

        let action = 'merge';
        if (remoteHasData) {
            const localHasData = (getTasks().length + getProjects().length) > 0;
            if (localHasData) {
                const ans = confirm(
                    'נמצאו נתונים גם בענן וגם במכשיר זה.\n\n' +
                    'אישור = להשתמש בנתוני הענן (יחליפו את המקומיים)\n' +
                    'ביטול = להשתמש בנתונים המקומיים (ידחפו לענן ויחליפו את הענן)'
                );
                action = ans ? 'pull' : 'push';
            } else {
                action = 'pull';
            }
        } else {
            action = 'push';
        }

        localStorage.setItem(CLOUD_KEYS.token, token);
        localStorage.setItem(CLOUD_KEYS.gist, gistId);

        if (action === 'pull') await cloudPull();
        else await cloudPush();

        toast('סנכרון הענן הוגדר בהצלחה', 'success');
        renderCloudSettings();
    } catch (e) {
        toast('כשל באימות: בדוק טוקן ו-Gist ID', 'error');
        console.warn(e);
    }
}

function cloudDisconnect() {
    if (!confirm('לנתק את סנכרון הענן? הנתונים יישארו במכשיר זה.')) return;
    localStorage.removeItem(CLOUD_KEYS.token);
    localStorage.removeItem(CLOUD_KEYS.gist);
    localStorage.removeItem(CLOUD_KEYS.lastSync);
    localStorage.removeItem(CLOUD_KEYS.remoteStamp);
    renderCloudSettings();
    cloudSetStatus('מסונכרן', 'ok'); // back to local-only indicator
    toast('הסנכרון נותק', 'info');
}

async function cloudSyncNow() {
    if (!cloudIsConfigured()) return;
    // Pull first to fetch any updates from another device, then push current state
    await cloudPull();
    await cloudPush();
    renderCloudSettings();
}

function renderCloudSettings() {
    const host = document.getElementById('cloud-sync-section');
    if (!host) return;
    const cfg = cloudConfig();
    const last = localStorage.getItem(CLOUD_KEYS.lastSync);
    const lastTxt = last ? new Date(last).toLocaleString('he-IL') : '—';
    if (cloudIsConfigured()) {
        const masked = cfg.gistId.length > 8 ? cfg.gistId.slice(0, 4) + '…' + cfg.gistId.slice(-4) : cfg.gistId;
        host.innerHTML = `
            <h4>סנכרון ענן (GitHub Gist) <span style="color:#22c55e;font-weight:600">● מחובר</span></h4>
            <p class="settings-hint">הנתונים מסונכרנים אוטומטית ל-Gist פרטי שלך ב-GitHub. שינויים נדחפים תוך כמה שניות.</p>
            <div class="settings-row"><span>Gist ID:</span><strong>${masked}</strong></div>
            <div class="settings-row"><span>סנכרון אחרון:</span><strong>${lastTxt}</strong></div>
            <div class="settings-actions">
                <button class="btn btn-primary btn-sm" onclick="cloudSyncNow()">סנכרן עכשיו</button>
                <button class="btn btn-ghost btn-sm" onclick="cloudDisconnect()">ניתוק</button>
            </div>
        `;
    } else {
        host.innerHTML = `
            <h4>סנכרון ענן (GitHub Gist)</h4>
            <p class="settings-hint">
                סנכרון אוטומטי בין מחשבים וטלפון דרך Gist פרטי ב-GitHub. הנתונים נשארים אצלך — לא נשלחים לשירות חיצוני.
                <br><br>
                <strong>הגדרה חד-פעמית:</strong>
                <br>1. צור טוקן: <a href="https://github.com/settings/tokens/new?scopes=gist&description=Studio%20OS%20Sync" target="_blank" rel="noopener">github.com/settings/tokens</a> — בחר scope "<code>gist</code>" בלבד
                <br>2. צור Gist פרטי ריק: <a href="https://gist.github.com/" target="_blank" rel="noopener">gist.github.com</a> — שם קובץ: <code>${CLOUD_FILENAME}</code>, תוכן: <code>{}</code>
                <br>3. העתק את ה-ID של ה-Gist (הקוד אחרי השם משתמש ב-URL)
            </p>
            <div class="settings-row" style="flex-direction:column;align-items:stretch;gap:8px">
                <input type="password" id="cloud-token-input" placeholder="GitHub Token (ghp_...)" style="padding:8px 12px;border:1px solid var(--border);border-radius:6px;font-family:Heebo;font-size:14px;background:var(--card-bg);color:var(--text-primary)">
                <input type="text" id="cloud-gist-input" placeholder="Gist ID" style="padding:8px 12px;border:1px solid var(--border);border-radius:6px;font-family:Heebo;font-size:14px;background:var(--card-bg);color:var(--text-primary)">
            </div>
            <div class="settings-actions">
                <button class="btn btn-primary btn-sm" onclick="cloudConnect()">התחבר וסנכרן</button>
            </div>
        `;
    }
}

// ===== Hook into existing save flow =====
// Wrap saveData so every write also schedules a cloud push.
(function wrapSaveData() {
    if (typeof saveData !== 'function') return;
    const _origSave = saveData;
    window.saveData = function(key, data) {
        _origSave(key, data);
        cloudSchedulePush();
    };
})();

// ===== Init: pull on load if configured =====
window.addEventListener('DOMContentLoaded', () => {
    // Slight delay to let app init and render with local data first.
    setTimeout(() => {
        if (cloudIsConfigured()) {
            cloudPull();
        }
    }, 300);
    renderCloudSettings();
});

// Push pending changes when user closes/switches tab
window.addEventListener('beforeunload', () => {
    if (_cloudPushTimer && cloudIsConfigured()) {
        clearTimeout(_cloudPushTimer);
        // Use sendBeacon-style sync: navigator.sendBeacon doesn't support PATCH,
        // so we fire-and-forget with keepalive.
        const { token, gistId } = cloudConfig();
        try {
            fetch(`https://api.github.com/gists/${gistId}`, {
                method: 'PATCH',
                keepalive: true,
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: { [CLOUD_FILENAME]: { content: JSON.stringify(collectAllData(), null, 2) } }
                })
            });
        } catch(_) {}
    }
});
