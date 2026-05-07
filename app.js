// ============================================================
// Studio OS — Pro task management (local, with auto-backup)
// ============================================================

// ===== Storage keys (shared with v1) =====
const STORAGE_KEYS = {
    tasks: 'studio_tasks',
    projects: 'studio_projects',
    team: 'studio_team',
    statuses: 'studio_statuses',
    priorities: 'studio_priorities',
    teamGroups: 'studio_team_groups',
    // Pro extras
    lastBackupDate: 'studio_pro_last_backup',
    lastBackupHash: 'studio_pro_last_backup_hash',
    autoBackup: 'studio_pro_auto_backup',
    theme: 'studio_pro_theme',
    sidebarCollapsed: 'studio_pro_sidebar_collapsed'
};

// ===== Sidebar toggle =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const collapsed = sidebar.classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, collapsed ? 'true' : 'false');
}
function applySavedSidebarState() {
    if (localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === 'true') {
        document.getElementById('sidebar')?.classList.add('collapsed');
        document.body.classList.add('sidebar-collapsed');
    }
}

// ===== Data layer =====
function loadData(key) { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; }
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    markDirty();
    saveToDisk(); // Auto-save to server
}

// Auto-save to disk (with debounce)
let _saveTimeout;
function saveToDisk() {
    if (window._saveTimeout) clearTimeout(window._saveTimeout);
    window._saveTimeout = setTimeout(() => {
        const allData = collectAllData();
        fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allData)
        }).catch(e => console.log('Disk save failed (not running with server):', e.message));
    }, 500); // Debounce by 500ms to avoid too many writes
}
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function getTeam() { return loadData(STORAGE_KEYS.team) || []; }
function getProjects() { return loadData(STORAGE_KEYS.projects) || []; }
function getTasks() { return loadData(STORAGE_KEYS.tasks) || []; }
function getStatuses() { return loadData(STORAGE_KEYS.statuses) || ['בתיכנון','בעבודה','דחוף','בבדיקה','הושלם']; }
function getPriorities() { return loadData(STORAGE_KEYS.priorities) || ['דחוף','גבוה','רגיל','נמוך']; }
function getTeamGroups() {
    return loadData(STORAGE_KEYS.teamGroups) || DEFAULT_TEAM_GROUPS.slice();
}

// Default hierarchy — matches Methodica org chart.
// Studio & Pedagogy Tech (Dorit) = my area (dim=false).
// Learning Development (Liav) = sibling division shown dimmed for context.
const DEFAULT_TEAM_GROUPS = [
    // === Managers ===
    { id: 'managers', name: 'ניהול — ראשי חטיבות', dim: false, pinned: true },
    // === סטודיו וטכנו פדגוגיה · דורית (my area) ===
    { id: '__studio_header__', name: '◆ סטודיו וטכנו פדגוגיה · דורית', divider: true },
    { id: 'studio_prod_yael',  name: 'צוות הפקה (יעל)',          dim: false },
    { id: 'studio_prod_ron',   name: 'צוות הפקה (רון)',          dim: false },
    { id: 'studio_video_ai',   name: 'וידאו וסרטוני AI (דורית)', dim: false },
    { id: 'studio_dev',        name: 'צוות פיתוח (דורית)',       dim: false },
    // === תחום פיתוח למידה · ליאב (context) ===
    { id: '__learn_header__', name: '◇ תחום פיתוח למידה · ליאב (הקשר בלבד)', divider: true },
    { id: 'learn_dev_danit',     name: 'צוות פיתוח (דנית)',     dim: true },
    { id: 'learn_dev_merav',     name: 'צוות פיתוח (מירב)',     dim: true },
    { id: 'learn_consult_liav',  name: 'צוות יועצים (ליאב)',    dim: true },
    { id: 'learn_training_vered',name: 'ב״ס הכשרות (ורד)',      dim: true },
    // === Extras kept for flexibility ===
    { id: 'external',  name: 'שותפי עבודה חיצוניים', dim: false }
];

// ===== Default Data — populated from Methodica org chart =====
const DEFAULT_TEAM = [
    // ───── ניהול ─────
    { id:'dorit',  name:'דורית', role:'מנהלת סטודיו וטכנו פדגוגיה', type:'internal', group:'managers', color:'#6366f1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'liav',   name:'ליאב',  role:'מנהלת תחום פיתוח למידה',      type:'internal', group:'managers', color:'#64748b', skills:[], notes:'', availability:100, memberStatus:'זמין' },

    // ───── צוות הפקה (יעל) — סטודיו ─────
    { id:'yael',   name:'יעל',    role:'מנהלת צוות הפקה',     type:'internal', group:'studio_prod_yael', color:'#0891b2', skills:['ניהול','הפקה'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'vadim',  name:'ודים',   role:'מוביל מקצועי',         type:'internal', group:'studio_prod_yael', color:'#06b6d4', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'erik',   name:'אריק',   role:'מ. מקצועי',            type:'internal', group:'studio_prod_yael', color:'#06b6d4', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'nir',    name:'ניר',    role:'הפקה',                 type:'internal', group:'studio_prod_yael', color:'#06b6d4', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'hloud',  name:'ח׳לוד',  role:'הפקה',                 type:'internal', group:'studio_prod_yael', color:'#06b6d4', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'yaron',  name:'ירון',   role:'הפקה',                 type:'internal', group:'studio_prod_yael', color:'#06b6d4', skills:[], notes:'', availability:100, memberStatus:'זמין' },

    // ───── צוות הפקה (רון) — סטודיו ─────
    { id:'ron',    name:'רון',    role:'מנהל צוות הפקה',       type:'internal', group:'studio_prod_ron', color:'#4338ca', skills:['ניהול','הפקה'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'noa',    name:'נועה',   role:'מפתחת לומדות',         type:'internal', group:'studio_prod_ron', color:'#6366f1', skills:['קמפוס','הטמעת סרטונים'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'sharon', name:'שרון',   role:'מפיקה / מעצבת',        type:'internal', group:'studio_prod_ron', color:'#6366f1', skills:['קמטזיה','הפקות'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'ori',    name:'אורי',   role:'מעצבת / מפתחת לומדות', type:'internal', group:'studio_prod_ron', color:'#6366f1', skills:['תסריטים','סטוריליין','קמפוס','כוורת','סרטוני סמן'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'chen-bb',name:'חן בן ברית', role:'מפתחת לומדות',     type:'internal', group:'studio_prod_ron', color:'#6366f1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'oren-h', name:'אורן האגי', role:'הפקה',               type:'internal', group:'studio_prod_ron', color:'#6366f1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'ezra',   name:'עזרא',   role:'מעצב',                  type:'internal', group:'studio_prod_ron', color:'#6366f1', skills:['עיצוב'], notes:'', availability:100, memberStatus:'זמין' },

    // ───── וידאו וסרטוני AI (דורית) — סטודיו ─────
    { id:'tal-oved',name:'טל עובד', role:'מובילת וידאו וסרטוני AI', type:'internal', group:'studio_video_ai', color:'#8b5cf6', skills:['AI','וידאו'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'video-ai',  name:'וידאו AI',            role:'וידאו · AI',  type:'internal', group:'studio_video_ai', color:'#a78bfa', skills:['AI'], notes:'ארוב מקצועי / תפקיד צוותי', availability:100, memberStatus:'זמין' },
    { id:'lired',     name:'לירד',                 role:'מפיקת וידאו', type:'internal', group:'studio_video_ai', color:'#a78bfa', skills:['הפקה','וידאו'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'asaf',      name:'אסף',                  role:'מפיק וידאו',  type:'internal', group:'studio_video_ai', color:'#a78bfa', skills:['הפקה','וידאו'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'video-edit',name:'עורכת וידאו',          role:'עריכת וידאו', type:'internal', group:'studio_video_ai', color:'#a78bfa', skills:['עריכה'], notes:'שם לעדכון', availability:100, memberStatus:'זמין' },
    { id:'rotem-sh',  name:'רותם שניר',            role:'וידאו',       type:'internal', group:'studio_video_ai', color:'#a78bfa', skills:[], notes:'', availability:100, memberStatus:'זמין' },

    // ───── צוות פיתוח (דורית) — סטודיו ─────
    { id:'roni-bermek',name:'רוני ברמק', role:'יועצת',             type:'internal', group:'studio_dev', color:'#10b981', skills:['ייעוץ'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'sheli-adv',  name:'שלי',       role:'יועצת',             type:'internal', group:'studio_dev', color:'#10b981', skills:['ייעוץ'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'raz-mahal',  name:'רז מהל״ד',  role:'יועצת',             type:'internal', group:'studio_dev', color:'#10b981', skills:['ייעוץ'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'lihi-sh',    name:'ליהי שפירא', role:'פיתוח · STEM',      type:'internal', group:'studio_dev', color:'#059669', skills:['STEM'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'chen-lavi',  name:'חן לביא',   role:'פיתוח',             type:'internal', group:'studio_dev', color:'#059669', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'rotem-d',    name:'רותם',      role:'פיתוח',             type:'internal', group:'studio_dev', color:'#059669', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'irit',       name:'אירית',     role:'פיתוח',             type:'internal', group:'studio_dev', color:'#059669', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'roni-zaid',  name:'רוני זיידנבאום', role:'פיתוח',        type:'internal', group:'studio_dev', color:'#059669', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'adi-goren',  name:'עדי גורן',  role:'פיתוח',             type:'internal', group:'studio_dev', color:'#059669', skills:[], notes:'', availability:100, memberStatus:'זמין' },

    // ───── צוות פיתוח (דנית) — תחום פיתוח למידה (dim) ─────
    { id:'danit',    name:'דנית',       role:'מנהלת צוות',        type:'internal', group:'learn_dev_danit', color:'#9ca3af', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'kineret',  name:'כנרת',        role:'פיתוח',             type:'internal', group:'learn_dev_danit', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'adi-kehati',name:'עדי קהתי',   role:'פיתוח',             type:'internal', group:'learn_dev_danit', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'einav',    name:'עינב',        role:'פיתוח',             type:'internal', group:'learn_dev_danit', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'noam',     name:'נעם',         role:'פיתוח',             type:'internal', group:'learn_dev_danit', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'avital',   name:'אביטל',       role:'פיתוח',             type:'internal', group:'learn_dev_danit', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'ar',       name:'ער',          role:'פיתוח',             type:'internal', group:'learn_dev_danit', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'orbach',   name:'אורבך',       role:'פיתוח',             type:'internal', group:'learn_dev_danit', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },

    // ───── צוות פיתוח (מירב) — תחום פיתוח למידה (dim) ─────
    { id:'merav',     name:'מירב',       role:'מנהלת צוות',        type:'internal', group:'learn_dev_merav', color:'#9ca3af', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'orna',      name:'אורנה',      role:'פיתוח',             type:'internal', group:'learn_dev_merav', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'lihi-m',    name:'ליהי',       role:'פיתוח',             type:'internal', group:'learn_dev_merav', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'kochav',    name:'כוכב',       role:'פיתוח',             type:'internal', group:'learn_dev_merav', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'eden-golan',name:'עדן גולן',    role:'פיתוח',             type:'internal', group:'learn_dev_merav', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'avichai',   name:'אביחי',      role:'פיתוח',             type:'internal', group:'learn_dev_merav', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'alina',     name:'אלינה',      role:'פיתוח',             type:'internal', group:'learn_dev_merav', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },

    // ───── צוות יועצים (ליאב) — תחום פיתוח למידה (dim) ─────
    { id:'shira',     name:'שירה',       role:'יועצת',             type:'internal', group:'learn_consult_liav', color:'#cbd5e1', skills:['ייעוץ'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'eden-yakim',name:'עדן יקים',    role:'יועצ/ת',            type:'internal', group:'learn_consult_liav', color:'#cbd5e1', skills:['ייעוץ'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'atar-pariz',name:'עטר פריז',    role:'יועצ/ת',            type:'internal', group:'learn_consult_liav', color:'#cbd5e1', skills:['ייעוץ'], notes:'', availability:100, memberStatus:'זמין' },
    { id:'yael-hartman',name:'יעל הרטמן', role:'יועצת',            type:'internal', group:'learn_consult_liav', color:'#cbd5e1', skills:['ייעוץ'], notes:'', availability:100, memberStatus:'זמין' },

    // ───── ב"ס הכשרות (ורד) — תחום פיתוח למידה (dim) ─────
    { id:'vered',    name:'ורד',         role:'ראש ב״ס הכשרות',    type:'internal', group:'learn_training_vered', color:'#9ca3af', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'ido',      name:'עידו',         role:'הכשרות',            type:'internal', group:'learn_training_vered', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'sheli-v',  name:'שלי',          role:'הכשרות',            type:'internal', group:'learn_training_vered', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'shlomo',   name:'שלמה',         role:'הכשרות',            type:'internal', group:'learn_training_vered', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'michael',  name:'מיכאל',        role:'הכשרות',            type:'internal', group:'learn_training_vered', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' },
    { id:'yael-v',   name:'יעל',          role:'הכשרות',            type:'internal', group:'learn_training_vered', color:'#cbd5e1', skills:[], notes:'', availability:100, memberStatus:'זמין' }
];

const DEFAULT_PROJECTS = [
    { id:'p1', name:'מרכז מניעת הדרה מינית - לומדת מדף', description:'פיתוח לומדה', color:'#6366f1' },
    { id:'p2', name:'720 Math חינוך', description:'תוכן מתמטיקה', color:'#f59e0b' },
    { id:'p3', name:'קורס פוטושופ', description:'פיתוח קורס', color:'#8b5cf6' },
    { id:'p4', name:'הראל - תיקון עיצוב למצגת', description:'תיקוני עיצוב', color:'#ef4444' },
    { id:'p5', name:'סרטוני סמן', description:'הפקת סרטונים', color:'#06b6d4' },
    { id:'p6', name:'כוורת', description:'פלטפורמת כוורת', color:'#10b981' },
    { id:'p7', name:'קמפוס', description:'פלטפורמת קמפוס', color:'#ec4899' }
];

const DEFAULT_TASKS = [
    { id:generateId(), projectId:'p1', description:'לומדת מדף - מרכז מניעת הדרה מינית', status:'בתיכנון', priority:'דחוף',
      assignee:'', isManager:false, notes:'יש קריינות, סניף חיפה, מחכה לאישור לשלוח', reportLink:'', hours:0, deadline:'', revisions:0, subtasks:[], history:[], createdAt:new Date().toISOString() },
    { id:generateId(), projectId:'p2', description:'מעבר על כתוביות - 720 Math', status:'בתיכנון', priority:'רגיל',
      assignee:'', isManager:false, notes:'מעבר על כתוביות', reportLink:'', hours:0, deadline:'', revisions:0, subtasks:[], history:[], createdAt:new Date().toISOString() },
    { id:generateId(), projectId:'p3', description:'קורס פוטושופ - סרטוני סמן', status:'בעבודה', priority:'דחוף',
      assignee:'', isManager:false, notes:'סרטוני סמן', reportLink:'https://method', hours:0, deadline:'', revisions:0, subtasks:[], history:[], createdAt:new Date().toISOString() },
    { id:generateId(), projectId:'p4', description:'הראל - תיקון עיצוב למצגת', status:'בעבודה', priority:'דחוף',
      assignee:'', isManager:false, notes:'', reportLink:'https://method', hours:0, deadline:'', revisions:0, subtasks:[], history:[], createdAt:new Date().toISOString() },
    { id:generateId(), projectId:'', description:'סטטוס יומי עם אורי ודורית', status:'בעבודה', priority:'גבוה',
      assignee:'', isManager:true, notes:'לתאם זמנים', reportLink:'', hours:0, deadline:'', revisions:0, subtasks:[], history:[], createdAt:new Date().toISOString() },
    { id:generateId(), projectId:'', description:'לבדוק זמינות לוז של כל אחת ואחוז משרה', status:'בתיכנון', priority:'רגיל',
      assignee:'', isManager:true, notes:'', reportLink:'', hours:0, deadline:'', revisions:0, subtasks:[], history:[], createdAt:new Date().toISOString() }
];

// ===== Init defaults =====
function initData() {
    if (!loadDataRaw(STORAGE_KEYS.team)) localStorage.setItem(STORAGE_KEYS.team, JSON.stringify(DEFAULT_TEAM));
    if (!loadDataRaw(STORAGE_KEYS.projects)) localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(DEFAULT_PROJECTS));
    if (!loadDataRaw(STORAGE_KEYS.tasks)) localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(DEFAULT_TASKS));
    if (!loadDataRaw(STORAGE_KEYS.statuses)) localStorage.setItem(STORAGE_KEYS.statuses, JSON.stringify(getStatuses()));
    if (!loadDataRaw(STORAGE_KEYS.priorities)) localStorage.setItem(STORAGE_KEYS.priorities, JSON.stringify(getPriorities()));
    if (!loadDataRaw(STORAGE_KEYS.teamGroups)) localStorage.setItem(STORAGE_KEYS.teamGroups, JSON.stringify(getTeamGroups()));
    if (loadDataRaw(STORAGE_KEYS.autoBackup) === null) localStorage.setItem(STORAGE_KEYS.autoBackup, 'true');

    runMigrations();
}

// ===== Migrations =====
function runMigrations() {
    // v4: accurate org chart (Methodica — 2026-04-21). Replace groups + team fully.
    const MIGRATION_FLAG = 'studio_migration_v4_methodica_org';
    if (localStorage.getItem(MIGRATION_FLAG)) return;

    // Replace groups with the accurate hierarchy (user-added custom groups kept).
    const existingGroups = loadData(STORAGE_KEYS.teamGroups) || [];
    const defaultIds = new Set(DEFAULT_TEAM_GROUPS.map(g => g.id));
    const customKept = existingGroups.filter(g =>
        !g.divider && !defaultIds.has(g.id) &&
        // drop the old hierarchy ids that we replaced
        !['studio','720','management','consultants','dev-moran','dev-dalia','dev-ziv','production'].includes(g.id)
    );
    const mergedGroups = [...DEFAULT_TEAM_GROUPS, ...customKept];
    localStorage.setItem(STORAGE_KEYS.teamGroups, JSON.stringify(mergedGroups));

    // Replace team: start from new defaults, but carry over any extra fields
    // (strengths / requests / personal / notes / tasks history) for people whose IDs match.
    const existingTeam = loadData(STORAGE_KEYS.team) || [];
    const existingById = Object.fromEntries(existingTeam.map(m => [m.id, m]));
    const newTeam = DEFAULT_TEAM.map(m => {
        const old = existingById[m.id];
        if (!old) return m;
        return {
            ...m,
            strengths: old.strengths || m.strengths,
            requests: old.requests || m.requests,
            personal: old.personal || m.personal,
            general: old.general || m.general,
            notes: old.notes || m.notes,
            memberStatus: old.memberStatus || m.memberStatus,
            availability: old.availability ?? m.availability
        };
    });

    // Also keep any extra members the user added that aren't in defaults
    const newIds = new Set(DEFAULT_TEAM.map(m => m.id));
    const oldOldGroupIds = new Set(['studio','720','management','external','consultants','dev-moran','dev-dalia','dev-ziv','production']);
    existingTeam.forEach(m => {
        if (!newIds.has(m.id) && !oldOldGroupIds.has(m.group)) {
            // keep user-added custom members from groups we didn't remove
            newTeam.push(m);
        }
    });

    // Re-point task assignees from old IDs to matching new ones where possible
    const nameToNewId = Object.fromEntries(DEFAULT_TEAM.map(m => [m.name, m.id]));
    const oldById = existingById;
    const tasks = loadData(STORAGE_KEYS.tasks) || [];
    tasks.forEach(t => {
        if (!t.assignee) return;
        if (newTeam.find(m => m.id === t.assignee)) return; // still valid
        const oldMember = oldById[t.assignee];
        if (oldMember && nameToNewId[oldMember.name]) t.assignee = nameToNewId[oldMember.name];
        else t.assignee = '';
    });
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));

    localStorage.setItem(STORAGE_KEYS.team, JSON.stringify(newTeam));
    localStorage.setItem(MIGRATION_FLAG, '1');
}

function resetHierarchy() {
    if (!confirm('לאפס את מבנה הקבוצות לברירת המחדל החדשה? אנשי צוות קיימים יישמרו.')) return;
    localStorage.setItem(STORAGE_KEYS.teamGroups, JSON.stringify(DEFAULT_TEAM_GROUPS));
    // Ensure placeholder members exist
    const existingTeam = getTeam();
    const existingIds = new Set(existingTeam.map(m => m.id));
    const newMembers = DEFAULT_TEAM.filter(m => !existingIds.has(m.id));
    if (newMembers.length > 0) {
        existingTeam.push(...newMembers);
        saveData(STORAGE_KEYS.team, existingTeam);
    } else {
        saveData(STORAGE_KEYS.teamGroups, DEFAULT_TEAM_GROUPS);
    }
    renderTeam();
    toast('מבנה הקבוצות אופס', 'success');
}
function loadDataRaw(key) { return localStorage.getItem(key); }

// ===== BACKUP SYSTEM =====
// Tracks a "dirty" hash of the data. On each load, if today's date > last backup date AND dirty hash differs → auto-download JSON.
function collectAllData() {
    return {
        version: 2,
        exportedAt: new Date().toISOString(),
        tasks: getTasks(),
        projects: getProjects(),
        team: getTeam(),
        statuses: getStatuses(),
        priorities: getPriorities(),
        teamGroups: getTeamGroups()
    };
}

function simpleHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return h.toString(36);
}

function currentDataHash() {
    const d = collectAllData();
    delete d.exportedAt;
    return simpleHash(JSON.stringify(d));
}

function markDirty() {
    // Debounced refresh of backup indicator
    if (window._dirtyTimer) clearTimeout(window._dirtyTimer);
    window._dirtyTimer = setTimeout(() => {
        refreshBackupIndicator();
        updateBadges();
    }, 150);
}

function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
}

function manualBackup() {
    const data = collectAllData();
    const filename = `studio-backup-${todayISO()}.json`;
    downloadJson(filename, data);
    localStorage.setItem(STORAGE_KEYS.lastBackupDate, todayISO());
    localStorage.setItem(STORAGE_KEYS.lastBackupHash, currentDataHash());
    refreshBackupIndicator();
    toast('הגיבוי הורד בהצלחה', 'success');
}

function checkAutoBackup() {
    const enabled = localStorage.getItem(STORAGE_KEYS.autoBackup) !== 'false';
    if (!enabled) return;
    const last = localStorage.getItem(STORAGE_KEYS.lastBackupDate);
    const lastHash = localStorage.getItem(STORAGE_KEYS.lastBackupHash);
    const today = todayISO();
    const currentHash = currentDataHash();

    // First-ever run: record baseline without download (avoid immediate popup)
    if (!last) {
        localStorage.setItem(STORAGE_KEYS.lastBackupDate, today);
        localStorage.setItem(STORAGE_KEYS.lastBackupHash, currentHash);
        return;
    }

    // New day and data changed since last backup → auto-download
    if (last !== today && lastHash !== currentHash) {
        const data = collectAllData();
        const filename = `studio-backup-${today}.json`;
        downloadJson(filename, data);
        localStorage.setItem(STORAGE_KEYS.lastBackupDate, today);
        localStorage.setItem(STORAGE_KEYS.lastBackupHash, currentHash);
        setTimeout(() => toast(`גיבוי יומי אוטומטי נוצר: ${filename}`, 'success'), 500);
    } else if (last !== today && lastHash === currentHash) {
        // Same day rolled over with no changes — just update date so we don't check again today
        localStorage.setItem(STORAGE_KEYS.lastBackupDate, today);
    }
}

function restoreBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('שחזור מגיבוי ימחק את המידע הנוכחי ויחליף אותו. להמשיך?')) { e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.tasks) localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(data.tasks));
            if (data.projects) localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(data.projects));
            if (data.team) localStorage.setItem(STORAGE_KEYS.team, JSON.stringify(data.team));
            if (data.statuses) localStorage.setItem(STORAGE_KEYS.statuses, JSON.stringify(data.statuses));
            if (data.priorities) localStorage.setItem(STORAGE_KEYS.priorities, JSON.stringify(data.priorities));
            if (data.teamGroups) localStorage.setItem(STORAGE_KEYS.teamGroups, JSON.stringify(data.teamGroups));
            localStorage.setItem(STORAGE_KEYS.lastBackupHash, currentDataHash());
            toast('הנתונים שוחזרו בהצלחה', 'success');
            populateFilters();
            refreshCurrentView();
            refreshBackupIndicator();
            updateSettingsInfo();
        } catch (err) {
            toast('שגיאה בקריאת הקובץ', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function toggleAutoBackup() {
    const cur = localStorage.getItem(STORAGE_KEYS.autoBackup) !== 'false';
    localStorage.setItem(STORAGE_KEYS.autoBackup, (!cur).toString());
    updateSettingsInfo();
    toast(`גיבוי אוטומטי ${!cur ? 'הופעל' : 'הושבת'}`, 'info');
}

function resetAllData() {
    if (!confirm('למחוק את כל הנתונים ולהתחיל מחדש? (גיבוי ידני מומלץ קודם)')) return;
    if (!confirm('בטוח? פעולה זו אינה הפיכה.')) return;
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    location.reload();
}

function refreshBackupIndicator() {
    const ind = document.getElementById('backup-indicator');
    if (!ind) return;
    const text = ind.querySelector('.backup-text');
    const lastDate = localStorage.getItem(STORAGE_KEYS.lastBackupDate);
    const lastHash = localStorage.getItem(STORAGE_KEYS.lastBackupHash);
    const today = todayISO();
    const curHash = currentDataHash();

    if (!lastDate || lastHash === curHash) {
        ind.classList.remove('dirty','warning');
        text.textContent = 'מסונכרן';
        return;
    }
    if (lastDate === today) {
        ind.classList.add('dirty'); ind.classList.remove('warning');
        text.textContent = 'שינויים (יגובה מחר)';
    } else {
        ind.classList.add('warning'); ind.classList.remove('dirty');
        text.textContent = 'גיבוי נדרש';
    }
}

function updateSettingsInfo() {
    const lastEl = document.getElementById('last-backup-info');
    const dirtyEl = document.getElementById('dirty-status-info');
    const autoEl = document.getElementById('auto-backup-state');
    if (!lastEl) return;
    const last = localStorage.getItem(STORAGE_KEYS.lastBackupDate);
    lastEl.textContent = last || 'מעולם לא גובה';
    const lastHash = localStorage.getItem(STORAGE_KEYS.lastBackupHash);
    const clean = lastHash === currentDataHash();
    dirtyEl.textContent = clean ? 'אין שינויים' : 'יש שינויים מאז הגיבוי האחרון';
    dirtyEl.style.color = clean ? 'var(--done)' : 'var(--inprogress)';
    if (autoEl) {
        const enabled = localStorage.getItem(STORAGE_KEYS.autoBackup) !== 'false';
        autoEl.textContent = enabled ? 'גיבוי אוטומטי פעיל' : 'גיבוי אוטומטי כבוי';
    }
}

// ===== Settings modal =====
function openSettings() {
    document.getElementById('settings-modal').classList.add('active');
    updateSettingsInfo();
}
function closeSettings() { document.getElementById('settings-modal').classList.remove('active'); }

// ===== Theme =====
function applyTheme() {
    const t = localStorage.getItem(STORAGE_KEYS.theme) || 'light';
    document.documentElement.dataset.theme = t;
    const lbl = document.getElementById('theme-label');
    if (lbl) lbl.textContent = t === 'dark' ? 'מצב כהה ✓' : 'מצב כהה';
}
function toggleTheme() {
    const cur = localStorage.getItem(STORAGE_KEYS.theme) || 'light';
    localStorage.setItem(STORAGE_KEYS.theme, cur === 'light' ? 'dark' : 'light');
    applyTheme();
}

// ===== Toast =====
function toast(message, type = 'info') {
    const icons = { success: '✓', error: '⚠', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span><span>${message}</span>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => {
        el.classList.add('leaving');
        setTimeout(() => el.remove(), 300);
    }, 3200);
}

// Toast with an "Undo" button. `undoFn` is called if user clicks it within `duration` ms.
function toastWithUndo(message, undoFn, type = 'info', duration = 6000) {
    const icons = { success: '✓', error: '⚠', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = `toast toast-undo ${type}`;
    const undoId = 'undo_' + Date.now();
    el.innerHTML = `
        <span class="toast-icon">${icons[type] || ''}</span>
        <span class="toast-msg">${message}</span>
        <button class="toast-undo-btn" id="${undoId}">בטל</button>
        <div class="toast-progress"></div>
    `;
    document.getElementById('toast-container').appendChild(el);
    let undone = false;
    const btn = document.getElementById(undoId);
    btn.addEventListener('click', () => {
        if (undone) return;
        undone = true;
        try { undoFn(); } catch (e) { console.error('Undo failed:', e); }
        el.classList.add('leaving');
        setTimeout(() => el.remove(), 200);
        toast('הפעולה בוטלה', 'info');
    });
    // Animate progress bar
    requestAnimationFrame(() => {
        el.querySelector('.toast-progress').style.transition = `width ${duration}ms linear`;
        el.querySelector('.toast-progress').style.width = '0%';
    });
    setTimeout(() => {
        if (!undone) {
            el.classList.add('leaving');
            setTimeout(() => el.remove(), 300);
        }
    }, duration);
}

// ===== Command Palette =====
let commandSelectedIdx = 0;
let commandItems = [];

function openCommandPalette() {
    document.getElementById('command-palette').classList.add('active');
    const inp = document.getElementById('command-input');
    inp.value = '';
    inp.focus();
    renderCommandResults('');
}
function closeCommandPalette() {
    document.getElementById('command-palette').classList.remove('active');
}

function renderCommandResults(query) {
    const q = (query || '').toLowerCase().trim();
    const tasks = getTasks();
    const projects = getProjects();
    const team = getTeam();
    const container = document.getElementById('command-results');

    const actions = [
        { type: 'action', icon: '+', title: 'משימה חדשה', meta: 'Ctrl+N', fn: () => { closeCommandPalette(); openTaskModal(); } },
        { type: 'action', icon: '+', title: 'משימת ניהול חדשה', meta: '', fn: () => { closeCommandPalette(); openTaskModal(null, true); } },
        { type: 'action', icon: '↓', title: 'הורד גיבוי עכשיו', meta: 'Ctrl+B', fn: () => { closeCommandPalette(); manualBackup(); } },
        { type: 'action', icon: '⚙', title: 'הגדרות', meta: '', fn: () => { closeCommandPalette(); openSettings(); } },
        { type: 'action', icon: '☀', title: 'עבור לדף היום', meta: 'Ctrl+1', fn: () => { closeCommandPalette(); switchView('today'); } },
        { type: 'action', icon: '▣', title: 'סקירה', meta: 'Ctrl+2', fn: () => { closeCommandPalette(); switchView('dashboard'); } },
        { type: 'action', icon: '☰', title: 'טבלת משימות', meta: 'Ctrl+3', fn: () => { closeCommandPalette(); switchView('tasks'); } },
        { type: 'action', icon: '♟', title: 'ניהול צוות', meta: 'Ctrl+4', fn: () => { closeCommandPalette(); switchView('team'); } },
        { type: 'action', icon: '◧', title: 'פרויקטים', meta: 'Ctrl+5', fn: () => { closeCommandPalette(); switchView('projects'); } },
        { type: 'action', icon: '🌓', title: 'החלף מצב כהה/בהיר', meta: '', fn: () => { closeCommandPalette(); toggleTheme(); } }
    ];

    const taskItems = tasks.map(t => {
        const p = projects.find(pp => pp.id === t.projectId);
        return {
            type: 'task', icon: '☰',
            title: t.description,
            meta: (p ? p.name : '') + ' · ' + t.status,
            match: [t.description, t.notes, p?.name, t.status, t.priority].join(' ').toLowerCase(),
            fn: () => { closeCommandPalette(); editTask(t.id); }
        };
    });

    const projectItems = projects.map(p => ({
        type: 'project', icon: '◧',
        title: p.name, meta: p.description || '',
        match: `${p.name} ${p.description || ''}`.toLowerCase(),
        fn: () => { closeCommandPalette(); switchView('projects'); }
    }));

    const teamItems = team.map(m => ({
        type: 'team', icon: '♟',
        title: m.name, meta: m.role || '',
        match: `${m.name} ${m.role || ''} ${(m.skills || []).join(' ')}`.toLowerCase(),
        fn: () => { closeCommandPalette(); switchView('team'); setTimeout(() => openTeamProfile(m.id), 300); }
    }));

    const filterBy = q ? arr => arr.filter(it => (it.match || (it.title + ' ' + it.meta).toLowerCase()).includes(q)) : arr => arr;

    const filteredActions = filterBy(actions);
    const filteredTasks = filterBy(taskItems).slice(0, 8);
    const filteredProjects = filterBy(projectItems).slice(0, 5);
    const filteredTeam = filterBy(teamItems).slice(0, 5);

    commandItems = [...filteredActions, ...filteredTasks, ...filteredProjects, ...filteredTeam];
    commandSelectedIdx = 0;

    let html = '';
    if (filteredActions.length) html += renderCommandGroup('פעולות', filteredActions, 0);
    if (filteredTasks.length) html += renderCommandGroup('משימות', filteredTasks, filteredActions.length);
    if (filteredProjects.length) html += renderCommandGroup('פרויקטים', filteredProjects, filteredActions.length + filteredTasks.length);
    if (filteredTeam.length) html += renderCommandGroup('צוות', filteredTeam, filteredActions.length + filteredTasks.length + filteredProjects.length);
    if (!commandItems.length) html = '<div class="empty-state"><div class="empty-state-icon">∅</div><div class="empty-state-text">לא נמצאו תוצאות</div></div>';

    container.innerHTML = html;
    highlightCommandItem();
    container.querySelectorAll('.command-item').forEach((el, i) => {
        el.addEventListener('click', () => commandItems[parseInt(el.dataset.idx)].fn());
        el.addEventListener('mouseenter', () => { commandSelectedIdx = parseInt(el.dataset.idx); highlightCommandItem(); });
    });
}

function renderCommandGroup(title, items, startIdx) {
    let html = `<div class="command-group-title">${title}</div>`;
    items.forEach((it, i) => {
        const idx = startIdx + i;
        html += `<div class="command-item" data-idx="${idx}">
            <span class="command-item-icon">${it.icon}</span>
            <span class="command-item-title">${escapeHtml(it.title)}</span>
            <span class="command-item-meta">${escapeHtml(it.meta)}</span>
        </div>`;
    });
    return html;
}

function highlightCommandItem() {
    document.querySelectorAll('.command-item').forEach(el => {
        el.classList.toggle('selected', parseInt(el.dataset.idx) === commandSelectedIdx);
    });
    const sel = document.querySelector('.command-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
}

function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ===== Navigation =====
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => { e.preventDefault(); switchView(item.dataset.view); });
    });
}

function switchView(viewName) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    const view = document.getElementById(`view-${viewName}`);
    if (navItem) navItem.classList.add('active');
    if (view) view.classList.add('active');

    const titles = { today:'היום', dashboard:'סקירה', tasks:'משימות', team:'ניהול צוות', projects:'פרויקטים' };
    document.getElementById('page-title').textContent = titles[viewName] || viewName;

    const actions = document.getElementById('topbar-actions');
    if (viewName === 'team') {
        actions.innerHTML = '<button class="btn btn-primary" onclick="openTeamProfile()"><span>+</span> איש צוות חדש</button>';
    } else if (viewName === 'projects') {
        actions.innerHTML = '<button class="btn btn-primary" onclick="openProjectModal()"><span>+</span> פרויקט חדש</button>';
    } else {
        actions.innerHTML = '<button class="btn btn-primary" onclick="openTaskModal()"><span>+</span> משימה חדשה</button>';
    }

    if (viewName === 'today') renderToday();
    else if (viewName === 'tasks') renderTaskTable();
    else if (viewName === 'team') renderTeam();
    else if (viewName === 'projects') renderProjects();
}

// ===== Date / Greeting =====
function updateDate() {
    const now = new Date();
    const days = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
    const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    document.getElementById('current-date').textContent = `יום ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 5) return 'לילה טוב';
    if (h < 12) return 'בוקר טוב';
    if (h < 17) return 'צהריים טובים';
    if (h < 21) return 'ערב טוב';
    return 'לילה טוב';
}

// ===== Filters populate =====
function populateFilters() {
    const team = getTeam();
    const projects = getProjects();
    const statuses = getStatuses();
    const priorities = getPriorities();

    const statusSel = document.getElementById('filter-status');
    if (statusSel) {
        const cv = statusSel.value;
        statusSel.innerHTML = '<option value="all">כל הסטטוסים</option>';
        statuses.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; statusSel.appendChild(o); });
        statusSel.value = cv || 'all';
    }

    const priSel = document.getElementById('filter-priority');
    if (priSel) {
        const cv = priSel.value;
        priSel.innerHTML = '<option value="all">כל העדיפויות</option>';
        priorities.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; priSel.appendChild(o); });
        priSel.value = cv || 'all';
    }

    const dpSel = document.getElementById('filter-priority-dashboard');
    if (dpSel) {
        const cv = dpSel.value;
        dpSel.innerHTML = '<option value="all">כל העדיפויות</option>';
        priorities.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; dpSel.appendChild(o); });
        dpSel.value = cv || 'all';
    }

    ['filter-assignee-dashboard','task-assignee'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const cv = sel.value;
        const isFilter = id !== 'task-assignee';
        sel.innerHTML = isFilter ? '<option value="all">כל הצוות</option>' : '<option value="">בחר...</option>';
        team.forEach(m => { const o = document.createElement('option'); o.value = m.id; o.textContent = m.name; sel.appendChild(o); });
        sel.value = cv || (isFilter ? 'all' : '');
    });

    ['filter-project','task-project','quick-add-project'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const cv = sel.value;
        const isFilter = id === 'filter-project';
        const isQuick = id === 'quick-add-project';
        sel.innerHTML = isFilter ? '<option value="all">כל הפרויקטים</option>' :
                        isQuick ? '<option value="">ללא פרויקט</option>' :
                        '<option value="">בחר פרויקט...</option>';
        projects.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; sel.appendChild(o); });
        if (!isFilter && !isQuick) { const o = document.createElement('option'); o.value = '__new__'; o.textContent = '+ פרויקט חדש...'; sel.appendChild(o); }
        sel.value = cv || (isFilter ? 'all' : '');
    });

    const taskStatus = document.getElementById('task-status');
    if (taskStatus) {
        const cv = taskStatus.value;
        taskStatus.innerHTML = '';
        statuses.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; taskStatus.appendChild(o); });
        const mg = document.createElement('option'); mg.value = '__manage__'; mg.textContent = '⚙ ניהול סטטוסים...'; taskStatus.appendChild(mg);
        if (cv) taskStatus.value = cv;
    }
    const taskPriority = document.getElementById('task-priority');
    if (taskPriority) {
        const cv = taskPriority.value;
        taskPriority.innerHTML = '';
        priorities.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; taskPriority.appendChild(o); });
        const mg = document.createElement('option'); mg.value = '__manage__'; mg.textContent = '⚙ ניהול עדיפויות...'; taskPriority.appendChild(mg);
        if (cv) taskPriority.value = cv;
    }
}

function handleProjectSelect(sel) {
    const inp = document.getElementById('task-project-new');
    if (sel.value === '__new__') { inp.style.display = 'block'; inp.focus(); inp.required = true; }
    else { inp.style.display = 'none'; inp.value = ''; inp.required = false; }
}

// ===== Badges =====
function updateBadges() {
    const tasks = getTasks();
    const todayCount = tasks.filter(t => !t.isManager && t.status !== 'הושלם' && (t.priority === 'דחוף' || t.status === 'בעבודה')).length;
    const totalOpen = tasks.filter(t => t.status !== 'הושלם').length;
    const n1 = document.getElementById('nav-badge-today');
    const n2 = document.getElementById('nav-badge-tasks');
    if (n1) n1.textContent = todayCount;
    if (n2) n2.textContent = totalOpen;
}

// ===== Inline edit engine =====
function inlineUpdate(taskId, field, value) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (field === 'hours') value = parseFloat(value) || 0;
    if (field === 'revisions') value = parseInt(value) || 0;
    task[field] = value;
    saveData(STORAGE_KEYS.tasks, tasks);
}

function inlineUpdateAndRefresh(taskId, field, value) {
    inlineUpdate(taskId, field, value);
    refreshCurrentView();
}

function buildSelectHtml(taskId, field, currentValue, options, extraClass) {
    const cls = extraClass || '';
    const manageOpt = (field === 'status') ? `<option value="__manage_status__">⚙ ניהול...</option>` :
                      (field === 'priority') ? `<option value="__manage_priority__">⚙ ניהול...</option>` : '';
    const opts = options.map(o => {
        const val = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        return `<option value="${escapeHtml(val)}" ${val === currentValue ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }).join('');
    return `<select class="inline-select ${cls}" onchange="handleInlineSelect('${taskId}','${field}',this.value,this)">${opts}${manageOpt}</select>`;
}

function handleInlineSelect(taskId, field, value, el) {
    if (value === '__manage_status__') { el.value = el.dataset.prev || el.options[0].value; openCustomStatusModal('status'); return; }
    if (value === '__manage_priority__') { el.value = el.dataset.prev || el.options[0].value; openCustomStatusModal('priority'); return; }
    el.dataset.prev = value;
    inlineUpdateAndRefresh(taskId, field, value);
}

function buildTextHtml(taskId, field, currentValue, placeholder) {
    const escaped = (currentValue || '').replace(/"/g, '&quot;');
    return `<input type="text" class="inline-input" value="${escaped}" placeholder="${placeholder || ''}"
        onblur="inlineUpdate('${taskId}','${field}',this.value)" onkeydown="if(event.key==='Enter')this.blur()">`;
}

function buildNotesHtml(taskId, currentValue) {
    const escaped = escapeHtml(currentValue || '');
    return `<div class="notes-field">
        <textarea id="notes-${taskId}" class="inline-input notes-textarea" placeholder="הערות..."
            onblur="inlineUpdate('${taskId}','notes',this.value)"
            onkeydown="handleNotesBullet(event,'${taskId}')">${escaped}</textarea>
        <button type="button" class="bullet-btn" onclick="insertBullet('${taskId}')" title="הוסף בולט">•</button>
    </div>`;
}

function insertBullet(taskId) {
    const ta = document.getElementById('notes-' + taskId);
    if (!ta) return;
    const pos = ta.selectionStart;
    const val = ta.value;
    const newVal = val.slice(0, pos) + '• ' + val.slice(pos);
    ta.value = newVal;
    ta.selectionStart = ta.selectionEnd = pos + 2;
    ta.focus();
}

function handleNotesBullet(e, taskId) {
    if (e.key !== 'Enter') return;
    const ta = e.target;
    const pos = ta.selectionStart;
    const val = ta.value;
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
    const currentLine = val.slice(lineStart, pos);
    if (currentLine.startsWith('• ')) {
        e.preventDefault();
        const newVal = val.slice(0, pos) + '\n• ' + val.slice(pos);
        ta.value = newVal;
        ta.selectionStart = ta.selectionEnd = pos + 3;
    }
}

function buildNumberHtml(taskId, field, currentValue, placeholder) {
    return `<input type="number" class="inline-input inline-input-sm" value="${currentValue || ''}" placeholder="${placeholder || '0'}" step="0.5" min="0"
        onblur="inlineUpdate('${taskId}','${field}',this.value)" onkeydown="if(event.key==='Enter')this.blur()">`;
}

function buildDateHtml(taskId, field, currentValue) {
    return `<input type="date" class="inline-input" value="${currentValue || ''}" onchange="inlineUpdate('${taskId}','${field}',this.value)">`;
}

function buildSubtasksHtml(task) {
    const subs = task.subtasks || [];
    let html = '<div class="subtasks-area">';
    subs.forEach((st, i) => {
        html += `<div class="subtask-item ${st.done ? 'done' : ''}">
            <input type="checkbox" ${st.done ? 'checked' : ''} onchange="toggleSubtask('${task.id}',${i})">
            <input type="text" class="subtask-text-input" value="${escapeHtml(st.text)}"
                onblur="updateSubtaskText('${task.id}',${i},this.value)"
                onkeydown="if(event.key==='Enter')this.blur()">
            <button class="btn-icon" style="font-size:12px;margin-right:auto" onclick="removeSubtask('${task.id}',${i})">✕</button>
        </div>`;
    });
    html += `<div class="subtask-add">
        <input type="text" placeholder="תת-משימה חדשה..." id="sub-input-${task.id}" onkeydown="if(event.key==='Enter')addSubtask('${task.id}')">
        <button onclick="addSubtask('${task.id}')">+</button>
    </div></div>`;
    return html;
}

function addSubtask(taskId) {
    const input = document.getElementById('sub-input-' + taskId);
    if (!input || !input.value.trim()) return;
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (!task.subtasks) task.subtasks = [];
    task.subtasks.push({ text: input.value.trim(), done: false });
    saveData(STORAGE_KEYS.tasks, tasks);
    refreshCurrentView();
}

function toggleSubtask(taskId, index) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks[index]) return;
    task.subtasks[index].done = !task.subtasks[index].done;
    saveData(STORAGE_KEYS.tasks, tasks);
    refreshCurrentView();
}

function removeSubtask(taskId, index) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    task.subtasks.splice(index, 1);
    saveData(STORAGE_KEYS.tasks, tasks);
    refreshCurrentView();
}

function updateSubtaskText(taskId, index, newText) {
    if (!newText.trim()) return;
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks[index]) return;
    if (task.subtasks[index].text === newText) return;
    task.subtasks[index].text = newText;
    saveData(STORAGE_KEYS.tasks, tasks);
}

// ===== Custom statuses =====
let customStatusType = 'status';

function openCustomStatusModal(type) {
    customStatusType = type;
    document.getElementById('custom-status-title').textContent = type === 'status' ? 'ניהול סטטוסים' : 'ניהול עדיפויות';
    renderCustomStatusList();
    document.getElementById('custom-status-modal').classList.add('active');
}

function closeCustomStatusModal() {
    document.getElementById('custom-status-modal').classList.remove('active');
    populateFilters();
    refreshCurrentView();
}

function renderCustomStatusList() {
    const items = customStatusType === 'status' ? getStatuses() : getPriorities();
    const container = document.getElementById('custom-status-list');
    container.innerHTML = items.map((item, i) => `
        <div class="custom-status-item">
            <span>${escapeHtml(item)}</span>
            <button class="btn-icon" onclick="removeCustomStatus(${i})" title="מחיקה">✕</button>
        </div>
    `).join('');
}

function addCustomStatus() {
    const input = document.getElementById('new-custom-status');
    if (!input.value.trim()) return;
    const key = customStatusType === 'status' ? STORAGE_KEYS.statuses : STORAGE_KEYS.priorities;
    const items = customStatusType === 'status' ? getStatuses() : getPriorities();
    if (items.includes(input.value.trim())) return;
    items.push(input.value.trim());
    saveData(key, items);
    input.value = '';
    renderCustomStatusList();
}

function removeCustomStatus(index) {
    const key = customStatusType === 'status' ? STORAGE_KEYS.statuses : STORAGE_KEYS.priorities;
    const items = customStatusType === 'status' ? getStatuses() : getPriorities();
    if (items.length <= 1) return;
    items.splice(index, 1);
    saveData(key, items);
    renderCustomStatusList();
}

// ===== Today View =====
function renderToday() {
    const tasks = getTasks();
    const projects = getProjects();
    const statuses = getStatuses();
    const priorities = getPriorities();

    // Greeting & summary
    document.getElementById('today-greeting').textContent = `${getGreeting()} ☀`;
    const openTasks = tasks.filter(t => t.status !== 'הושלם');
    const mgr = openTasks.filter(t => t.isManager);
    const team = openTasks.filter(t => !t.isManager);
    const urgent = team.filter(t => t.priority === 'דחוף' || t.status === 'דחוף');
    const inprogress = team.filter(t => t.status === 'בעבודה');

    document.getElementById('today-summary').textContent =
        `יש לך ${openTasks.length} משימות פתוחות — ${urgent.length} דחופות, ${inprogress.length} בעבודה. ${mgr.length} משימות ניהול.`;

    // Progress ring based on today's completion rate
    const todayDone = tasks.filter(t => t.status === 'הושלם').length;
    const totalAll = tasks.length || 1;
    const pct = Math.round((todayDone / totalAll) * 100);
    const circum = 2 * Math.PI * 52;
    const offset = circum * (1 - pct / 100);
    document.getElementById('today-ring').style.strokeDashoffset = offset;
    document.getElementById('today-pct').textContent = pct + '%';

    const projectOpts = [{value:'',label:'ללא'}].concat(projects.map(p=>({value:p.id,label:p.name})));

    // Manager tasks — grouped by status like team tasks
    renderGroupedByStatus('today-manager-list', mgr, projectOpts, statuses, priorities, 'אין משימות ניהול');

    // Team tasks — grouped by status
    renderGroupedByStatus('today-team-list', team, projectOpts, statuses, priorities, 'אין משימות צוות');

    // Mini stats
    const mini = document.getElementById('mini-stats');
    mini.innerHTML = `
        <div class="mini-stat"><div class="mini-stat-value" style="color:var(--urgent)">${urgent.length}</div><div class="mini-stat-label">דחופות</div></div>
        <div class="mini-stat"><div class="mini-stat-value" style="color:var(--inprogress)">${inprogress.length}</div><div class="mini-stat-label">בעבודה</div></div>
        <div class="mini-stat"><div class="mini-stat-value" style="color:var(--planning)">${team.filter(t=>t.status==='בתיכנון').length}</div><div class="mini-stat-label">בתיכנון</div></div>
        <div class="mini-stat"><div class="mini-stat-value" style="color:var(--done)">${todayDone}</div><div class="mini-stat-label">הושלמו</div></div>
    `;



    // Reminders: overdue + due-soon
    const reminders = document.getElementById('reminders-list');
    const now = new Date(); now.setHours(0,0,0,0);
    const overdue = openTasks.filter(t => t.deadline && new Date(t.deadline) < now);
    const soon = openTasks.filter(t => t.deadline && ((new Date(t.deadline) - now) / (1000 * 60 * 60 * 24)) <= 3 && new Date(t.deadline) >= now);

    let html = '';
    if (overdue.length) {
        overdue.slice(0, 4).forEach(t => {
            html += `<div class="reminder overdue" onclick="editTask('${t.id}')" style="cursor:pointer"><strong>⚠ באיחור:</strong> ${escapeHtml(t.description)}</div>`;
        });
    }
    if (soon.length) {
        soon.slice(0, 4).forEach(t => {
            const d = new Date(t.deadline);
            html += `<div class="reminder" onclick="editTask('${t.id}')" style="cursor:pointer"><strong>${d.toLocaleDateString('he-IL')}:</strong> ${escapeHtml(t.description)}</div>`;
        });
    }
    if (!html) html = '<div class="reminder" style="text-align:center;color:var(--text-light);border-right-color:var(--text-light)">אין דדליינים קרובים</div>';
    reminders.innerHTML = html;

    // Completed tasks section (bottom of page)
    const completedTasks = tasks.filter(t => t.status === 'הושלם');
    const completedEl = document.getElementById('today-completed-list');
    const completedCountEl = document.getElementById('count-completed');
    if (completedEl) {
        if (completedTasks.length === 0) {
            completedEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">טרם הושלמו משימות</div></div>';
        } else {
            completedEl.innerHTML = completedTasks.map(t => renderTaskRow(t, projectOpts, statuses, priorities)).join('');
        }
    }
    if (completedCountEl) completedCountEl.textContent = completedTasks.length;

    initTaskDrag('today-manager-list');
    initTaskDrag('today-team-list');
    initColumnDropZones();
}

function renderTaskListInto(elementId, tasks, projectOpts, statuses, priorities, emphasized, emptyMsg) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (tasks.length === 0) {
        el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">${emptyMsg}</div></div>`;
        return;
    }
    el.innerHTML = tasks.map(task => renderTaskRow(task, projectOpts, statuses, priorities)).join('');
}

// Status ordering priority for grouping: urgent first, then in-progress, then QA, then planning, done last
const STATUS_SORT_PRIORITY = { 'דחוף': 0, 'בעבודה': 1, 'בבדיקה': 2, 'בתיכנון': 3, 'הושלם': 99 };

function statusRank(status) {
    return STATUS_SORT_PRIORITY[status] !== undefined ? STATUS_SORT_PRIORITY[status] : 50;
}

function getStatusCssClass(status) {
    const map = { 'דחוף': 'urgent', 'בעבודה': 'inprogress', 'בתיכנון': 'planning', 'בבדיקה': 'inprogress', 'הושלם': 'done' };
    return map[status] || 'planning';
}

function renderGroupedByStatus(elementId, tasks, projectOpts, statuses, priorities, emptyMsg) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (tasks.length === 0) {
        el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">${emptyMsg}</div></div>`;
        return;
    }

    // Group by status
    const groups = {};
    tasks.forEach(t => {
        if (!groups[t.status]) groups[t.status] = [];
        groups[t.status].push(t);
    });
    // Sort each group by: sortOrder (if set), then createdAt descending (newest first)
    Object.keys(groups).forEach(s => {
        groups[s].sort((a, b) => {
            const soA = a.sortOrder != null ? a.sortOrder : 9999;
            const soB = b.sortOrder != null ? b.sortOrder : 9999;
            if (soA !== soB) return soA - soB;
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    });

    // Render ordered groups
    const orderedStatuses = Object.keys(groups).sort((a, b) => statusRank(a) - statusRank(b));
    el.innerHTML = orderedStatuses.map(status => {
        const cls = getStatusCssClass(status);
        const list = groups[status];
        return `<div class="status-group" data-status="${status}">
            <div class="status-group-header">
                <span class="status-group-label status-${cls}">${escapeHtml(status)}</span>
                <span class="count-pill">${list.length}</span>
            </div>
            <div class="status-group-list">
                ${list.map(t => renderTaskRow(t, projectOpts, statuses, priorities)).join('')}
            </div>
        </div>`;
    }).join('');
}

function buildTeamOpts() {
    const team = getTeam();
    return [{value:'',label:'—'}].concat(team.map(m => ({value: m.id, label: m.name})));
}

function buildLinkBtnHtml(taskId, currentValue) {
    const url = (currentValue || '').trim();
    if (!url) {
        return `<button class="link-edit-btn link-empty" onclick="promptEditLink('${taskId}')" title="הוסף קישור">🔗</button>`;
    }
    const safe = escapeHtml(url);
    return `<div class="link-edit-wrap">
        <a href="${safe}" target="_blank" rel="noopener" class="link-btn" title="${safe}">🔗 פתח</a>
        <button class="link-edit-btn" onclick="promptEditLink('${taskId}')" title="עריכת הקישור">✎</button>
    </div>`;
}

function promptEditLink(taskId) {
    const tasks = getTasks();
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;
    const v = window.prompt('קישור לשורת דיווח:', t.reportLink || '');
    if (v === null) return;
    inlineUpdate(taskId, 'reportLink', v.trim());
    refreshCurrentView();
}

function renderTaskRow(task, projectOpts, statuses, priorities) {
    const isDone = task.status === 'הושלם';
    const teamOpts = buildTeamOpts();
    const linkIndicator = (task.reportLink || '').trim()
        ? `<a href="${escapeHtml(task.reportLink)}" target="_blank" rel="noopener" class="task-link-chip" title="פתח דיווח" onclick="event.stopPropagation()">🔗</a>`
        : '';
    return `
        <div class="task-item" data-status="${task.status}" data-task-id="${task.id}" draggable="true">
            <div class="task-item-top">
                <span class="drag-handle task-drag" title="גרור לשינוי סדר">⠿</span>
                <button class="task-check ${isDone ? 'checked' : ''}" onclick="quickToggleDone('${task.id}')" title="סמן כהושלם">${isDone ? '✓' : ''}</button>
                <div class="inline-cell cell-project">${buildSelectHtml(task.id, 'projectId', task.projectId, projectOpts)}</div>
                <div class="top-spacer"></div>
                <div class="inline-cell cell-assignee">${buildSelectHtml(task.id, 'assignee', task.assignee || '', teamOpts)}</div>
                <div class="inline-cell cell-status">${buildSelectHtml(task.id, 'status', task.status, statuses)}</div>
                <div class="inline-cell cell-priority">${buildSelectHtml(task.id, 'priority', task.priority, priorities)}</div>
                <button class="btn-icon btn-edit" onclick="editTask('${task.id}')" title="עריכה מלאה">✎</button>
                <button class="btn-icon" onclick="deleteTask('${task.id}')" title="מחיקה">✕</button>
            </div>
            <div class="task-item-body">
                <div class="task-title-row">
                    ${buildTextHtml(task.id, 'description', task.description, 'תיאור המשימה...')}
                    ${linkIndicator}
                </div>
                ${buildNotesHtml(task.id, task.notes)}
                ${buildSubtasksHtml(task)}
            </div>
        </div>`;
}

function quickToggleDone(taskId) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const statuses = getStatuses();
    const doneLabel = statuses.find(s => s === 'הושלם') || 'הושלם';
    const prevStatus = task.status;

    const undoFn = () => {
        const current = getTasks();
        const t = current.find(x => x.id === taskId);
        if (t) { t.status = prevStatus; saveData(STORAGE_KEYS.tasks, current); refreshCurrentView(); }
    };

    if (task.status === doneLabel) {
        task.status = statuses.find(s => s === 'בעבודה') || statuses[0];
        saveData(STORAGE_KEYS.tasks, tasks);
        refreshCurrentView();
        toastWithUndo('הוחזר לעבודה', undoFn, 'info');
    } else {
        task.status = doneLabel;
        // Visual celebration — animate the row out, then rerender
        const row = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
        if (row) {
            row.classList.add('completing');
            setTimeout(() => {
                saveData(STORAGE_KEYS.tasks, tasks);
                refreshCurrentView();
                toastWithUndo('כל הכבוד! הושלמה משימה ✨', undoFn, 'success');
            }, 450);
            return;
        }
        saveData(STORAGE_KEYS.tasks, tasks);
        refreshCurrentView();
        toastWithUndo('משימה הושלמה ✨', undoFn, 'success');
    }
}

// ===== Task table =====
function renderTaskTable() {
    const tasks = getTasks();
    const projects = getProjects();
    const statuses = getStatuses();
    const priorities = getPriorities();

    const statusF = document.getElementById('filter-status').value;
    const priorityF = document.getElementById('filter-priority').value;
    const projectF = document.getElementById('filter-project').value;
    const searchF = document.getElementById('filter-search').value.toLowerCase();

    let filtered = tasks.filter(t => !t.isManager);
    if (statusF !== 'all') filtered = filtered.filter(t => t.status === statusF);
    if (priorityF !== 'all') filtered = filtered.filter(t => t.priority === priorityF);
    if (projectF !== 'all') filtered = filtered.filter(t => t.projectId === projectF);
    if (searchF) {
        filtered = filtered.filter(t => {
            const p = projects.find(pp => pp.id === t.projectId);
            const team = getTeam();
            const a = team.find(m => m.id === t.assignee);
            return [t.description,t.notes,t.status,t.priority,p?p.name:'',a?a.name:''].join(' ').toLowerCase().includes(searchF);
        });
    }

    const tbody = document.getElementById('task-table-body');
    const COLS = 11;
    if (filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="${COLS}" style="text-align:center;padding:30px;color:var(--text-light)">לא נמצאו משימות</td></tr>`; return; }

    // Group by status, then sort by createdAt desc inside each group
    const groups = {};
    filtered.forEach(t => { if (!groups[t.status]) groups[t.status] = []; groups[t.status].push(t); });
    Object.keys(groups).forEach(s => {
        groups[s].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    });
    const orderedStatuses = Object.keys(groups).sort((a, b) => statusRank(a) - statusRank(b));

    const projectOpts = [{value:'',label:'-'}].concat(projects.map(p=>({value:p.id,label:p.name})));
    const teamOpts = buildTeamOpts();

    const createdLabel = (task) => {
        if (!task.createdAt) return '';
        const d = new Date(task.createdAt);
        return `<span class="task-created-meta">נוצר ${d.toLocaleDateString('he-IL')}</span>`;
    };

    tbody.innerHTML = orderedStatuses.map(status => {
        const cls = getStatusCssClass(status);
        const rows = groups[status].map(task => `<tr data-task-id="${task.id}">
            <td>${buildSelectHtml(task.id,'projectId',task.projectId,projectOpts)}</td>
            <td>${buildSelectHtml(task.id,'priority',task.priority,priorities)}</td>
            <td>${buildSelectHtml(task.id,'status',task.status,statuses)}</td>
            <td>${buildSelectHtml(task.id,'assignee',task.assignee || '',teamOpts)}</td>
            <td>${buildTextHtml(task.id,'description',task.description,'תיאור...')}${createdLabel(task)}${buildSubtasksHtml(task)}</td>
            <td class="notes-cell">${buildTextHtml(task.id,'notes',task.notes,'הערות...')}</td>
            <td>${buildLinkBtnHtml(task.id,task.reportLink)}</td>
            <td>${buildNumberHtml(task.id,'hours',task.hours,'0')}</td>
            <td>${buildDateHtml(task.id,'deadline',task.deadline)}</td>
            <td>${buildNumberHtml(task.id,'revisions',task.revisions,'0')}</td>
            <td class="row-actions">
                <button class="btn-icon btn-edit" onclick="editTask('${task.id}')" title="עריכה מלאה">✎</button>
                <button class="btn-icon" onclick="deleteTask('${task.id}')" title="מחיקה">✕</button>
            </td>
        </tr>`).join('');
        return `<tr class="table-group-header status-group-row status-${cls}"><td colspan="${COLS}">
            <span class="status-group-label status-${cls}">${escapeHtml(status)}</span>
            <span class="count-pill">${groups[status].length}</span>
        </td></tr>${rows}`;
    }).join('');
}

// ===== Drag for tasks =====
function initTaskDrag(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let draggedEl = null;

    container.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.task-item[draggable]');
        if (!item) return;
        draggedEl = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.dataset.taskId);
    });
    container.addEventListener('dragend', () => {
        if (draggedEl) draggedEl.classList.remove('dragging');
        container.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over-above','drag-over-below'));
        draggedEl = null;
    });
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const target = e.target.closest('.task-item[draggable]');
        if (!target || target === draggedEl) return;
        container.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over-above','drag-over-below'));
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        target.classList.add(e.clientY < midY ? 'drag-over-above' : 'drag-over-below');
    });
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        const target = e.target.closest('.task-item[draggable]');
        if (!target || !draggedEl || target === draggedEl) return;
        target.classList.remove('drag-over-above','drag-over-below');
        const fromId = draggedEl.dataset.taskId;
        const toId = target.dataset.taskId;
        const rect = target.getBoundingClientRect();
        const insertAfter = e.clientY > rect.top + rect.height / 2;
        reorderTasks(fromId, toId, insertAfter, containerId);
    });
}

function reorderTasks(fromId, toId, insertAfter, containerId) {
    const tasks = getTasks();
    const isManager = containerId.includes('manager');
    const listTasks = tasks.filter(t => t.isManager === isManager && t.status !== 'הושלם');
    const listIds = listTasks.map(t => t.id);
    const fromIdx = listIds.indexOf(fromId);
    const toIdx = listIds.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    listIds.splice(fromIdx, 1);
    let newIdx = listIds.indexOf(toId);
    if (insertAfter) newIdx += 1;
    listIds.splice(newIdx, 0, fromId);
    listIds.forEach((id, i) => {
        const task = tasks.find(t => t.id === id);
        if (task) task.sortOrder = i;
    });
    saveData(STORAGE_KEYS.tasks, tasks);
    refreshCurrentView();
}

// === Cross-column drag: switch isManager flag ===
function initColumnDropZones() {
    const managerCol = document.querySelector('.today-col-main');
    const teamCol = document.querySelector('.today-col-team');
    if (!managerCol || !teamCol) return;

    function setupDropZone(colEl, targetIsManager) {
        colEl.addEventListener('dragover', (e) => {
            // Only respond if dragged item is from the OTHER column
            const dragging = document.querySelector('.task-item.dragging');
            if (!dragging) return;
            const srcIsManager = dragging.closest('.today-col-main') !== null;
            if (srcIsManager === targetIsManager) return; // same column, handled by initTaskDrag
            e.preventDefault();
            colEl.classList.add('drag-over');
        });
        colEl.addEventListener('dragleave', (e) => {
            if (!colEl.contains(e.relatedTarget)) {
                colEl.classList.remove('drag-over');
            }
        });
        colEl.addEventListener('drop', (e) => {
            colEl.classList.remove('drag-over');
            const dragging = document.querySelector('.task-item.dragging');
            if (!dragging) return;
            const srcIsManager = dragging.closest('.today-col-main') !== null;
            if (srcIsManager === targetIsManager) return; // same column
            e.preventDefault();
            e.stopPropagation();
            const taskId = e.dataTransfer.getData('text/plain');
            if (!taskId) return;
            const tasks = getTasks();
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            // Record history
            const history = task.history || [];
            const prevIsManager = task.isManager;
            history.push({ timestamp: new Date().toISOString(), field: 'isManager', oldValue: prevIsManager, newValue: targetIsManager, editedBy: 'drag' });
            task.isManager = targetIsManager;
            task.history = history;

            saveData(STORAGE_KEYS.tasks, tasks);
            refreshCurrentView();
            toastWithUndo(
                targetIsManager ? 'הועבר למשימות ניהול' : 'הועבר למשימות צוות',
                () => {
                    const current = getTasks();
                    const t = current.find(x => x.id === taskId);
                    if (t) { t.isManager = prevIsManager; saveData(STORAGE_KEYS.tasks, current); refreshCurrentView(); }
                },
                'success'
            );
        });
    }

    setupDropZone(managerCol, true);
    setupDropZone(teamCol, false);
}

// ===== Team =====
function renderTeam() {
    const team = getTeam();
    const tasks = getTasks();
    const groups = getTeamGroups();

    const container = document.getElementById('team-groups-container');
    container.innerHTML = groups.map((group, idx) => {
        // Divider (visual separator, non-interactive)
        if (group.divider) {
            return `<div class="group-divider" data-group-id="${group.id}" draggable="true" data-idx="${idx}">
                <span class="group-divider-handle">⠿</span>
                <span class="group-divider-line"></span>
                <input type="text" class="group-divider-label" value="${escapeHtml(group.name)}"
                    onblur="renameTeamGroup('${group.id}',this.value)" onkeydown="if(event.key==='Enter')this.blur()">
                <span class="group-divider-line"></span>
                <button class="btn-icon" onclick="deleteTeamGroup('${group.id}')" title="מחיקת מפריד">✕</button>
            </div>`;
        }
        const members = team.filter(m => m.group === group.id);
        const nameEscaped = (group.name || '').replace(/"/g, '&quot;');
        const dimClass = group.dim ? 'dim' : '';
        const pinClass = group.pinned ? 'pinned' : '';
        return `
            <div class="section team-group-section ${dimClass} ${pinClass}" data-group-id="${group.id}" data-idx="${idx}" draggable="true">
                <div class="section-header group-header">
                    <div style="display:flex;align-items:center;gap:8px;flex:1">
                        <span class="group-drag-handle" title="גרור להעביר קבוצה">⠿</span>
                        ${group.pinned ? '<span class="pin-badge" title="הצוות שלי">★</span>' : ''}
                        <input type="text" class="inline-input group-name-input" value="${nameEscaped}"
                            onblur="renameTeamGroup('${group.id}',this.value)" onkeydown="if(event.key==='Enter')this.blur()">
                        <span class="count-pill">${members.length}</span>
                        <button class="btn-icon group-toggle-dim" onclick="toggleGroupDim('${group.id}')" title="${group.dim ? 'הבלט קבוצה' : 'הסתר ברמה בסיסית'}">${group.dim ? '◉' : '◎'}</button>
                    </div>
                    <button class="btn-icon" onclick="deleteTeamGroup('${group.id}')" title="מחיקת קבוצה">✕</button>
                </div>
                <div class="team-grid team-drop-zone" data-group-id="${group.id}">
                    ${members.length > 0
                        ? members.map(m => renderTeamCard(m, tasks, group.dim)).join('')
                        : '<div class="empty-state" style="padding:20px;grid-column:1/-1"><div class="empty-state-text">גרור אנשי צוות לכאן</div></div>'}
                </div>
            </div>`;
    }).join('');

    const groupSelect = document.getElementById('team-group-select');
    if (groupSelect) {
        const cv = groupSelect.value;
        groupSelect.innerHTML = '';
        groups.filter(g => !g.divider).forEach(g => {
            const o = document.createElement('option');
            o.value = g.id;
            o.textContent = g.name;
            groupSelect.appendChild(o);
        });
        if (cv) groupSelect.value = cv;
    }

    initTeamDrag();
    initGroupDrag();
}

function toggleGroupDim(groupId) {
    const groups = getTeamGroups();
    const g = groups.find(gg => gg.id === groupId);
    if (!g) return;
    g.dim = !g.dim;
    saveData(STORAGE_KEYS.teamGroups, groups);
    renderTeam();
}

// Drag & drop for reordering entire groups
function initGroupDrag() {
    const container = document.getElementById('team-groups-container');
    if (!container) return;
    let draggedGroup = null;

    container.querySelectorAll('[draggable="true"]').forEach(el => {
        el.addEventListener('dragstart', (e) => {
            // Only respond if the drag started on the group header (not a card)
            if (e.target.closest('.team-card')) return;
            draggedGroup = el;
            el.classList.add('group-dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('application/group-id', el.dataset.groupId);
        });
        el.addEventListener('dragend', () => {
            if (draggedGroup) draggedGroup.classList.remove('group-dragging');
            container.querySelectorAll('[data-group-id]').forEach(n => n.classList.remove('group-drag-over'));
            draggedGroup = null;
        });
        el.addEventListener('dragover', (e) => {
            if (!draggedGroup || draggedGroup === el) return;
            // Don't intercept card drags
            if (!e.dataTransfer.types.includes('application/group-id')) return;
            e.preventDefault();
            el.classList.add('group-drag-over');
        });
        el.addEventListener('dragleave', () => el.classList.remove('group-drag-over'));
        el.addEventListener('drop', (e) => {
            if (!draggedGroup || draggedGroup === el) return;
            if (!e.dataTransfer.types.includes('application/group-id')) return;
            e.preventDefault();
            e.stopPropagation();
            el.classList.remove('group-drag-over');
            const fromId = e.dataTransfer.getData('application/group-id');
            const toId = el.dataset.groupId;
            reorderGroups(fromId, toId, e);
        });
    });
}

function reorderGroups(fromId, toId, e) {
    const groups = getTeamGroups();
    const fromIdx = groups.findIndex(g => g.id === fromId);
    const toIdx = groups.findIndex(g => g.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const insertAfter = e.clientY > rect.top + rect.height / 2;

    const [moved] = groups.splice(fromIdx, 1);
    let newIdx = groups.findIndex(g => g.id === toId);
    if (insertAfter) newIdx += 1;
    groups.splice(newIdx, 0, moved);

    saveData(STORAGE_KEYS.teamGroups, groups);
    renderTeam();
    toast('סדר הקבוצות עודכן', 'success');
}

function addTeamDivider() {
    const groups = getTeamGroups();
    groups.push({ id: '__divider_' + generateId(), name: 'מפריד חדש', divider: true });
    saveData(STORAGE_KEYS.teamGroups, groups);
    renderTeam();
}

function renderTeamCard(member, tasks, isDim) {
    const openTasks = tasks.filter(t => t.assignee === member.id && t.status !== 'הושלם').length;
    const initials = member.name.split(' ').map(w => w[0]).join('').substring(0, 2);
    const ms = member.memberStatus || 'זמין';
    const dotColor = ms === 'עמוס' ? 'var(--urgent)' : ms === 'חופשה' ? 'var(--inprogress)' : ms === 'לא זמין' ? 'var(--text-light)' : 'var(--done)';

    // Compact "dim" layout for groups outside my area — just avatar + name + role
    if (isDim) {
        return `
            <div class="team-card team-card-dim" draggable="true" data-member-id="${member.id}" data-group="${member.group}" onclick="openTeamProfile('${member.id}')">
                <div class="team-avatar-sm" style="background:${member.color}">${initials}</div>
                <div class="team-card-dim-info">
                    <div class="team-name">${escapeHtml(member.name)}</div>
                    <div class="team-role">${escapeHtml(member.role || '')}</div>
                </div>
            </div>`;
    }

    return `
        <div class="team-card" draggable="true" data-member-id="${member.id}" data-group="${member.group}" onclick="openTeamProfile('${member.id}')">
            <span class="drag-handle" onclick="event.stopPropagation()">⠿</span>
            <div class="team-tasks-count">${openTasks} משימות</div>
            <div class="team-card-header">
                <div class="team-avatar" style="background:${member.color}">${initials}</div>
                <div>
                    <div class="team-name">${escapeHtml(member.name)}</div>
                    <div class="team-role">${escapeHtml(member.role || '')}</div>
                </div>
            </div>
            <div class="team-details">
                <div class="team-detail">
                    <span style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0;box-shadow:0 0 6px ${dotColor}"></span>
                    <button class="status-dot-btn" onclick="event.stopPropagation();cycleTeamStatus('${member.id}')">${ms}</button>
                    ${member.availability ? ` · ${member.availability}% משרה` : ''}
                </div>
                ${member.strengths ? `<div class="team-detail">💪 ${escapeHtml(member.strengths.substring(0,50))}</div>` : ''}
            </div>
            ${member.skills && member.skills.length > 0 ? `<div class="team-skills">${member.skills.map(s=>`<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
        </div>`;
}

function cycleTeamStatus(memberId) {
    const team = getTeam();
    const m = team.find(t => t.id === memberId);
    if (!m) return;
    const cycle = ['זמין','עמוס','חופשה','לא זמין'];
    const idx = cycle.indexOf(m.memberStatus || 'זמין');
    m.memberStatus = cycle[(idx + 1) % cycle.length];
    saveData(STORAGE_KEYS.team, team);
    renderTeam();
}

function addTeamGroup() {
    const groups = getTeamGroups();
    const newId = 'group_' + generateId();
    groups.push({ id: newId, name: 'קבוצה חדשה', dim: false });
    saveData(STORAGE_KEYS.teamGroups, groups);
    renderTeam();
}

function renameTeamGroup(groupId, newName) {
    const groups = getTeamGroups();
    const g = groups.find(gg => gg.id === groupId);
    if (g) { g.name = newName.trim() || g.name; saveData(STORAGE_KEYS.teamGroups, groups); }
}

function deleteTeamGroup(groupId) {
    const groups = getTeamGroups();
    if (groups.length <= 1) { toast('חייב להישאר לפחות קבוצה אחת', 'error'); return; }
    const team = getTeam();
    const membersInGroup = team.filter(m => m.group === groupId);
    if (membersInGroup.length > 0) {
        if (!confirm(`בקבוצה ${membersInGroup.length} אנשים. הם יועברו לקבוצה הראשונה. להמשיך?`)) return;
        const firstGroup = groups.find(g => g.id !== groupId);
        membersInGroup.forEach(m => m.group = firstGroup.id);
        saveData(STORAGE_KEYS.team, team);
    }
    saveData(STORAGE_KEYS.teamGroups, groups.filter(g => g.id !== groupId));
    renderTeam();
}

function initTeamDrag() {
    document.querySelectorAll('.team-card[draggable]').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.dataset.memberId);
            e.dataTransfer.effectAllowed = 'move';
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            document.querySelectorAll('.team-card').forEach(c => c.classList.remove('drag-over'));
            document.querySelectorAll('.team-drop-zone').forEach(z => z.classList.remove('drop-zone-active'));
        });
    });

    document.querySelectorAll('.team-card[draggable]').forEach(card => {
        card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
        card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
        card.addEventListener('drop', (e) => {
            e.preventDefault(); e.stopPropagation();
            card.classList.remove('drag-over');
            const fromId = e.dataTransfer.getData('text/plain');
            const toId = card.dataset.memberId;
            if (fromId === toId) return;
            moveTeamMember(fromId, toId, card.closest('.team-drop-zone').dataset.groupId);
        });
    });

    document.querySelectorAll('.team-drop-zone').forEach(zone => {
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drop-zone-active'); });
        zone.addEventListener('dragleave', (e) => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('drop-zone-active'); });
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drop-zone-active');
            const fromId = e.dataTransfer.getData('text/plain');
            if (!fromId) return;
            if (e.target === zone || e.target.closest('.empty-state')) {
                const team = getTeam();
                const m = team.find(mm => mm.id === fromId);
                if (m) { m.group = zone.dataset.groupId; saveData(STORAGE_KEYS.team, team); renderTeam(); }
            }
        });
    });
}

function moveTeamMember(fromId, toId, targetGroupId) {
    const team = getTeam();
    const fromIdx = team.findIndex(m => m.id === fromId);
    const toIdx = team.findIndex(m => m.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = team.splice(fromIdx, 1);
    moved.group = targetGroupId;
    const newToIdx = team.findIndex(m => m.id === toId);
    team.splice(newToIdx, 0, moved);
    saveData(STORAGE_KEYS.team, team);
    renderTeam();
}

function openTeamProfile(memberId) {
    const team = getTeam();
    let member = memberId ? team.find(m => m.id === memberId) : null;
    const isNew = !member;

    if (isNew) {
        document.getElementById('team-modal-title').textContent = 'איש צוות חדש';
        document.getElementById('team-member-id').value = '';
        document.getElementById('team-profile-header').innerHTML = '';
        document.getElementById('team-name-input').value = '';
        document.getElementById('team-role-input').value = '';
        document.getElementById('team-availability').value = 100;
        document.getElementById('team-status-select').value = 'זמין';
        document.getElementById('team-group-select').value = 'studio';
        document.getElementById('team-color-input').value = '#' + Math.floor(Math.random()*0xCCCCCC+0x333333).toString(16);
        ['team-strengths','team-personal','team-general','team-skills-input'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('team-member-tasks').innerHTML = '';
        document.getElementById('btn-delete-member').style.display = 'none';
    } else {
        const initials = member.name.split(' ').map(w => w[0]).join('').substring(0, 2);
        document.getElementById('team-modal-title').textContent = member.name;
        document.getElementById('team-member-id').value = memberId;
        document.getElementById('team-profile-header').innerHTML = `
            <div class="team-profile-avatar" style="background:${member.color}">${initials}</div>
            <div class="team-profile-info"><div class="team-profile-name">${escapeHtml(member.name)}</div><div class="team-profile-role">${escapeHtml(member.role || '')}</div></div>`;
        document.getElementById('team-name-input').value = member.name || '';
        document.getElementById('team-role-input').value = member.role || '';
        document.getElementById('team-availability').value = member.availability || 0;
        document.getElementById('team-status-select').value = member.memberStatus || 'זמין';
        document.getElementById('team-group-select').value = member.group || 'studio';
        document.getElementById('team-color-input').value = member.color || '#6366f1';
        // Combine strengths + requests into one field
        const combinedStrengths = [member.strengths, member.requests].filter(x => x && x.trim()).join('\n\n');
        document.getElementById('team-strengths').value = combinedStrengths;
        document.getElementById('team-personal').value = member.personal || '';
        document.getElementById('team-general').value = member.general || member.notes || '';
        document.getElementById('team-skills-input').value = (member.skills || []).join(', ');
        document.getElementById('btn-delete-member').style.display = '';

        const tasks = getTasks();
        const memberTasks = tasks.filter(t => t.assignee === memberId && t.status !== 'הושלם');
        const tasksEl = document.getElementById('team-member-tasks');
        tasksEl.innerHTML = memberTasks.length === 0
            ? '<div style="color:var(--text-light);font-size:13px;padding:8px">אין משימות פתוחות</div>'
            : memberTasks.map(t => `<div class="team-member-task-item"><span>${escapeHtml(t.description)}</span><span class="badge ${getStatusBadgeClass(t.status)}">${t.status}</span></div>`).join('');
    }

    document.getElementById('team-modal').classList.add('active');
}

function closeTeamModal() { document.getElementById('team-modal').classList.remove('active'); }

function saveTeamProfile(e) {
    e.preventDefault();
    const team = getTeam();
    const memberId = document.getElementById('team-member-id').value;
    const groupVal = document.getElementById('team-group-select').value;
    const data = {
        name: document.getElementById('team-name-input').value,
        role: document.getElementById('team-role-input').value,
        availability: parseInt(document.getElementById('team-availability').value) || 0,
        memberStatus: document.getElementById('team-status-select').value,
        group: groupVal,
        color: document.getElementById('team-color-input').value,
        strengths: document.getElementById('team-strengths').value, // now combined
        requests: '', // kept for backward compat
        personal: document.getElementById('team-personal').value, // now "עיסוק בארגון"
        general: document.getElementById('team-general').value,
        notes: document.getElementById('team-general').value,
        skills: document.getElementById('team-skills-input').value.split(',').map(s=>s.trim()).filter(s=>s),
        type: ['external'].includes(groupVal) ? 'external' : 'internal'
    };

    if (memberId) {
        const idx = team.findIndex(m => m.id === memberId);
        if (idx !== -1) team[idx] = { ...team[idx], ...data };
    } else {
        team.push({ id: generateId(), ...data });
    }
    saveData(STORAGE_KEYS.team, team);
    closeTeamModal();
    populateFilters();
    renderTeam();
    toast('פרטי איש הצוות נשמרו', 'success');
}

function deleteTeamMember() {
    const memberId = document.getElementById('team-member-id').value;
    if (!memberId || !confirm('למחוק את איש הצוות?')) return;
    saveData(STORAGE_KEYS.team, getTeam().filter(m => m.id !== memberId));
    closeTeamModal();
    populateFilters();
    renderTeam();
    toast('איש הצוות נמחק', 'info');
}

// ===== Projects =====
function renderProjects() {
    const projects = getProjects();
    const tasks = getTasks();
    document.getElementById('projects-grid').innerHTML = projects.map(project => {
        const pt = tasks.filter(t => t.projectId === project.id);
        const total = pt.length;
        const completed = pt.filter(t => t.status === 'הושלם').length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const escaped = (project.name || '').replace(/"/g, '&quot;');
        const descEscaped = (project.description || '').replace(/"/g, '&quot;');
        return `<div class="project-card" style="border-top-color:${project.color}">
            <div class="project-card-header">
                <input type="text" class="inline-input project-name-input" value="${escaped}"
                    onblur="updateProject('${project.id}','name',this.value)" onkeydown="if(event.key==='Enter')this.blur()">
                <div style="display:flex;gap:4px;align-items:center;flex-shrink:0">
                    <input type="color" class="project-color-picker" value="${project.color}" onchange="updateProject('${project.id}','color',this.value)">
                    <button class="btn-icon" onclick="deleteProject('${project.id}')" title="מחיקה">✕</button>
                </div>
            </div>
            <input type="text" class="inline-input project-desc-input" value="${descEscaped}" placeholder="תיאור הפרויקט..."
                onblur="updateProject('${project.id}','description',this.value)" onkeydown="if(event.key==='Enter')this.blur()">
            <div class="project-progress"><div class="progress-bar"><div class="progress-fill" style="width:${progress}%;background:${project.color}"></div></div></div>
            <div class="project-stats"><span>📋 ${total} משימות</span><span>✓ ${completed} הושלמו</span><span style="margin-right:auto;font-weight:600;color:var(--text-primary)">${progress}%</span></div>
        </div>`;
    }).join('');
}

function updateProject(projectId, field, value) {
    const projects = getProjects();
    const p = projects.find(pp => pp.id === projectId);
    if (!p) return;
    p[field] = value;
    saveData(STORAGE_KEYS.projects, projects);
    if (field === 'name' || field === 'color') populateFilters();
    if (field === 'color') renderProjects();
}

// ===== Task CRUD =====
function openTaskModal(taskId, isManager) {
    populateFilters();
    document.getElementById('task-modal').classList.add('active');
    document.getElementById('task-form').reset();
    document.getElementById('task-id').value = '';
    document.getElementById('task-is-manager').value = isManager ? 'true' : '';
    document.getElementById('modal-title').textContent = isManager ? 'משימת ניהול חדשה' : 'משימה חדשה';
    document.getElementById('assignee-group').style.display = 'none';

    // Default priority for new tasks: 'רגיל'
    if (!taskId) {
        document.getElementById('task-priority').value = 'רגיל';
    }

    if (taskId) {
        const task = getTasks().find(t => t.id === taskId);
        if (task) {
            document.getElementById('modal-title').textContent = 'עריכת משימה';
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-is-manager').value = task.isManager ? 'true' : '';
            document.getElementById('task-project').value = task.projectId;
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-status').value = task.status;
            document.getElementById('task-assignee').value = task.assignee;
            document.getElementById('task-description').value = task.description;
            document.getElementById('task-notes').value = task.notes;
            document.getElementById('task-report-link').value = task.reportLink;
            document.getElementById('task-hours').value = task.hours || '';
            document.getElementById('task-deadline').value = task.deadline || '';
            document.getElementById('task-revisions').value = task.revisions || 0;
        }
    }
    setTimeout(() => document.getElementById('task-description').focus(), 100);
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.remove('active');
    const pNew = document.getElementById('task-project-new');
    if (pNew) { pNew.style.display = 'none'; pNew.value = ''; }
}

function saveTask(e) {
    e.preventDefault();
    const tasks = getTasks();
    const id = document.getElementById('task-id').value;

    let projectId = document.getElementById('task-project').value;
    if (projectId === '__new__') {
        const newName = document.getElementById('task-project-new').value.trim();
        if (!newName) return;
        const projects = getProjects();
        const np = { id: generateId(), name: newName, description: '', color: '#'+Math.floor(Math.random()*0xFFFFFF).toString(16).padStart(6,'0') };
        projects.push(np);
        saveData(STORAGE_KEYS.projects, projects);
        projectId = np.id;
    }

    let status = document.getElementById('task-status').value;
    let priority = document.getElementById('task-priority').value;
    if (status === '__manage__') { openCustomStatusModal('status'); return; }
    if (priority === '__manage__') { openCustomStatusModal('priority'); return; }

    const taskData = {
        projectId,
        priority,
        status,
        assignee: document.getElementById('task-assignee').value,
        description: document.getElementById('task-description').value,
        notes: document.getElementById('task-notes').value,
        reportLink: document.getElementById('task-report-link').value,
        hours: parseFloat(document.getElementById('task-hours').value) || 0,
        deadline: document.getElementById('task-deadline').value,
        revisions: parseInt(document.getElementById('task-revisions').value) || 0,
        isManager: document.getElementById('task-is-manager').value === 'true'
    };

    if (id) {
        const idx = tasks.findIndex(t => t.id === id);
        if (idx !== -1) {
            const oldTask = tasks[idx];
            const history = oldTask.history || [];

            // Track changes in history
            Object.keys(taskData).forEach(key => {
                if (oldTask[key] !== taskData[key]) {
                    history.push({
                        timestamp: new Date().toISOString(),
                        field: key,
                        oldValue: oldTask[key],
                        newValue: taskData[key],
                        editedBy: 'user'
                    });
                }
            });

            tasks[idx] = { ...oldTask, ...taskData, history };
        }
        toast('המשימה עודכנה', 'success');
    } else {
        tasks.push({ id: generateId(), ...taskData, subtasks: [], history: [], createdAt: new Date().toISOString() });
        toast('המשימה נוספה', 'success');
    }

    saveData(STORAGE_KEYS.tasks, tasks);
    closeTaskModal();
    populateFilters();
    refreshCurrentView();
}

function editTask(taskId) { populateFilters(); openTaskModal(taskId); }

function deleteTask(taskId) {
    const tasks = getTasks();
    const deletedTask = tasks.find(t => t.id === taskId);
    if (!deletedTask) return;
    const deletedIndex = tasks.indexOf(deletedTask);
    saveData(STORAGE_KEYS.tasks, tasks.filter(t => t.id !== taskId));
    refreshCurrentView();
    toastWithUndo(`המשימה "${deletedTask.description}" נמחקה`, () => {
        const currentTasks = getTasks();
        currentTasks.splice(deletedIndex, 0, deletedTask);
        saveData(STORAGE_KEYS.tasks, currentTasks);
        refreshCurrentView();
    }, 'info');
}

function restoreTask(taskId) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    task.status = 'בעבודה';
    saveData(STORAGE_KEYS.tasks, tasks);
    refreshCurrentView();
}

// ===== Project CRUD =====
function openProjectModal() { document.getElementById('project-modal').classList.add('active'); document.getElementById('project-form').reset(); }
function openNewProjectModal() {
    window._projectCreationCallback = () => populateFilters();
    openProjectModal();
}
function closeProjectModal() { document.getElementById('project-modal').classList.remove('active'); }

function saveProject(e) {
    e.preventDefault();
    const projects = getProjects();
    projects.push({ id: generateId(), name: document.getElementById('project-name').value, description: document.getElementById('project-description').value, color: document.getElementById('project-color').value });
    saveData(STORAGE_KEYS.projects, projects);
    closeProjectModal();
    populateFilters();
    renderProjects();
    toast('הפרויקט נוסף', 'success');
}

function deleteProject(projectId) {
    if (!confirm('למחוק את הפרויקט?')) return;
    saveData(STORAGE_KEYS.projects, getProjects().filter(p => p.id !== projectId));
    populateFilters();
    renderProjects();
}

// ===== Helpers =====
function getStatusBadgeClass(status) {
    const map = { 'דחוף':'badge-urgent', 'בעבודה':'badge-inprogress', 'בתיכנון':'badge-planning', 'הושלם':'badge-done', 'בבדיקה':'badge-inprogress' };
    return map[status] || 'badge-planning';
}

function refreshCurrentView() {
    const nav = document.querySelector('.nav-item.active');
    if (nav) switchView(nav.dataset.view);
    updateBadges();
    refreshBackupIndicator();
}

// ===== Quick add =====
function initQuickAdd() {
    const input = document.getElementById('quick-add-input');
    if (!input) return;

    let currentPriority = 'רגיל';
    document.querySelectorAll('.chip[data-qa="priority"]').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip[data-qa="priority"]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentPriority = chip.dataset.value;
        });
    });

    input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (!input.value.trim()) return;
        const projectId = document.getElementById('quick-add-project').value;
        const tasks = getTasks();
        const statuses = getStatuses();
        tasks.push({
            id: generateId(),
            projectId,
            description: input.value.trim(),
            status: statuses.includes('בעבודה') ? 'בעבודה' : statuses[0],
            priority: currentPriority,
            isManager: e.shiftKey,
            assignee: '', notes: '', reportLink: '', hours: 0, deadline: '', revisions: 0,
            subtasks: [], createdAt: new Date().toISOString()
        });
        saveData(STORAGE_KEYS.tasks, tasks);
        input.value = '';
        refreshCurrentView();
        toast(`משימה נוספה${e.shiftKey ? ' (ניהול)' : ''}`, 'success');
    });
}

// ===== Keyboard shortcuts =====
document.addEventListener('keydown', (e) => {
    // Command palette
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); openCommandPalette(); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault(); manualBackup(); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault(); openTaskModal(); return;
    }
    // View shortcuts 1–5
    if ((e.ctrlKey || e.metaKey) && ['1','2','3','4','5'].includes(e.key)) {
        const map = { '1':'today', '2':'dashboard', '3':'tasks', '4':'team', '5':'projects' };
        e.preventDefault(); switchView(map[e.key]); return;
    }

    if (e.key === 'Escape') {
        ['task-modal','project-modal','team-modal','custom-status-modal','settings-modal'].forEach(id => {
            document.getElementById(id).classList.remove('active');
        });
        closeCommandPalette();
    }

    // Command palette navigation
    const palette = document.getElementById('command-palette');
    if (palette.classList.contains('active')) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            commandSelectedIdx = Math.min(commandSelectedIdx + 1, commandItems.length - 1);
            highlightCommandItem();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            commandSelectedIdx = Math.max(commandSelectedIdx - 1, 0);
            highlightCommandItem();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const it = commandItems[commandSelectedIdx];
            if (it) it.fn();
        }
    }
});

// Close modals on overlay click
['task-modal','project-modal','team-modal','custom-status-modal','settings-modal','command-palette'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', (e) => { if (e.target === e.currentTarget) e.target.classList.remove('active'); });
});

// Command input listener
document.addEventListener('DOMContentLoaded', () => {
    const ci = document.getElementById('command-input');
    if (ci) ci.addEventListener('input', (e) => renderCommandResults(e.target.value));
});

// Backup before unload if dirty
window.addEventListener('beforeunload', () => {
    const lastHash = localStorage.getItem(STORAGE_KEYS.lastBackupHash);
    if (lastHash !== currentDataHash()) {
        // leave indicator — auto-backup on next open will catch it
    }
});

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    initData();
    applyTheme();
    applySavedSidebarState();
    checkAutoBackup();
    updateDate();
    initNavigation();
    populateFilters();
    initQuickAdd();
    renderToday();
    refreshBackupIndicator();
    updateBadges();
    setTimeout(() => toast('ברוך הבא ל-Studio OS · גרסה Pro', 'info'), 400);
});
