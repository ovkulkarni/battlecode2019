import { Pathfinder, karbonite_pred } from './pathfinder.js';

export function runPilgrim(m) {
    if (typeof m.pathfinder === "undefined")
        m.pathfinder = new Pathfinder(m, karbonite_pred(m));
    let next = m.pathfinder.next_loc();
    if (next === undefined) return m.mine();
    let dx = next[0] - m.me.x; let dy = next[1] - m.me.y;
    return m.move(dx, dy);
}