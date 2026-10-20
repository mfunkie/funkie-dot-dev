'use strict';
/*
 * JEKYLL.EXE: core. The rules of the game, the room compiler and the solver.
 * Nothing in here touches the DOM, so node tools (scripts/jekyll/) run the
 * very same rules the browser does: the solver that proves every room can be
 * finished, the lints, and the hint and "stuck" checks the game itself uses.
 *
 * The game is turn-based. One body, two forms:
 *
 *   JEKYLL  respectable. People who see him come over to him (one step a
 *           turn), and stop beside him. He keeps to the floor.
 *   HYDE    small and quick. People who see him back away (one step a turn).
 *           He can clamber over crates, railings, straw and hedges ("low"
 *           tiles), which nobody else can. If someone beside him has nowhere
 *           to back away to, he strikes them, and the night ends badly.
 *
 * People see along their row and column, four squares, until a wall, a
 * person, fog or a closed thing is in the way; next to you, they always see
 * you. A constable sees only along the beam of his bull's-eye lantern, the
 * way he faces. Mr. Utterson (a "seek") sees farther: near, he knows Hyde;
 * farther off, he comes for a closer look. Nobody may watch the change.
 * Every turn is a minute.
 */
var JH = (typeof globalThis !== 'undefined' ? globalThis : window).JH || {};
(typeof globalThis !== 'undefined' ? globalThis : window).JH = JH;

(() => {
  const W = 16, H = 10;
  JH.W = W;
  JH.H = H;
  JH.SIGHT = 4;   // how far people see along a line
  JH.LAMP = 5;    // how far a bull's-eye lantern throws its beam

  const DIRS = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
  const DIR_OF = (dx, dy) => (dx > 0 ? 'e' : dx < 0 ? 'w' : dy > 0 ? 's' : 'n');
  const BACK = { n: 's', s: 'n', e: 'w', w: 'e' };
  JH.DIRS = DIRS;
  JH.BACK = BACK;

  /*
   * What a tile does. walk is a bit set: 1 Jekyll, 2 Hyde, 4 other people.
   * see: whether a line of sight passes over it.
   */
  const WJ = 1, WH = 2, WN = 4;
  JH.KINDS = {
    wall:   { walk: 0, see: 0 },
    floor:  { walk: WJ | WH | WN, see: 1 },
    low:    { walk: WH, see: 1 },          // crates, straw, railings, hedges: Hyde clambers over
    table:  { walk: 0, see: 1 },           // furniture you can see over
    block:  { walk: 0, see: 0 },           // furniture, carts and stalls you can't
    door:   { walk: WJ | WH | WN, see: 1 },
    exit:   { walk: WJ | WH, see: 1 },     // ways out are the player's; people keep off them
    window: { walk: 0, see: 0 },           // a wall; watchers outside can see in through it
  };

  /*
   * Screens are drawn once (world.js) and reused by every room set in them,
   * so a place looks and works the same each time you come back. A screen's
   * legend maps a map character to { kind, art, act?, exit?, decor? }.
   */
  JH.SCREENS = JH.SCREENS || {};
  JH.ROOMS = JH.ROOMS || {};
  JH.CHAPTERS = JH.CHAPTERS || [];
  JH.screen = (id, def) => { def.id = id; JH.SCREENS[id] = def; return def; };
  JH.room = (id, def) => { def.id = id; JH.ROOMS[id] = def; return def; };

  JH.DEFAULT_LEGEND = {
    '#': { kind: 'wall', art: 'brick' },
    '.': { kind: 'floor', art: 'floor' },
    '=': { kind: 'low', art: 'crate' },
    '+': { kind: 'door', art: 'door' },
  };

  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  /* --------------------------------------------------------- compiling */

  /*
   * A room is a screen plus everything that's true of one moment in it: who
   * is there, what's open, what you're after and when. compile() turns the
   * definitions into the flat arrays the rules and the solver read.
   */
  JH.compile = function (roomId) {
    const def = JH.ROOMS[roomId];
    if (!def) throw new Error('no room ' + roomId);
    const scr = JH.SCREENS[def.screen];
    if (!scr) throw new Error(roomId + ': no screen ' + def.screen);
    const legend = Object.assign({}, JH.DEFAULT_LEGEND, scr.legend || {});
    const cells = [];
    const exits = {};
    const acts = {};
    for (let y = 0; y < H; y++) {
      const row = scr.map[y];
      if (!row || row.length !== W) throw new Error(`${def.screen}: row ${y} is not ${W} wide`);
      for (let x = 0; x < W; x++) {
        const ch = row[x];
        const L = legend[ch];
        if (!L) throw new Error(`${def.screen}: no legend for '${ch}' at ${x},${y}`);
        cells.push(Object.assign({ ch }, L));
      }
    }
    // A room may change a screen for its moment: furniture brought in, a door
    // nailed shut, the drawer gone.
    for (const p of def.place || []) {
      const L = Object.assign({}, legend[p.ch] || {}, p.tile || {});
      cells[p.y * W + p.x] = Object.assign({ ch: p.ch || '?' }, L);
    }
    cells.forEach((c, i) => {
      const x = i % W, y = (i / W) | 0;
      if (c.exit) {
        const rule = (def.exits || {})[c.exit];
        (exits[c.exit] = exits[c.exit] || { id: c.exit, cells: [], rule: rule || null, link: (scr.exits || {})[c.exit] || null }).cells.push([x, y]);
      }
      if (c.act) (acts[c.act] = acts[c.act] || { id: c.act, cells: [], rule: (def.acts || {})[c.act] || null }).cells.push([x, y]);
    });
    const kind = cells.map((c) => {
      const k = JH.KINDS[c.kind];
      if (!k) throw new Error(`${def.screen}: unknown kind ${c.kind}`);
      return k;
    });
    // Exits a room doesn't open are walls for the moment.
    const walk = new Uint8Array(W * H), see = new Uint8Array(W * H);
    cells.forEach((c, i) => {
      walk[i] = kind[i].walk;
      see[i] = kind[i].see;
      if (c.exit && !(exits[c.exit] && exits[c.exit].rule)) walk[i] = 0;
      if (c.exit && exits[c.exit] && exits[c.exit].rule && exits[c.exit].rule.leave) walk[i] |= WN;
    });

    const people = (def.people || []).map((p, i) => compilePerson(def, p, i, walk));
    const items = (def.items || []).map((it, i) => Object.assign({ i }, it));

    let fog = null;
    if (def.fog) {
      const rows = def.fog.map;
      const fh = rows.length, fw = rows[0].length;
      const bits = new Uint8Array(fw * fh);
      rows.forEach((r, y) => { for (let x = 0; x < fw; x++) bits[y * fw + x] = r[x] === '~' ? 1 : 0; });
      fog = { bits, fw, fh, dx: def.fog.dx || 0, dy: def.fog.dy || 0, every: def.fog.every || 1, period: 0 };
      // Fog drifts and wraps, so it repeats; the solver uses the period.
      const px = fog.dx ? fw / gcd(fw, Math.abs(fog.dx)) : 1;
      const py = fog.dy ? fh / gcd(fh, Math.abs(fog.dy)) : 1;
      fog.period = lcm(px, py) * fog.every;
    }

    return {
      id: roomId, def, screen: scr, cells, walk, see, exits, acts, people, items, fog,
      start: def.start,
      clock: def.clock || 0,
      deadline: has(def, 'deadline') ? def.deadline : null,
      window: def.window || null,
      wanted: !!def.wanted,
      change: def.change || null,
      doze: !!def.doze,
      cost: def.cost || 1,
      sight: def.sight || JH.SIGHT,
      seenOk: def.seenOk || def.mustSee || null,
      goal: def.goal || null,
    };
  };

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function lcm(a, b) { return (a * b) / gcd(a, b); }

  function compilePerson(def, p, i, walk) {
    const o = Object.assign({ i, kind: 'civ', d: 's', name: 'SOMEONE' }, p);
    if (o.kind === 'const') {
      // A beat: waypoints joined by straight lines. Out and back, or round.
      const pts = o.route || [[o.x, o.y]];
      const path = [[pts[0][0], pts[0][1]]];
      for (let k = 1; k < pts.length; k++) appendLine(path, pts[k], def.id);
      if (o.loop && pts.length > 1) appendLine(path, pts[0], def.id), path.pop();
      o.path = path;
      o.x = path[0][0];
      o.y = path[0][1];
      if (path.length > 1 && !p.d) o.d = DIR_OF(path[1][0] - path[0][0], path[1][1] - path[0][1]);
    }
    return o;
  }

  function appendLine(path, to, roomId) {
    const [fx, fy] = path[path.length - 1];
    const [tx, ty] = to;
    if (fx !== tx && fy !== ty) throw new Error(`${roomId}: a beat must run in straight lines (${fx},${fy} to ${tx},${ty})`);
    const dx = Math.sign(tx - fx), dy = Math.sign(ty - fy);
    let x = fx, y = fy;
    while (x !== tx || y !== ty) { x += dx; y += dy; path.push([x, y]); }
  }

  /* -------------------------------------------------------------- state */

  /*
   * A state is plain data, so undo is a stack and the solver can hash it.
   *   t       turns (minutes) since the room began
   *   x, y    where you are; f is the form, 'J' or 'H'
   *   doses   draughts in hand
   *   inv     items carried (ids); took: floor items picked up (bits)
   *   flags   things done (ids)
   *   chg     turns until the change takes you, when it comes on its own
   *   ppl     each person: x, y, d (facing), r (place on a beat), s (+1/-1),
   *           gone (left the room), on (has arrived)
   *   out     null while the room is going, else { k: 'win'|'fail', ... }
   */
  JH.initState = function (cr) {
    const s = cr.start;
    return {
      t: 0,
      x: s.x, y: s.y, f: s.form || 'J', d: s.d || 's',
      doses: s.doses || 0,
      inv: (s.items || []).slice().sort(),
      took: 0,
      flags: (s.flags || []).slice().sort(),
      chg: cr.change ? (has(cr.change, 'start') ? cr.change.start : cr.change.every) : null,
      ppl: cr.people.map((p) => ({ x: p.x, y: p.y, d: p.d, r: 0, s: 1, gone: 0, on: p.enter ? 0 : 1 })),
      out: null,
    };
  };

  function clone(st) {
    return {
      t: st.t, x: st.x, y: st.y, f: st.f, d: st.d, doses: st.doses,
      inv: st.inv.slice(), took: st.took, flags: st.flags.slice(), chg: st.chg,
      ppl: st.ppl.map((p) => ({ x: p.x, y: p.y, d: p.d, r: p.r, s: p.s, gone: p.gone, on: p.on })),
      out: null,
    };
  }
  JH.clone = clone;

  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  /* Fog: a pattern that drifts across the room and wraps. */
  JH.fogAt = function (cr, t, x, y) {
    const f = cr.fog;
    if (!f) return false;
    const steps = Math.floor(t / f.every);
    const fx = (((x - f.dx * steps) % f.fw) + f.fw) % f.fw;
    const fy = (((y - f.dy * steps) % f.fh) + f.fh) % f.fh;
    return f.bits[fy * f.fw + fx] === 1;
  };

  /* Who is standing where: -1 for you, a person's index, or null. */
  function occupant(cr, st, x, y) {
    if (st.x === x && st.y === y) return -1;
    for (let i = 0; i < st.ppl.length; i++) {
      const p = st.ppl[i];
      if (p.on && !p.gone && p.x === x && p.y === y) return i;
    }
    return null;
  }
  JH.occupant = occupant;

  /*
   * Can the one at (ox,oy) see (tx,ty)? Along a row or column only, within
   * range; next to each other always; otherwise every square between must be
   * clear: see-through, empty of people, and out of the fog (fog also hides
   * whoever is standing in it). dir limits it to one way (a lantern).
   */
  function sees(cr, st, ox, oy, tx, ty, range, dir) {
    const dx = tx - ox, dy = ty - oy;
    if (dx !== 0 && dy !== 0) return false;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist === 0 || dist > range) return false;
    if (dir && DIR_OF(dx, dy) !== dir) return false;
    if (dist === 1) return true;
    if (JH.fogAt(cr, st.t, ox, oy) || JH.fogAt(cr, st.t, tx, ty)) return false;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    for (let k = 1; k < dist; k++) {
      const x = ox + sx * k, y = oy + sy * k;
      if (!cr.see[y * W + x]) return false;
      if (JH.fogAt(cr, st.t, x, y)) return false;
      if (occupant(cr, st, x, y) !== null) return false;
    }
    return true;
  }
  JH.sees = sees;

  /* The squares a constable's lantern lights, in order. */
  JH.beam = function (cr, st, i) {
    const p = st.ppl[i];
    const out = [];
    const [dx, dy] = DIRS[p.d];
    let x = p.x, y = p.y;
    for (let k = 1; k <= JH.LAMP; k++) {
      x += dx; y += dy;
      if (!inb(x, y) || !cr.see[y * W + x] || JH.fogAt(cr, st.t, x, y)) break;
      out.push([x, y]);
      if (occupant(cr, st, x, y) !== null) break;
    }
    return out;
  };

  /* Does person i see you right now? */
  function personSees(cr, st, i) {
    const pd = cr.people[i], p = st.ppl[i];
    if (!p.on || p.gone || pd.asleep) return false;
    if (pd.kind === 'const') return JH.beam(cr, st, i).some(([x, y]) => x === st.x && y === st.y);
    if (pd.kind === 'watch') return (pd.dirs || ['n', 'e', 's', 'w']).some((d) => sees(cr, st, p.x, p.y, st.x, st.y, pd.range || 9, d));
    return sees(cr, st, p.x, p.y, st.x, st.y, pd.range || cr.sight);
  }
  JH.personSees = personSees;

  /* --------------------------------------------------------- conditions */

  function meets(cr, st, need) {
    if (!need) return true;
    if (need.form && st.f !== need.form) return false;
    if (need.flags && !need.flags.every((f) => st.flags.includes(f))) return false;
    if (need.not && need.not.some((f) => st.flags.includes(f))) return false;
    if (need.items && !need.items.every((it) => st.inv.includes(it))) return false;
    if (need.doses != null && st.doses < need.doses) return false;
    if (need.after != null && cr.clock + st.t < need.after) return false;
    if (need.before != null && cr.clock + st.t > need.before) return false;
    if (need.gone && !need.gone.every((n) => st.ppl[n].gone)) return false;
    if (need.below) for (const [k, v] of Object.entries(need.below)) if (JH.tally(st, k) >= v) return false;
    if (need.allGone && !cr.people.every((p, i) => !p.guest || st.ppl[i].gone)) return false;
    return true;
  }
  JH.meets = meets;

  JH.tally = (st, name) => {
    for (const f of st.flags) if (f.startsWith(name + ':')) return Number(f.slice(name.length + 1));
    return 0;
  };
  const addFlag = (st, f) => { if (!st.flags.includes(f)) { st.flags.push(f); st.flags.sort(); } };
  const addItem = (st, it) => { if (!st.inv.includes(it)) { st.inv.push(it); st.inv.sort(); } };

  function canWalk(cr, st, x, y, form) {
    if (!inb(x, y)) return false;
    const bit = form === 'H' ? WH : WJ;
    if (!(cr.walk[y * W + x] & bit)) return false;
    return occupant(cr, st, x, y) === null;
  }
  JH.canWalk = canWalk;

  function npcFree(cr, st, x, y) {
    if (!inb(x, y)) return false;
    if (!(cr.walk[y * W + x] & WN)) return false;
    return occupant(cr, st, x, y) === null;
  }

  /* ---------------------------------------------------------------- turn */

  JH.ACTIONS = ['n', 'e', 's', 'w', 'wait', 'drink'];

  /*
   * One turn. Returns { st, ev, used } where used is false when the action
   * did nothing (walking into a wall): no time passes then.
   *
   * Order: you act; the change comes if it's due; anyone who saw the change
   * ends the night; people react, nearest first towards Jekyll and farthest
   * first away from Hyde, so a crowd moves like one; constables walk their
   * beats; then the lanterns and Mr. Seek have their say, and the clock.
   */
  JH.step = function (cr, st0, act) {
    if (st0.out) return { st: st0, ev: [], used: false };
    const st = clone(st0);
    const ev = [];
    let changed = false;

    if (DIRS[act]) {
      const [dx, dy] = DIRS[act];
      const nx = st.x + dx, ny = st.y + dy;
      st.d = act;
      const cell = inb(nx, ny) ? cr.cells[ny * W + nx] : null;
      // Bumping into something you can use.
      if (cell && cell.act && cr.acts[cell.act] && cr.acts[cell.act].rule) {
        const a = cr.acts[cell.act];
        const r = a.rule;
        if (r.once && st.flags.includes('@' + a.id)) {
          if (r.again) ev.push({ t: 'say', text: r.again, who: r.who });
          return { st: st0, ev, used: false, bump: a.id };
        }
        if (!meets(cr, st, r.need)) {
          if (r.no) ev.push({ t: 'say', text: r.no, who: r.who });
          return { st: st0, ev, used: false, bump: a.id };
        }
        if (r.hyde && st.f === 'H') {
          // Hyde's "ape-like spite": what Jekyll keeps, Hyde destroys.
          st.t++;
          st.out = { k: 'fail', why: r.hyde, act: a.id };
          ev.push({ t: 'fail', why: r.hyde });
          return { st, ev, used: true };
        }
        ev.push({ t: 'act', id: a.id, x: nx, y: ny });
        if (r.count) {
          // A tally kept in flags as 'name:n' (pages written, crates searched).
          const n = JH.tally(st, r.count) + 1;
          st.flags = st.flags.filter((f) => !f.startsWith(r.count + ':'));
          addFlag(st, r.count + ':' + n);
          if (r.of && n >= r.of && r.done) addFlag(st, r.done);
          const text = (r.sayEach || [])[n - 1];
          if (text) ev.push({ t: 'say', text, who: r.who });
        }
        if (r.say) ev.push({ t: 'say', text: r.say, who: r.who });
        if (r.once) addFlag(st, '@' + a.id);
        if (r.set) [].concat(r.set).forEach((f) => addFlag(st, f));
        if (r.give) {
          if (r.give.doses) st.doses += r.give.doses;
          for (const it of r.give.items || []) addItem(st, it);
        }
        if (r.take) st.inv = st.inv.filter((it) => !r.take.includes(it));
        if (r.change && st.f !== r.change) { st.f = r.change; changed = 'forced'; ev.push({ t: 'change', to: st.f, forced: true }); }
        if (r.win) { st.t++; st.out = { k: 'win', act: a.id, to: r.win }; return { st, ev, used: true }; }
      } else if (cell && cell.exit && cr.exits[cell.exit] && cr.exits[cell.exit].rule && occupant(cr, st, nx, ny) === null) {
        const e = cr.exits[cell.exit];
        if (e.rule.shut || e.rule.leave || !meets(cr, st, e.rule.need)) {
          const text = e.rule.shut || e.rule.no;
          if (typeof text === 'string') ev.push({ t: 'say', text, who: e.rule.who });
          return { st: st0, ev, used: false, bump: e.id };
        }
        ev.push({ t: 'move', who: -1, from: [st.x, st.y], to: [nx, ny] });
        st.x = nx; st.y = ny; st.t++;
        st.out = { k: 'win', exit: e.id, to: e.rule.to || 'next' };
        return { st, ev, used: true };
      } else if (canWalk(cr, st, nx, ny, st.f)) {
        ev.push({ t: 'move', who: -1, from: [st.x, st.y], to: [nx, ny] });
        st.x = nx; st.y = ny;
        // Things on the floor are picked up as you pass.
        cr.items.forEach((it) => {
          if (!(st.took & (1 << it.i)) && it.x === nx && it.y === ny) {
            st.took |= 1 << it.i;
            if (it.doses) st.doses += it.doses;
            if (it.item) addItem(st, it.item);
            if (it.set) addFlag(st, it.set);
            ev.push({ t: 'pick', id: it.item || 'dose', x: nx, y: ny, say: it.say });
          }
        });
      } else {
        // A wall, or someone in the way: nothing happens, no time passes.
        const o = inb(nx, ny) ? occupant(cr, st, nx, ny) : null;
        if (o !== null && o >= 0) ev.push({ t: 'blocked', who: o });
        return { st: st0, ev, used: false };
      }
    } else if (act === 'drink') {
      if (st.doses < cr.cost) {
        ev.push({ t: 'say', text: st.doses ? 'NOT ENOUGH OF THE DRAUGHT.' : 'NOTHING TO DRINK.' });
        return { st: st0, ev, used: false };
      }
      st.doses -= cr.cost;
      st.f = st.f === 'J' ? 'H' : 'J';
      changed = true;
      ev.push({ t: 'drink', cost: cr.cost });
      ev.push({ t: 'change', to: st.f });
      if (st.f === 'J' && cr.change) st.chg = cr.change.every;
    } else if (act === 'wait') {
      ev.push({ t: 'wait' });
      if (cr.doze && st.f === 'J') {
        st.f = 'H';
        changed = true;
        ev.push({ t: 'change', to: 'H', doze: true });
      }
    } else {
      return { st: st0, ev, used: false };
    }

    // The change, when it comes on its own.
    if (cr.change && st.f === 'J' && !changed) {
      st.chg--;
      if (st.chg <= 0) {
        st.f = 'H';
        changed = true;
        ev.push({ t: 'change', to: 'H', due: true });
      }
    }

    // "Should the throes of change take me in the act of writing it, Hyde
    // will tear it in pieces": changing beside something kept from him.
    if (changed && st.f === 'H' && cr.def.tears && !st.flags.includes(cr.def.tears.unless)) {
      const a = cr.acts[cr.def.tears.act];
      if (a && a.cells.some(([x, y]) => Math.abs(x - st.x) + Math.abs(y - st.y) <= 1)) {
        st.t++;
        st.out = { k: 'fail', why: cr.def.tears.why || 'torn' };
        ev.push({ t: 'fail', why: st.out.why });
        return { st, ev, used: true };
      }
    }

    // Where the story says someone must see it, they must.
    if (changed && changed !== 'forced' && cr.def.mustSee && !cr.def.mustSee.some((i) => personSees(cr, st, i))) {
      st.t++;
      st.out = { k: 'fail', why: 'unseen', by: cr.def.mustSee[0] };
      ev.push({ t: 'fail', why: 'unseen' });
      return { st, ev, used: true };
    }

    // Nobody may see it happen (except where the story says someone must).
    if (changed && changed !== 'forced') {
      for (let i = 0; i < cr.people.length; i++) {
        if (personSees(cr, st, i)) {
          if (cr.seenOk && cr.seenOk.includes(i)) { addFlag(st, 'witnessed'); ev.push({ t: 'witness', who: i }); continue; }
          st.t++;
          st.out = { k: 'fail', why: 'seen', by: i };
          ev.push({ t: 'fail', why: 'seen', by: i });
          return { st, ev, used: true };
        }
      }
    }

    st.t++;

    // People arrive when their moment comes.
    cr.people.forEach((pd, i) => {
      const p = st.ppl[i];
      if (!p.on && pd.enter && st.t >= pd.enter && npcFree(cr, st, pd.x, pd.y)) {
        p.on = 1;
        ev.push({ t: 'enter', who: i });
      }
    });

    // People react to you.
    const order = cr.people.map((pd, i) => i).filter((i) => {
      const pd = cr.people[i], p = st.ppl[i];
      return p.on && !p.gone && !pd.asleep && (pd.kind === 'civ' || pd.kind === 'seek');
    });
    const dist = (i) => Math.abs(st.ppl[i].x - st.x) + Math.abs(st.ppl[i].y - st.y);
    order.sort((a, b) => (st.f === 'H' ? dist(b) - dist(a) : dist(a) - dist(b)) || a - b);
    for (const i of order) {
      const pd = cr.people[i], p = st.ppl[i];
      if (!sees(cr, st, p.x, p.y, st.x, st.y, pd.range || cr.sight)) continue;
      const dx = Math.sign(st.x - p.x), dy = Math.sign(st.y - p.y);
      const d = dist(i);
      if (st.f === 'H' && pd.kind === 'seek' && d <= (pd.near || 1)) {
        // Close enough: Mr. Seek has seen his face.
        p.d = DIR_OF(dx, dy);
        st.out = { k: 'fail', why: pd.grabs || 'grabbed', by: i };
        ev.push({ t: 'fail', why: st.out.why, by: i });
        return { st, ev, used: true };
      }
      if (st.f === 'J' || pd.kind === 'seek') {
        // Towards Jekyll, to have a word; Mr. Seek towards Hyde, for a
        // closer look (which gives you a turn to get out of his sight).
        p.d = DIR_OF(dx, dy);
        if (d >= 2 && npcFree(cr, st, p.x + dx, p.y + dy)) {
          ev.push({ t: 'move', who: i, from: [p.x, p.y], to: [p.x + dx, p.y + dy], why: 'toward' });
          p.x += dx; p.y += dy;
          const lr = cr.exits && leaveAt(cr, p.x, p.y);
          if (lr && pd.guest && meets(cr, st, lr.need)) { p.gone = 1; ev.push({ t: 'leave', who: i, say: lr.say }); }
        }
        if (st.f === 'H' && pd.kind === 'seek' && pd.closes && dist(i) <= (pd.near || 1)) {
          st.out = { k: 'fail', why: pd.grabs || 'grabbed', by: i };
          ev.push({ t: 'fail', why: st.out.why, by: i });
          return { st, ev, used: true };
        }
      } else {
        // Away from Hyde: "a visible misgiving of the flesh".
        if (pd.steadfast) continue;
        p.d = DIR_OF(dx, dy);
        if (npcFree(cr, st, p.x - dx, p.y - dy)) {
          ev.push({ t: 'move', who: i, from: [p.x, p.y], to: [p.x - dx, p.y - dy], why: 'away' });
          p.x -= dx; p.y -= dy;
        } else if (d === 1) {
          st.out = { k: 'fail', why: 'strike', by: i };
          ev.push({ t: 'fail', why: 'strike', by: i });
          return { st, ev, used: true };
        } else {
          ev.push({ t: 'cower', who: i });
        }
      }
    }

    // Constables walk their beats.
    cr.people.forEach((pd, i) => {
      if (pd.kind !== 'const') return;
      const p = st.ppl[i];
      if (!p.on || p.gone) return;
      const path = pd.path;
      if (path.length < 2) {
        if (pd.spin) {
          const every = pd.every || 1;
          if (st.t % every === 0) {
            const k = (pd.spin.indexOf(p.d) + 1) % pd.spin.length;
            p.d = pd.spin[k];
            ev.push({ t: 'turn', who: i, d: p.d });
          }
        }
        return;
      }
      let next = p.r + p.s;
      if (next < 0 || next >= path.length) {
        if (pd.loop) next = (next + path.length) % path.length;
        else {
          // At the end of his beat he turns round, which takes him a turn.
          p.s = -p.s;
          const n2 = p.r + p.s;
          p.d = DIR_OF(path[n2][0] - path[p.r][0], path[n2][1] - path[p.r][1]);
          ev.push({ t: 'turn', who: i, d: p.d });
          return;
        }
      }
      const [nx, ny] = path[next];
      p.d = DIR_OF(nx - p.x, ny - p.y);
      if (occupant(cr, st, nx, ny) === null) {
        ev.push({ t: 'move', who: i, from: [p.x, p.y], to: [nx, ny], why: 'beat' });
        p.x = nx; p.y = ny; p.r = next;
      } else {
        ev.push({ t: 'wait', who: i });
      }
    });

    // Caught? A constable's lantern (or anyone who knows him) on Hyde.
    if (st.f === 'H') {
      for (let i = 0; i < cr.people.length; i++) {
        const pd = cr.people[i];
        const catches = (pd.kind === 'const' && cr.wanted) || pd.hostile;
        if (catches && personSees(cr, st, i)) {
          st.out = { k: 'fail', why: pd.kind === 'const' ? 'caught' : 'known', by: i };
          ev.push({ t: 'fail', why: st.out.why, by: i });
          return { st, ev, used: true };
        }
      }
    }

    // Some rooms end when something is true, wherever you are.
    if (cr.goal && meets(cr, st, cr.goal)) {
      st.out = { k: 'win', goal: true, to: cr.goal.to || 'next' };
      return { st, ev, used: true };
    }

    if (cr.deadline != null && cr.clock + st.t >= cr.deadline) {
      st.out = { k: 'fail', why: 'time' };
      ev.push({ t: 'fail', why: 'time' });
    }
    return { st, ev, used: true };
  };

  function leaveAt(cr, x, y) {
    const c = cr.cells[y * W + x];
    if (!c.exit) return null;
    const e = cr.exits[c.exit];
    return e && e.rule && e.rule.leave ? e.rule : null;
  }

  /* ------------------------------------------------------ what's watched */

  /*
   * Every square someone can see, for the LOOK view: { watch: Set of 'x,y'
   * seen by people, beams: Set lit by lanterns }. Only who's looking now.
   */
  JH.watched = function (cr, st) {
    const watch = new Map(), beams = new Set();
    const probe = clone(st);
    cr.people.forEach((pd, i) => {
      const p = st.ppl[i];
      if (!p.on || p.gone || pd.asleep) return;
      if (pd.kind === 'const') { JH.beam(cr, st, i).forEach(([x, y]) => beams.add(x + ',' + y)); return; }
      const range = pd.kind === 'watch' ? pd.range || 9 : pd.range || cr.sight;
      for (const d of pd.kind === 'watch' ? pd.dirs || ['n', 'e', 's', 'w'] : ['n', 'e', 's', 'w']) {
        const [dx, dy] = DIRS[d];
        for (let k = 1; k <= range; k++) {
          const x = p.x + dx * k, y = p.y + dy * k;
          if (!inb(x, y)) break;
          if (!cr.walk[y * W + x] && !cr.cells[y * W + x].exit) break;
          // Would they see you if you stood there?
          probe.x = x; probe.y = y;
          if (!sees(cr, probe, p.x, p.y, x, y, range, d)) break;
          watch.set(x + ',' + y, (watch.get(x + ',' + y) || 0) + 1);
        }
      }
    });
    return { watch, beams };
  };

  /* -------------------------------------------------------------- solver */

  /*
   * A state's identity, for the solver's visited set. Time counts only when
   * something in the room depends on it (fog, a deadline, a window, arrivals).
   */
  JH.timeMatters = (cr) => !!(cr.fog || cr.deadline != null || cr.window || cr.people.some((p) => p.enter) ||
    Object.values(cr.exits).some((e) => e.rule && e.rule.need && (e.rule.need.after != null || e.rule.need.before != null)) ||
    Object.values(cr.acts).some((a) => a.rule && a.rule.need && (a.rule.need.after != null || a.rule.need.before != null)));

  JH.key = function (cr, st, tm) {
    let k = st.x + ',' + st.y + st.f + st.doses + '|' + st.inv.join(',') + '|' + st.took + '|' + st.flags.join(',') + '|' + st.chg;
    for (const p of st.ppl) k += '|' + (p.gone ? 'g' : p.on ? p.x + ',' + p.y + p.d + p.r + (p.s > 0 ? '+' : '-') : 'o');
    if (tm) k += '@' + (cr.deadline != null || cr.window || cr.people.some((p) => p.enter) ? st.t : st.t % (cr.fog ? cr.fog.period : 1));
    return k;
  };

  /*
   * Breadth-first search from a state to a win. Returns { ok, path, states,
   * capped }: path is the list of actions of a shortest way through. opts:
   *   max       stop after this many states (capped: true)
   *   accept    (st) => bool, a win that counts (default: any win)
   */
  JH.solve = function (cr, st0, opts = {}) {
    const max = opts.max || 2e6;
    const accept = opts.accept || ((st) => st.out && st.out.k === 'win');
    const tm = JH.timeMatters(cr);
    const seen = new Map();
    const startKey = JH.key(cr, st0, tm);
    seen.set(startKey, null);
    let frontier = [st0];
    const parent = new Map();
    let n = 1;
    if (accept(st0)) return { ok: true, path: [], states: 1 };
    while (frontier.length) {
      const next = [];
      for (const st of frontier) {
        const sk = JH.key(cr, st, tm);
        for (const a of JH.ACTIONS) {
          const r = JH.step(cr, st, a);
          if (!r.used) continue;
          if (r.st.out && r.st.out.k === 'fail') continue;
          const k = r.st.out ? 'WIN:' + JH.key(cr, r.st, tm) : JH.key(cr, r.st, tm);
          if (seen.has(k)) continue;
          seen.set(k, null);
          parent.set(k, [sk, a]);
          n++;
          if (accept(r.st)) {
            const path = [a];
            let cur = sk;
            while (cur !== startKey) { const [pk, pa] = parent.get(cur); path.push(pa); cur = pk; }
            return { ok: true, path: path.reverse(), states: n, end: r.st };
          }
          if (!r.st.out) next.push(r.st);
          if (n >= max) return { ok: false, capped: true, states: n };
        }
      }
      frontier = next;
    }
    return { ok: false, capped: false, states: n };
  };

  /* Replays a list of actions; stops at the first that ends the room. */
  JH.replay = function (cr, actions, st = JH.initState(cr)) {
    const trail = [st];
    for (const a of actions) {
      const r = JH.step(cr, st, a);
      if (r.used) { st = r.st; trail.push(st); }
      if (st.out) break;
    }
    return { st, trail };
  };

  /* What the panel says you're after: the first of goals whose need is met. */
  JH.goalText = function (cr, st) {
    for (const g of cr.def.goals || []) if (meets(cr, st, g.need)) return g.text;
    return cr.def.goalText || '';
  };

  /* Clock text for a room's minute: "3:07 AM". */
  JH.clockText = function (mins) {
    const m = ((mins % 1440) + 1440) % 1440;
    let h = Math.floor(m / 60);
    const mm = m % 60;
    const ap = h < 12 ? 'AM' : 'PM';
    h = h % 12 || 12;
    return h + ':' + String(mm).padStart(2, '0') + ' ' + ap;
  };
})();
