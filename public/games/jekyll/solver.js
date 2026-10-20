'use strict';
/*
 * JEKYLL.EXE: the solver, in a worker. The game asks it two things about
 * the room you're in, from exactly where you are: what's a good next move
 * (a hint), and can this still be won at all (if not, the panel says so,
 * and Z takes the move back). It runs the same rules as the game: core.js.
 */
importScripts('core.js', 'world.js', 'rooms.js');

const compiled = new Map();
onmessage = (e) => {
  const { id, room, st, max } = e.data;
  let cr = compiled.get(room);
  if (!cr) { cr = JH.compile(room); compiled.set(room, cr); }
  const r = JH.solve(cr, st, { max: max || 400000 });
  postMessage({ id, ok: r.ok, capped: !!r.capped, first: r.path ? r.path[0] : null, len: r.path ? r.path.length : 0 });
};
