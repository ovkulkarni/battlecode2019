import { Pathfinder, karbonite_pred } from './pathfinder.js';

export function runPilgrim(m) {
    m.log("PILGRIM ID: " + m.me.id + "  X: "+m.me.x+"  Y: "+m.me.y);
    if (typeof m.pathfinder === "undefined")
        m.pathfinder = new Pathfinder(m, karbonite_pred(m));
    let next = m.pathfinder.next_loc(m);
    if (next === undefined) return m.mine();
    else if(next === -1) {
        m.log("PILGRIM STUCK BIG RIP");
    }
    else {
            m.log("PILGRIM MOVING: " + next);
            let dx = next[0] - m.me.x; let dy = next[1] - m.me.y;
            return m.move(dx, dy);
    }
}
