// State
let state = {
    name: 'NOMBRE DEL PERSONAJE',
    race: '',
    classes: '',
    level: 1,
    alignment: 'N',
    deity: '',
    height: '',
    portrait: null,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    maxHP: 100,
    damage: 0,
    nonLethal: 0,
    tempHP: 0,
    ac: 10,
    acStat: 'dex',
    dr: '',
    sr: 0,
    bab: 0,
    saves: {
        fort: { base: 0, stat: 'con', total: 0 },
        ref: { base: 0, stat: 'dex', total: 0 },
        will: { base: 0, stat: 'wis', total: 0 }
    },
    init: { bonus: 0, stat: 'dex' },
    speed: 30,
    bonuses: { ac: [], fort: [], ref: [], will: [], attack: [], saveGeneral: [] },
    customBreakdowns: [],
    attacks: [],
    equipment: {},
    skills: [],
    languages: [],
    inventory: [],
    abilities: [],
    feats: [],
    events: []
};

// Tipos de bonus y sus reglas de aplicación
const BONUS_TYPES = {
    // AC Bonuses
    'armor': { stacks: false, appliesToTouch: false, appliesToFlat: true, category: 'ac' },
    'shield': { stacks: false, appliesToTouch: false, appliesToFlat: true, category: 'ac' },
    'deflection': { stacks: false, appliesToTouch: true, appliesToFlat: true, category: 'ac' },
    'dodge': { stacks: true, appliesToTouch: true, appliesToFlat: false, category: 'ac' },
    'natural': { stacks: false, appliesToTouch: false, appliesToFlat: true, category: 'ac' },
    'enhancement': { stacks: false, appliesToTouch: false, appliesToFlat: true, category: 'ac' },
    'insight': { stacks: false, appliesToTouch: true, appliesToFlat: true, category: 'ac' },
    'luck': { stacks: false, appliesToTouch: true, appliesToFlat: true, category: 'ac' },
    'sacred': { stacks: false, appliesToTouch: true, appliesToFlat: true, category: 'ac' },
    'profane': { stacks: false, appliesToTouch: true, appliesToFlat: true, category: 'ac' },
    'size': { stacks: false, appliesToTouch: true, appliesToFlat: false, category: 'ac' },
    
    // Save Bonuses
    'alchemical': { stacks: false, category: 'save' },
    'competence': { stacks: false, category: 'save' },
    'morale': { stacks: false, category: 'save' },
    'resistance': { stacks: false, category: 'save' },
    
    // Attack Bonuses
    'circumstance': { stacks: true, category: 'attack' },
    'racial': { stacks: false, category: 'attack' },
    'trait': { stacks: false, category: 'attack' },
    
    // Universal - NO aplica a Touch ni Flat por defecto (debe especificarse su tipo)
    'untyped': { stacks: true, appliesToTouch: false, appliesToFlat: true, category: 'all' }
};

const defaultSkills = [
    'Acrobatics|dex', 'Appraise|int', 'Bluff|cha', 'Climb|str', 'Craft|int', 
    'Diplomacy|cha', 'Disable Device|dex', 'Disguise|cha', 'Escape Artist|dex', 
    'Fly|dex', 'Handle Animal|cha', 'Heal|wis', 'Intimidate|cha', 
    'Knowledge (Arcana)|int', 'Knowledge (Dungeoneering)|int', 'Knowledge (Engineering)|int',
    'Knowledge (Geography)|int', 'Knowledge (History)|int', 'Knowledge (Local)|int',
    'Knowledge (Nature)|int', 'Knowledge (Nobility)|int', 'Knowledge (Planes)|int',
    'Knowledge (Religion)|int', 'Linguistics|int', 'Perception|wis', 'Perform|cha',
    'Profession|wis', 'Ride|dex', 'Sense Motive|wis', 'Sleight of Hand|dex',
    'Spellcraft|int', 'Stealth|dex', 'Survival|wis', 'Swim|str', 'Use Magic Device|cha'
];

const defaultSlots = ['Head','Headband','Eyes','Shoulders','Neck','Chest','Body','Armor','Belt','Wrists','Hands','Ring 1','Ring 2','Feet'];

const mod = s => Math.floor((s - 10) / 2);
const fmt = m => (m >= 0 ? '+' : '') + m;

// Función para calcular bonificadores aplicables según reglas de D&D 3.5/Pathfinder
function calculateApplicableBonuses(bonusList) {
    // Filtrar solo bonos activos
    const activeBonuses = bonusList.filter(b => !b.activable || b.active);
    
    // Agrupar por tipo
    const byType = {};
    activeBonuses.forEach(b => {
        const type = b.t || 'untyped';
        if (!byType[type]) byType[type] = [];
        byType[type].push(b);
    });
    
    // Aplicar reglas de stacking
    let total = 0;
    for (const [type, bonuses] of Object.entries(byType)) {
        const typeInfo = BONUS_TYPES[type] || BONUS_TYPES['untyped'];
        
        if (typeInfo.stacks) {
            // Los bonos de este tipo se suman todos
            total += bonuses.reduce((sum, b) => sum + (+b.v || 0), 0);
        } else {
            // Solo tomar el mayor
            const maxBonus = Math.max(...bonuses.map(b => +b.v || 0));
            total += maxBonus;
        }
    }
    
    return total;
}

// Función para obtener bonos que aplican a Touch AC
function getApplicableBonusesToTouch(bonusList) {
    return bonusList.filter(b => {
        if (b.activable && !b.active) return false;
        const typeInfo = BONUS_TYPES[b.t] || BONUS_TYPES['untyped'];
        return typeInfo.appliesToTouch === true;
    });
}

// Función para obtener bonos que aplican a Flat-Footed AC
function getApplicableBonusesToFlat(bonusList) {
    return bonusList.filter(b => {
        if (b.activable && !b.active) return false;
        const typeInfo = BONUS_TYPES[b.t] || BONUS_TYPES['untyped'];
        return typeInfo.appliesToFlat === true;
    });
}

function init() {
    defaultSlots.forEach(s => {
        if (!state.equipment[s]) state.equipment[s] = '';
    });
    
    if (state.skills.length === 0) {
        state.skills = defaultSkills.map(sk => {
            const [n, s] = sk.split('|');
            return {n, s, r: 0, m: 0, cs: false};
        });
    }
    
    // Setup portrait input
    const portraitInput = document.getElementById('portraitInput');
    const charPortrait = document.getElementById('charPortrait');
    
    portraitInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(event) {
                state.portrait = event.target.result;
                displayPortrait();
                save();
            };
            reader.readAsDataURL(file);
        }
    });
    
    charPortrait.addEventListener('click', function() {
        portraitInput.click();
    });
    
    load();
    render();
}

function displayPortrait() {
    const placeholder = document.querySelector('.portrait-placeholder');
    const img = document.getElementById('portraitImg');
    
    if (state.portrait) {
        placeholder.style.display = 'none';
        img.style.display = 'block';
        img.src = state.portrait;
    } else {
        placeholder.style.display = 'flex';
        img.style.display = 'none';
    }
}

function removePortrait() {
    if (!confirm('¿Quitar la imagen del personaje?')) return;
    state.portrait = null;
    displayPortrait();
    save();
}

function render() {
    renderStats();
    renderAttacks();
    renderEquipment();
    renderSkills();
    renderLanguages();
    renderInventory();
    renderAbilities();
    renderFeats();
    renderEvents();
    renderBreakdowns();
    displayPortrait();
    updateHP();
    updateDefenses();
    updateSaves();
    updateInit();
    updateCombat();
}

function renderStats() {
    const c = document.getElementById('statsContainer');
    c.innerHTML = Object.keys(state.stats).map(s => {
        const v = state.stats[s];
        const m = mod(v);
        return `<div class="stat-row">
            <span class="stat-label">${s.toUpperCase()}:</span>
            <input type="number" class="stat-input" value="${v}" onchange="state.stats.${s}=+this.value;render();save()">
            <span>Mod:</span>
            <input type="text" class="stat-mod" value="${fmt(m)}" readonly>
        </div>`;
    }).join('');
}

function updateHP() {
    const max = +document.getElementById('maxHP').value;
    const dmg = +document.getElementById('damage').value;
    const temp = +document.getElementById('tempHP').value;
    
    state.maxHP = max;
    state.damage = dmg;
    state.tempHP = temp;
    
    const curr = Math.max(0, max - dmg);
    const pct = Math.max(0, Math.min(100, (curr / max) * 100));
    
    const bar = document.getElementById('hpBar');
    bar.style.width = pct + '%';
    bar.textContent = `${curr} / ${max}` + (temp > 0 ? ` (+${temp})` : '');
    
    if (pct > 50) bar.style.background = 'linear-gradient(90deg, #27ae60, #2ecc71)';
    else if (pct > 25) bar.style.background = 'linear-gradient(90deg, #f39c12, #ff6b35)';
    else bar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
    
    save();
}

function updateDefenses() {
    // Obtener el stat configurado para AC (por defecto dex, pero puede ser wis para monjes, etc)
    const acStatValue = state.acStat || 'dex';
    const acMod = mod(state.stats[acStatValue]);
    
    state.dr = document.getElementById('dr').value;
    state.sr = +document.getElementById('sr').value;
    
    // Calcular AC usando el nuevo sistema
    const acBonus = calculateApplicableBonuses(state.bonuses.ac);
    const totalAC = 10 + acMod + acBonus;
    
    // Touch AC: 10 + stat mod + bonos que aplican a touch
    const touchBonuses = getApplicableBonusesToTouch(state.bonuses.ac);
    const touchBonus = calculateApplicableBonuses(touchBonuses);
    const touch = 10 + acMod + touchBonus;
    
    // Flat-Footed AC: 10 + bonos que aplican a flat (sin stat mod, sin Dodge)
    const flatBonuses = getApplicableBonusesToFlat(state.bonuses.ac);
    const flatBonus = calculateApplicableBonuses(flatBonuses);
    const flat = 10 + flatBonus;
    
    // Flat-Footed Touch AC: 10 + bonos que aplican a AMBOS touch Y flat (sin stat mod, sin Dodge)
    const flatTouchBonuses = state.bonuses.ac.filter(b => {
        if (b.activable && !b.active) return false;
        const typeInfo = BONUS_TYPES[b.t] || BONUS_TYPES['untyped'];
        return typeInfo.appliesToTouch === true && typeInfo.appliesToFlat === true;
    });
    const flatTouchBonus = calculateApplicableBonuses(flatTouchBonuses);
    const flatTouch = 10 + flatTouchBonus;
    
    state.ac = totalAC;
    document.getElementById('acTotal').value = totalAC;
    document.getElementById('touchAC').value = touch;
    document.getElementById('flatAC').value = flat;
    document.getElementById('flatTouchAC').value = flatTouch;
    
    save();
}

function updateACStat() {
    const stat = document.getElementById('acStat').value;
    state.acStat = stat;
    updateDefenses();
}

function updateSaves() {
    ['fort','ref','will'].forEach(s => {
        const stat = document.getElementById(s+'Stat').value;
        const base = +document.getElementById(s+'Base').value;
        const totalInput = document.getElementById(s+'Total');
        
        state.saves[s].stat = stat;
        state.saves[s].base = base;
        
        let total = base + mod(state.stats[stat]);
        
        // Aplicar bonos específicos de esta salvación
        total += calculateApplicableBonuses(state.bonuses[s]);
        
        // Aplicar bonos generales que apliquen a esta salvación
        if (state.bonuses.saveGeneral) {
            const applicableGeneral = state.bonuses.saveGeneral.filter(b => {
                if (b.activable && !b.active) return false;
                if (!b.applies || b.applies === 'All') return true;
                return b.applies.toLowerCase().includes(s);
            });
            total += calculateApplicableBonuses(applicableGeneral);
        }
        
        state.saves[s].total = total;
        totalInput.value = total;
    });
    save();
}

function updateInit() {
    const stat = document.getElementById('initStat').value;
    const bonus = +document.getElementById('initBonus').value;
    
    state.init.stat = stat;
    state.init.bonus = bonus;
    
    const total = mod(state.stats[stat]) + bonus;
    document.getElementById('initTotal').value = total;
    save();
}

function updateCombat() {
    state.bab = +document.getElementById('bab').value;
    
    const str = mod(state.stats.str);
    const dex = mod(state.stats.dex);
    
    document.getElementById('cmb').value = state.bab + str;
    document.getElementById('cmd').value = 10 + state.bab + str + dex;
    
    save();
}

function renderAttacks() {
    const c = document.getElementById('attacksList');
    if (!state.attacks.length) {
        c.innerHTML = '<p style="color:#888;text-align:center;padding:20px">Sin ataques configurados</p>';
        return;
    }
    c.innerHTML = state.attacks.map((a, i) => `
        <div class="attack-item">
            <input type="text" value="${a.weapon}" onchange="state.attacks[${i}].weapon=this.value;save()">
            <input type="text" value="${a.bonus}" onchange="state.attacks[${i}].bonus=this.value;save()">
            <input type="text" value="${a.damage}" onchange="state.attacks[${i}].damage=this.value;save()">
            <input type="text" value="${a.crit}" onchange="state.attacks[${i}].crit=this.value;save()">
            <input type="text" value="${a.type}" onchange="state.attacks[${i}].type=this.value;save()">
            <input type="text" value="${a.notes}" onchange="state.attacks[${i}].notes=this.value;save()">
            <button class="btn-delete" onclick="state.attacks.splice(${i},1);renderAttacks();save()">✕</button>
        </div>
    `).join('');
}

function addAttack(type) {
    const str = fmt(mod(state.stats.str));
    const dex = fmt(mod(state.stats.dex));
    const bonus = type === 'melee' ? str : dex;
    
    state.attacks.push({
        weapon: type === 'melee' ? 'Melee' : 'Ranged',
        bonus: `${fmt(state.bab)}/${bonus}`,
        damage: '1d8',
        crit: '20/x2',
        type: type === 'melee' ? 'S' : 'P',
        notes: ''
    });
    renderAttacks();
    save();
}

function renderSkills() {
    const c = document.getElementById('skillsList');
    c.innerHTML = state.skills.map((sk, i) => {
        const statMod = mod(state.stats[sk.s]);
        const csBonus = sk.cs ? 3 : 0;
        const total = statMod + (sk.r || 0) + (sk.m || 0) + csBonus;
        
        return `<div class="skill-item">
            <input type="checkbox" ${sk.cs ? 'checked' : ''} onchange="state.skills[${i}].cs=this.checked;renderSkills();save()">
            <input type="text" value="${sk.n}" onchange="state.skills[${i}].n=this.value;save()">
            <select onchange="state.skills[${i}].s=this.value;renderSkills();save()">
                ${['str','dex','con','int','wis','cha'].map(s => 
                    `<option value="${s}" ${sk.s===s?'selected':''}>${s.toUpperCase()}</option>`
                ).join('')}
            </select>
            <input type="number" value="${sk.r}" onchange="state.skills[${i}].r=+this.value;renderSkills();save()">
            <input type="number" value="${sk.m}" onchange="state.skills[${i}].m=+this.value;renderSkills();save()">
            <input type="number" value="${total}" readonly class="total-value">
        </div>`;
    }).join('');
}

function addCustomSkill() {
    state.skills.push({n:'Nueva Skill',s:'int',r:0,m:0,cs:false});
    renderSkills();
    save();
}

function renderLanguages() {
    const c = document.getElementById('languagesList');
    if (!state.languages.length) {
        c.innerHTML = '<p style="color:#888;font-size:11px">Sin idiomas</p>';
        return;
    }
    c.innerHTML = state.languages.map((l, i) => `
        <div class="language-badge">
            ${l}
            <button class="btn-delete lang-delete" onclick="state.languages.splice(${i},1);renderLanguages();save()">✕</button>
        </div>
    `).join('');
}

function addLanguage() {
    const inp = document.getElementById('newLanguage');
    const txt = inp.value.trim();
    if (!txt) return;
    
    state.languages.push(txt);
    inp.value = '';
    renderLanguages();
    save();
}

function renderEquipment() {
    const c = document.getElementById('equipmentSlots');
    c.innerHTML = Object.keys(state.equipment).map(s => `
        <div class="slot-item">
            <div>${s}:</div>
            <input type="text" value="${state.equipment[s]}" onchange="state.equipment['${s}']=this.value;save()" placeholder="Vacío">
            <button class="btn-delete" onclick="delete state.equipment['${s}'];renderEquipment();save()">✕</button>
        </div>
    `).join('');
}

function addSlot() {
    const n = prompt('Nombre del slot:');
    if (n && n.trim()) {
        state.equipment[n.trim()] = '';
        renderEquipment();
        save();
    }
}

function renderInventory() {
    const c = document.getElementById('inventoryList');
    if (!state.inventory.length) {
        c.innerHTML = '<p style="color:#888;text-align:center;padding:20px">Sin items</p>';
        return;
    }
    c.innerHTML = state.inventory.map((it, i) => `
        <div class="inv-item">
            <input type="text" value="${it.n}" onchange="state.inventory[${i}].n=this.value;save()">
            <input type="number" value="${it.q}" onchange="state.inventory[${i}].q=+this.value;save()">
            <input type="number" value="${it.c||0}" onchange="state.inventory[${i}].c=+this.value;save()">
            <input type="number" value="${it.cl||0}" onchange="state.inventory[${i}].cl=+this.value;save()">
            <input type="number" value="${it.dc||0}" onchange="state.inventory[${i}].dc=+this.value;save()">
            <input type="text" value="${it.note||''}" onchange="state.inventory[${i}].note=this.value;save()">
            <button class="btn-delete" onclick="state.inventory.splice(${i},1);renderInventory();save()">✕</button>
        </div>
    `).join('');
}

function addItem() {
    const n = document.getElementById('newItem').value.trim();
    if (!n) return;
    
    state.inventory.push({
        n: n,
        q: +document.getElementById('newQty').value || 1,
        c: +document.getElementById('newCharges').value || 0,
        cl: +document.getElementById('newCL').value || 0,
        dc: +document.getElementById('newDC').value || 0,
        note: document.getElementById('newNote').value.trim()
    });
    
    document.getElementById('newItem').value = '';
    document.getElementById('newQty').value = '1';
    document.getElementById('newCharges').value = '0';
    document.getElementById('newCL').value = '0';
    document.getElementById('newDC').value = '0';
    document.getElementById('newNote').value = '';
    
    renderInventory();
    save();
}

function renderAbilities() {
    const c = document.getElementById('abilitiesList');
    if (!state.abilities.length) {
        c.innerHTML = '<p style="color:#888;font-size:11px">Sin habilidades</p>';
        return;
    }
    c.innerHTML = `<div class="abilities-grid">${state.abilities.map((a, i) => `
        <div class="ability-item">
            <div class="ability-name">${a.n}</div>
            <div class="ability-desc">${a.d}</div>
            <button class="btn-delete ability-delete" onclick="state.abilities.splice(${i},1);renderAbilities();save()">✕</button>
        </div>
    `).join('')}</div>`;
}

function addAbility() {
    const n = document.getElementById('newAbility').value.trim();
    const d = document.getElementById('newAbilityDesc').value.trim();
    if (!n) return;
    
    state.abilities.push({n: n, d: d || 'Sin descripción'});
    document.getElementById('newAbility').value = '';
    document.getElementById('newAbilityDesc').value = '';
    renderAbilities();
    save();
}

function renderFeats() {
    const c = document.getElementById('featsList');
    if (!state.feats.length) {
        c.innerHTML = '<p style="color:#888;font-size:11px">Sin feats</p>';
        return;
    }
    c.innerHTML = state.feats.map((f, i) => `
        <div class="feat-badge">
            ${f}
            <button class="btn-delete feat-delete" onclick="state.feats.splice(${i},1);renderFeats();save()">✕</button>
        </div>
    `).join('');
}

function addFeat() {
    const n = document.getElementById('newFeat').value.trim();
    if (!n) return;
    
    state.feats.push(n);
    document.getElementById('newFeat').value = '';
    renderFeats();
    save();
}

function renderBreakdowns() {
    // AC Breakdown con dropdown de tipos
    const acList = document.getElementById('acBonusList');
    const acTypes = Object.keys(BONUS_TYPES).filter(t => BONUS_TYPES[t].category === 'ac' || BONUS_TYPES[t].category === 'all');
    
    const acTotal = calculateApplicableBonuses(state.bonuses.ac);
    const dex = mod(state.stats.dex);
    const finalAC = 10 + dex + acTotal;
    
    acList.innerHTML = state.bonuses.ac.map((b, i) => `
        <div class="bonus-item-enhanced">
            <input type="text" value="${b.n || ''}" onchange="state.bonuses.ac[${i}].n=this.value;save()" placeholder="Ej: Breastplate +1">
            <input type="number" value="${b.v || 0}" onchange="state.bonuses.ac[${i}].v=this.value;updateDefenses();save()">
            <select onchange="state.bonuses.ac[${i}].t=this.value;updateDefenses();save()">
                ${acTypes.map(type => `<option value="${type}" ${b.t === type ? 'selected' : ''}>${type}</option>`).join('')}
            </select>
            <label>
                <input type="checkbox" ${b.activable ? 'checked' : ''} onchange="state.bonuses.ac[${i}].activable=this.checked;if(!this.checked)state.bonuses.ac[${i}].active=false;renderBreakdowns();updateDefenses();save()">
                Activable
            </label>
            ${b.activable ? `
                <label style="background: ${b.active ? 'rgba(78,205,196,0.3)' : 'rgba(20,20,30,0.5)'}">
                    <input type="checkbox" ${b.active ? 'checked' : ''} onchange="state.bonuses.ac[${i}].active=this.checked;updateDefenses();save()">
                    ${b.active ? '✓' : '○'}
                </label>
            ` : '<span></span>'}
            <button class="btn-delete" onclick="state.bonuses.ac.splice(${i},1);renderBreakdowns();updateDefenses();save()">✕</button>
        </div>
    `).join('') + `
        <div class="bonus-total">
            <span class="bonus-total-label">Total AC Bonus</span>
            <span class="bonus-total-value">${fmt(acTotal)} (AC Final: ${finalAC})</span>
        </div>
    `;

    // Save General con dropdowns
    const saveGenList = document.getElementById('saveGeneralList');
    if (!state.bonuses.saveGeneral) state.bonuses.saveGeneral = [];
    const saveTypes = Object.keys(BONUS_TYPES).filter(t => BONUS_TYPES[t].category === 'save' || BONUS_TYPES[t].category === 'all');
    
    const saveGenTotal = calculateApplicableBonuses(state.bonuses.saveGeneral);
    
    saveGenList.innerHTML = state.bonuses.saveGeneral.map((b, i) => `
        <div class="bonus-item-enhanced" style="grid-template-columns: minmax(0, 2fr) 70px 110px 90px auto auto 40px;">
            <input type="text" value="${b.n || ''}" onchange="state.bonuses.saveGeneral[${i}].n=this.value;save()" placeholder="Ej: Cloak of Resistance">
            <input type="number" value="${b.v || 0}" onchange="state.bonuses.saveGeneral[${i}].v=this.value;updateSaves();save()">
            <select onchange="state.bonuses.saveGeneral[${i}].t=this.value;updateSaves();save()">
                ${saveTypes.map(type => `<option value="${type}" ${b.t === type ? 'selected' : ''}>${type}</option>`).join('')}
            </select>
            <input type="text" value="${b.applies||'All'}" onchange="state.bonuses.saveGeneral[${i}].applies=this.value;updateSaves();save()" placeholder="All">
            <label>
                <input type="checkbox" ${b.activable ? 'checked' : ''} onchange="state.bonuses.saveGeneral[${i}].activable=this.checked;if(!this.checked)state.bonuses.saveGeneral[${i}].active=false;renderBreakdowns();updateSaves();save()">
                Activ
            </label>
            ${b.activable ? `
                <label style="background: ${b.active ? 'rgba(78,205,196,0.3)' : 'rgba(20,20,30,0.5)'}; min-width: 30px;">
                    <input type="checkbox" ${b.active ? 'checked' : ''} onchange="state.bonuses.saveGeneral[${i}].active=this.checked;updateSaves();save()">
                    ${b.active ? '✓' : '○'}
                </label>
            ` : '<span></span>'}
            <button class="btn-delete" onclick="state.bonuses.saveGeneral.splice(${i},1);renderBreakdowns();updateSaves();save()">✕</button>
        </div>
    `).join('') + `
        <div class="bonus-total">
            <span class="bonus-total-label">Total General Bonus</span>
            <span class="bonus-total-value">${fmt(saveGenTotal)}</span>
        </div>
    `;

    // Fort, Ref, Will - versión simplificada
    ['fort','ref','will'].forEach(type => {
        const c = document.getElementById(type+'BonusList');
        const total = calculateApplicableBonuses(state.bonuses[type]);
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);
        
        c.innerHTML = state.bonuses[type].map((b, i) => `
            <div class="bonus-item-simple">
                <input type="text" value="${b.n || ''}" onchange="state.bonuses.${type}[${i}].n=this.value;save()" placeholder="Ej: Great Fortitude">
                <input type="number" value="${b.v || 0}" onchange="state.bonuses.${type}[${i}].v=this.value;updateSaves();save()">
                <button class="btn-delete" onclick="state.bonuses.${type}.splice(${i},1);renderBreakdowns();updateSaves();save()">✕</button>
            </div>
        `).join('') + `
            <div class="bonus-total">
                <span class="bonus-total-label">Total ${typeName} Bonus</span>
                <span class="bonus-total-value">${fmt(total)}</span>
            </div>
        `;
    });

    // Attack Breakdown con dropdowns
    const atkList = document.getElementById('attackBonusList');
    const attackTypes = Object.keys(BONUS_TYPES).filter(t => BONUS_TYPES[t].category === 'attack' || BONUS_TYPES[t].category === 'all');
    
    const attackTotal = calculateApplicableBonuses(state.bonuses.attack);
    
    atkList.innerHTML = state.bonuses.attack.map((b, i) => `
        <div class="bonus-item-enhanced">
            <input type="text" value="${b.n || ''}" onchange="state.bonuses.attack[${i}].n=this.value;save()" placeholder="Ej: Weapon Focus">
            <input type="number" value="${b.v || 0}" onchange="state.bonuses.attack[${i}].v=this.value;save()">
            <select onchange="state.bonuses.attack[${i}].t=this.value;save()">
                ${attackTypes.map(type => `<option value="${type}" ${b.t === type ? 'selected' : ''}>${type}</option>`).join('')}
            </select>
            <label>
                <input type="checkbox" ${b.activable ? 'checked' : ''} onchange="state.bonuses.attack[${i}].activable=this.checked;if(!this.checked)state.bonuses.attack[${i}].active=false;renderBreakdowns();save()">
                Activable
            </label>
            ${b.activable ? `
                <label style="background: ${b.active ? 'rgba(78,205,196,0.3)' : 'rgba(20,20,30,0.5)'}">
                    <input type="checkbox" ${b.active ? 'checked' : ''} onchange="state.bonuses.attack[${i}].active=this.checked;save()">
                    ${b.active ? '✓' : '○'}
                </label>
            ` : '<span></span>'}
            <button class="btn-delete" onclick="state.bonuses.attack[${i}].active=this.checked;save()">✕</button>
        </div>
    `).join('') + `
        <div class="bonus-total">
            <span class="bonus-total-label">Total Attack Bonus</span>
            <span class="bonus-total-value">${fmt(attackTotal)}</span>
        </div>
    `;

    renderCustomBreakdowns();
}

function addBonus(type) {
    if (type === 'saveGeneral') {
        if (!state.bonuses.saveGeneral) state.bonuses.saveGeneral = [];
        state.bonuses.saveGeneral.push({n:'Nuevo Bonus',v:0,t:'resistance',applies:'All',activable:false,active:false});
    } else if (type === 'ac') {
        state.bonuses[type].push({n:'Nuevo Bonus',v:0,t:'armor',activable:false,active:false});
    } else if (type === 'attack') {
        state.bonuses[type].push({n:'Nuevo Bonus',v:0,t:'untyped',activable:false,active:false});
    } else {
        state.bonuses[type].push({n:'Nuevo Bonus',v:0,t:'untyped'});
    }
    renderBreakdowns();
    updateDefenses();
    updateSaves();
}

function renderCustomBreakdowns() {
    const container = document.getElementById('customBreakdowns');
    if (!state.customBreakdowns) state.customBreakdowns = [];
    
    container.innerHTML = state.customBreakdowns.map((section, sIdx) => `
        <div class="breakdown-category">
            <h3 style="display: flex; justify-content: space-between; align-items: center;">
                <span contenteditable="true" onblur="state.customBreakdowns[${sIdx}].name=this.textContent;save()">${section.name}</span>
                <button class="btn-delete" onclick="removeCustomBreakdown(${sIdx})" style="position: static;">✕ Eliminar Sección</button>
            </h3>
            <div class="breakdown-list-header">
                <span style="flex: 2;">Fuente del Bonus</span>
                <span style="width: 80px;">Cantidad</span>
                <span style="width: 120px;">Tipo/Nota</span>
                <span style="width: 40px;"></span>
            </div>
            <div id="custom${sIdx}List">
                ${section.bonuses.map((b, bIdx) => `
                    <div class="bonus-item">
                        <input type="text" value="${b.n}" onchange="state.customBreakdowns[${sIdx}].bonuses[${bIdx}].n=this.value;save()" placeholder="Fuente">
                        <input type="number" value="${b.v}" onchange="state.customBreakdowns[${sIdx}].bonuses[${bIdx}].v=this.value;save()">
                        <input type="text" value="${b.t||''}" onchange="state.customBreakdowns[${sIdx}].bonuses[${bIdx}].t=this.value;save()" placeholder="Nota">
                        <button class="btn-delete" onclick="removeCustomBonus(${sIdx}, ${bIdx})">✕</button>
                    </div>
                `).join('')}
            </div>
            <button onclick="addCustomBonus(${sIdx})" class="btn-small">➕ Añadir Bonus</button>
        </div>
    `).join('');
}

function addCustomBreakdown() {
    const name = prompt('Nombre de la sección (ej: "Damage", "Skills Específicas", "Resistencias"):');
    if (!name || !name.trim()) return;
    
    if (!state.customBreakdowns) state.customBreakdowns = [];
    state.customBreakdowns.push({
        name: name.trim(),
        bonuses: []
    });
    
    renderCustomBreakdowns();
    save();
}

function removeCustomBreakdown(idx) {
    if (confirm(`¿Eliminar la sección "${state.customBreakdowns[idx].name}"?`)) {
        state.customBreakdowns.splice(idx, 1);
        renderCustomBreakdowns();
        save();
    }
}

function addCustomBonus(sectionIdx) {
    state.customBreakdowns[sectionIdx].bonuses.push({n:'Bonus',v:0,t:''});
    renderCustomBreakdowns();
    save();
}

function removeCustomBonus(sectionIdx, bonusIdx) {
    state.customBreakdowns[sectionIdx].bonuses.splice(bonusIdx, 1);
    renderCustomBreakdowns();
    save();
}

function toggleBreakdown() {
    const c = document.getElementById('breakdownContainer');
    const t = document.getElementById('breakdownToggle');
    c.classList.toggle('collapsed');
    t.textContent = c.classList.contains('collapsed') ? '▶' : '▼';
}

function renderEvents() {
    const c = document.getElementById('eventLog');
    if (!state.events.length) {
        c.innerHTML = '<p style="color:#888;text-align:center">Sin eventos</p>';
        return;
    }
    c.innerHTML = state.events.map(e => `
        <div class="event-item">
            <div class="event-header">
                <span class="event-time">[${e.t}]</span>
                <button class="btn-delete" onclick="state.events=state.events.filter(x=>x.id!==${e.id});renderEvents();save();autoSaveEvents()">✕</button>
            </div>
            <p class="event-text">${e.txt}</p>
        </div>
    `).reverse().join('');
}

function addEvent() {
    const inp = document.getElementById('eventInput');
    const txt = inp.value.trim();
    if (!txt) return;
    
    const now = new Date();
    const t = now.toLocaleString('es-ES', {hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'});
    
    state.events.push({t: t, txt: txt, id: Date.now()});
    inp.value = '';
    renderEvents();
    save();
    autoSaveEvents();
}

function toggleEvents() {
    const c = document.getElementById('eventsContainer');
    const t = document.getElementById('eventToggle');
    c.classList.toggle('collapsed');
    t.textContent = c.classList.contains('collapsed') ? '▶' : '▼';
}

function exportEvents() {
    if (!state.events.length) return alert('Sin eventos');
    
    const txt = `EVENTOS - ${state.name}\n${state.classes}\n\n${state.events.map(e => `[${e.t}] ${e.txt}`).join('\n')}`;
    download(txt, `eventos_${Date.now()}.txt`);
}

function autoSaveEvents() {
    if (!state.events.length) return;
    
    const txt = `EVENTOS - ${state.name}\n${state.classes}\n\n${state.events.map(e => `[${e.t}] ${e.txt}`).join('\n')}`;
    localStorage.setItem('dnd_events_auto', txt);
}

function loadEvents() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.txt';
    inp.onchange = e => {
        const f = e.target.files[0];
        if (!f) return;
        
        const r = new FileReader();
        r.onload = ev => {
            try {
                const lines = ev.target.result.split('\n').filter(l => l.startsWith('['));
                lines.forEach(l => {
                    const match = l.match(/^\[(.+?)\]\s*(.+)$/);
                    if (match) {
                        state.events.push({t: match[1], txt: match[2], id: Date.now() + Math.random()});
                    }
                });
                renderEvents();
                save();
                autoSaveEvents();
                alert('Eventos cargados!');
            } catch (err) {
                alert('Error: ' + err.message);
            }
        };
        r.readAsText(f);
    };
    inp.click();
}

function save() {
    state.name = document.getElementById('charName').value || "";
    state.race = document.getElementById('charRace').value || "";
    state.classes = document.getElementById('charClasses').value || "";
    state.level = +document.getElementById('charLevel').value || 1;
    state.alignment = document.getElementById('charAlignment').value || "N";
    state.deity = document.getElementById('charDeity').value || "";
    state.height = document.getElementById('charHeight').value || "";
    
    state.maxHP = +document.getElementById('maxHP').value || 100;
    state.damage = +document.getElementById('damage').value || 0;
    state.nonLethal = +document.getElementById('nonLethal').value || 0;
    state.tempHP = +document.getElementById('tempHP').value || 0;
    state.ac = +document.getElementById('acTotal').value || 10;
    state.dr = document.getElementById('dr').value || "";
    state.sr = +document.getElementById('sr').value || 0;
    state.bab = +document.getElementById('bab').value || 0;
    state.speed = +document.getElementById('speed').value || 30;
    
    localStorage.setItem('dnd_char', JSON.stringify(state));
}

// REEMPLAZA la función load() en character.js con esta versión mejorada:

function load() {
    console.log('🔄 Ejecutando load() desde character.js');
    
    // Intentar obtener player ID
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('player') || localStorage.getItem('current_player_id') || 'local';
    
    console.log('📍 Player ID detectado:', playerId);
    
    // Intentar cargar desde múltiples fuentes en orden de prioridad
    let loaded = false;
    
    // 1. Intento: localStorage específico del jugador
    const playerSpecific = localStorage.getItem(`dnd_char_${playerId}`);
    if (playerSpecific) {
        try {
            const loadedState = JSON.parse(playerSpecific);
            state = {...state, ...loadedState};
            console.log('✅ Cargado desde localStorage específico:', playerId);
            loaded = true;
        } catch (err) {
            console.error('Error parseando localStorage específico:', err);
        }
    }
    
    // 2. Intento: localStorage general
    if (!loaded) {
        const generalData = localStorage.getItem('dnd_char');
        if (generalData) {
            try {
                const loadedState = JSON.parse(generalData);
                state = {...state, ...loadedState};
                console.log('✅ Cargado desde localStorage general');
                loaded = true;
            } catch (err) {
                console.error('Error parseando localStorage general:', err);
            }
        }
    }
    
    // 3. Intento: Backup con timestamp
    if (!loaded) {
        const backup = localStorage.getItem(`dnd_char_backup_${playerId}`);
        if (backup) {
            try {
                const backupData = JSON.parse(backup);
                state = {...state, ...backupData.state};
                console.log('✅ Cargado desde backup:', new Date(backupData.timestamp).toLocaleString());
                loaded = true;
            } catch (err) {
                console.error('Error parseando backup:', err);
            }
        }
    }
    
    if (loaded) {
        // Actualizar todos los campos del DOM
        document.getElementById('charName').value = state.name || 'NOMBRE DEL PERSONAJE';
        document.getElementById('charRace').value = state.race || '';
        document.getElementById('charClasses').value = state.classes || '';
        document.getElementById('charLevel').value = state.level || 1;
        document.getElementById('charAlignment').value = state.alignment || 'N';
        document.getElementById('charDeity').value = state.deity || '';
        document.getElementById('charHeight').value = state.height || '';
        
        document.getElementById('maxHP').value = state.maxHP || 100;
        document.getElementById('damage').value = state.damage || 0;
        document.getElementById('nonLethal').value = state.nonLethal || 0;
        document.getElementById('tempHP').value = state.tempHP || 0;
        document.getElementById('acTotal').value = state.ac || 10;
        document.getElementById('dr').value = state.dr || '';
        document.getElementById('sr').value = state.sr || 0;
        document.getElementById('bab').value = state.bab || 0;
        document.getElementById('fortBase').value = state.saves.fort.base || 0;
        document.getElementById('refBase').value = state.saves.ref.base || 0;
        document.getElementById('willBase').value = state.saves.will.base || 0;
        document.getElementById('fortStat').value = state.saves.fort.stat || 'con';
        document.getElementById('refStat').value = state.saves.ref.stat || 'dex';
        document.getElementById('willStat').value = state.saves.will.stat || 'wis';
        document.getElementById('acStat').value = state.acStat || 'dex';
        document.getElementById('fortTotal').value = state.saves.fort.total || 0;
        document.getElementById('refTotal').value = state.saves.ref.total || 0;
        document.getElementById('willTotal').value = state.saves.will.total || 0;
        document.getElementById('initBonus').value = state.init.bonus || 0;
        document.getElementById('initStat').value = state.init.stat || 'dex';
        document.getElementById('speed').value = state.speed || 30;
        
        console.log('✅ Datos cargados en DOM - Personaje:', state.name);
    } else {
        console.log('ℹ️ No hay datos guardados - Personaje nuevo');
    }
}

// REEMPLAZA también la función save() para asegurar triple guardado:

function save() {
    // Capturar todos los valores actuales del DOM
    state.name = document.getElementById('charName').value || "";
    state.race = document.getElementById('charRace').value || "";
    state.classes = document.getElementById('charClasses').value || "";
    state.level = +document.getElementById('charLevel').value || 1;
    state.alignment = document.getElementById('charAlignment').value || "N";
    state.deity = document.getElementById('charDeity').value || "";
    state.height = document.getElementById('charHeight').value || "";
    
    state.maxHP = +document.getElementById('maxHP').value || 100;
    state.damage = +document.getElementById('damage').value || 0;
    state.nonLethal = +document.getElementById('nonLethal').value || 0;
    state.tempHP = +document.getElementById('tempHP').value || 0;
    state.ac = +document.getElementById('acTotal').value || 10;
    state.dr = document.getElementById('dr').value || "";
    state.sr = +document.getElementById('sr').value || 0;
    state.bab = +document.getElementById('bab').value || 0;
    state.speed = +document.getElementById('speed').value || 30;
    
    // Obtener player ID para guardado específico
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('player') || localStorage.getItem('current_player_id') || 'local';
    
    // Triple guardado para máxima seguridad
    localStorage.setItem('dnd_char', JSON.stringify(state));
    localStorage.setItem(`dnd_char_${playerId}`, JSON.stringify(state));
    localStorage.setItem(`dnd_char_backup_${playerId}`, JSON.stringify({
        state: state,
        timestamp: Date.now(),
        player: playerId
    }));
    
    console.log('💾 Guardado en localStorage (triple backup)');
}

function saveChar() {
    save();
    const json = JSON.stringify(state, null, 2);
    download(json, `${state.name.replace(/\s+/g,'_')}_${Date.now()}.json`);
    alert('Guardado!');
}

function loadChar() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json';
    inp.onchange = e => {
        const f = e.target.files[0];
        if (!f) return;
        
        const r = new FileReader();
        r.onload = ev => {
            try {
                state = {...state, ...JSON.parse(ev.target.result)};
                save();
                location.reload();
            } catch (err) {
                alert('Error: ' + err.message);
            }
        };
        r.readAsText(f);
    };
    inp.click();
}

function download(data, filename) {
    const blob = new Blob([data], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    
    ['maxHP','damage','nonLethal','tempHP'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateHP);
    });
    
    document.getElementById('acTotal').addEventListener('input', () => {
        state.ac = +document.getElementById('acTotal').value;
        save();
    });
    document.getElementById('dr').addEventListener('input', () => { 
        state.dr = document.getElementById('dr').value; 
        save(); 
    });
    document.getElementById('sr').addEventListener('input', () => { 
        state.sr = +document.getElementById('sr').value; 
        save(); 
    });
    document.getElementById('bab').addEventListener('input', updateCombat);
    
    ['fortBase','refBase','willBase'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateSaves);
    });
    
    ['fortStat','refStat','willStat'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateSaves);
    });
    
    ['fortTotal','refTotal','willTotal'].forEach(id => {
        document.getElementById(id).addEventListener('change', function() {
            const save = id.replace('Total','');
            state.saves[save].total = +this.value;
            save();
        });
    });
    
    document.getElementById('initBonus').addEventListener('input', updateInit);
    document.getElementById('initStat').addEventListener('change', updateInit);
    document.getElementById('speed').addEventListener('input', save);
    
    ['charName','charRace','charClasses','charLevel','charAlignment','charDeity','charHeight'].forEach(id => {
        document.getElementById(id).addEventListener('blur', save);
        document.getElementById(id).addEventListener('change', save);
    });
    
    document.getElementById('eventInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') addEvent();
    });
    
    document.getElementById('newItem').addEventListener('keypress', e => {
        if (e.key === 'Enter') addItem();
    });
    
    document.getElementById('newLanguage').addEventListener('keypress', e => {
        if (e.key === 'Enter') addLanguage();
    });
    
    document.getElementById('newAbility').addEventListener('keypress', e => {
        if (e.key === 'Enter') document.getElementById('newAbilityDesc').focus();
    });
    
    document.getElementById('newFeat').addEventListener('keypress', e => {
        if (e.key === 'Enter') addFeat();
    });
    
    setInterval(save, 30000);
    setInterval(autoSaveEvents, 60000);
});

document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveChar();
    }
});

// Función para limpiar una sección específica
function clearSection(section) {
    const confirmMsg = {
        'ac': '¿Limpiar todos los bonificadores de AC?',
        'attack': '¿Limpiar todos los bonificadores de Ataque?',
        'saves': '¿Limpiar todos los bonificadores de Salvaciones (Fort, Ref, Will y General)?'
    };
    
    if (!confirm(confirmMsg[section])) return;
    
    if (section === 'ac') {
        state.bonuses.ac = [];
        renderBreakdowns();
        updateDefenses();
    } else if (section === 'attack') {
        state.bonuses.attack = [];
        renderBreakdowns();
    } else if (section === 'saves') {
        state.bonuses.fort = [];
        state.bonuses.ref = [];
        state.bonuses.will = [];
        state.bonuses.saveGeneral = [];
        renderBreakdowns();
        updateSaves();
    }
    
    save();
    alert('✓ Sección limpiada exitosamente');
}

// Función para limpiar todo el personaje
function clearAll() {
    const confirm1 = confirm('⚠️ ADVERTENCIA: Esto borrará TODO el personaje (stats, bonos, skills, inventory, etc.).\n\n¿Estás seguro?');
    if (!confirm1) return;
    
    const confirm2 = confirm('⚠️ ÚLTIMA CONFIRMACIÓN: Esta acción NO se puede deshacer.\n\n¿Realmente deseas borrar todo el personaje?');
    if (!confirm2) return;
    
    // Limpiar localStorage
    localStorage.removeItem('dnd_char');
    localStorage.removeItem('dnd_events_auto');
    
    // Resetear el state a valores por defecto
    state = {
        name: 'NOMBRE DEL PERSONAJE',
        race: '',
        classes: '',
        level: 1,
        alignment: 'N',
        deity: '',
        height: '',
        portrait: null,
        stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        maxHP: 100,
        damage: 0,
        nonLethal: 0,
        tempHP: 0,
        ac: 10,
        acStat: 'dex',
        dr: '',
        sr: 0,
        bab: 0,
        saves: {
            fort: { base: 0, stat: 'con', total: 0 },
            ref: { base: 0, stat: 'dex', total: 0 },
            will: { base: 0, stat: 'wis', total: 0 }
        },
        init: { bonus: 0, stat: 'dex' },
        speed: 30,
        bonuses: { ac: [], fort: [], ref: [], will: [], attack: [], saveGeneral: [] },
        customBreakdowns: [],
        attacks: [],
        equipment: {},
        skills: [],
        languages: [],
        inventory: [],
        abilities: [],
        feats: [],
        events: []
    };
    
    // Re-inicializar
    defaultSlots.forEach(s => {
        state.equipment[s] = '';
    });
    
    state.skills = defaultSkills.map(sk => {
        const [n, s] = sk.split('|');
        return {n, s, r: 0, m: 0, cs: false};
    });
    
    // Re-renderizar todo
    render();
    save();
    
    alert('✓ Personaje limpiado completamente. Comienza de nuevo!');
}

console.log('D&D Character Manager loaded!');

// ============= MULTI-PERSONAJE =============

let currentPlayer = '';
let currentCharacter = '';

function getURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        player: urlParams.get('player'),
        character: urlParams.get('character') || 'default'
    };
}

function setURLParams(player, character) {
    const url = new URL(window.location);
    url.searchParams.set('player', player);
    url.searchParams.set('character', character);
    window.history.pushState({}, '', url);
}

async function loadCharacterList() {
    const params = getURLParams();
    if (!params.player) return;
    
    currentPlayer = params.player;
    currentCharacter = params.character;
    
    try {
        const response = await fetch(`/api/characters?player=${params.player}`);
        if (response.ok) {
            const characters = await response.json();
            updateCharacterDropdown(characters);
        }
    } catch (err) {
        console.log('No server, usando localStorage');
        updateCharacterDropdownLocal();
    }
}

function updateCharacterDropdown(characters) {
    let dropdown = document.getElementById('characterSelector');
    if (!dropdown) {
        createCharacterDropdown();
        dropdown = document.getElementById('characterSelector');
    }
    
    dropdown.innerHTML = '';
    
    characters.forEach(char => {
        const option = document.createElement('option');
        option.value = char.id;
        option.textContent = `${char.name} (${char.classes || 'Sin clase'} ${char.level})`;
        if (char.id === currentCharacter) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });
    
    // Opción para crear nuevo
    const newOption = document.createElement('option');
    newOption.value = '__new__';
    newOption.textContent = '➕ Nuevo Personaje';
    dropdown.appendChild(newOption);
}

function updateCharacterDropdownLocal() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('dnd_char_'));
    const characters = keys.map(k => {
        try {
            const data = JSON.parse(localStorage.getItem(k));
            const charId = k.replace('dnd_char_', '');
            return {
                id: charId,
                name: data.name || 'Sin nombre',
                classes: data.classes || '',
                level: data.level || 1
            };
        } catch {
            return null;
        }
    }).filter(c => c !== null);
    
    updateCharacterDropdown(characters);
}

function createCharacterDropdown() {
    const charNameInput = document.getElementById('charName');
    if (!charNameInput) return;
    
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; gap: 10px; align-items: center; margin-bottom: 10px;';
    
    const label = document.createElement('label');
    label.textContent = '📋 Personaje:';
    label.style.cssText = 'font-weight: bold; color: #4ecdc4;';
    
    const dropdown = document.createElement('select');
    dropdown.id = 'characterSelector';
    dropdown.style.cssText = `
        padding: 8px 12px;
        background: rgba(30,30,50,0.8);
        border: 1px solid rgba(78,205,196,0.4);
        border-radius: 6px;
        color: #4ecdc4;
        font-size: 14px;
        cursor: pointer;
        min-width: 250px;
    `;
    
    dropdown.onchange = function() {
        if (this.value === '__new__') {
            createNewCharacter();
        } else {
            switchCharacter(this.value);
        }
    };
    
    container.appendChild(label);
    container.appendChild(dropdown);
    
    // Insertar antes del input del nombre
    charNameInput.parentElement.insertBefore(container, charNameInput);
}

function switchCharacter(characterId) {
    const params = getURLParams();
    if (characterId === currentCharacter) return;
    
    if (!confirm('¿Cambiar de personaje? Los cambios actuales deben estar guardados.')) {
        // Restaurar selección anterior
        document.getElementById('characterSelector').value = currentCharacter;
        return;
    }
    
    currentCharacter = characterId;
    setURLParams(params.player, characterId);
    window.location.reload();
}

function createNewCharacter() {
    const charName = prompt('Nombre del nuevo personaje:');
    if (!charName) {
        // Restaurar selección
        document.getElementById('characterSelector').value = currentCharacter;
        return;
    }
    
    const charId = charName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const params = getURLParams();
    
    currentCharacter = charId;
    setURLParams(params.player, charId);
    window.location.reload();
}

// Modificar save y load para usar multi-personaje
const originalSaveMulti = save;
save = function() {
    const params = getURLParams();
    const storageKey = params.player && params.character 
        ? `dnd_char_${params.player}_${params.character}`
        : 'dnd_char';
    
    localStorage.setItem(storageKey, JSON.stringify(state));
    console.log('💾 Guardado:', storageKey);
};

const originalLoadMulti = load;
load = function() {
    const params = getURLParams();
    const storageKey = params.player && params.character 
        ? `dnd_char_${params.player}_${params.character}`
        : 'dnd_char';
    
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            state = {...state, ...data};
            console.log('📂 Cargado:', storageKey);
        } catch (err) {
            console.error('Error cargando:', err);
        }
    }
};

// Inicializar al cargar
window.addEventListener('DOMContentLoaded', () => {
    const params = getURLParams();
    if (params.player) {
        loadCharacterList();
    }
});

console.log('🎲 Sistema multi-personaje activado');