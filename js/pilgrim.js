import { Pathfinder, karbonite_pred, around_pred } from './pathfinder.js';
import { get_stats, list_dir, idx } from './helpers.js';

export function runPilgrim(m) {
    m.log("PILGRIM ID: " + m.me.id + "  X: " + m.me.x + "  Y: " + m.me.y);
    if (m.ix === undefined) {
        let choices = list_dir(2);
        for (let i = 0; i < 8; i++) {
            let r = m.getRobot(idx(m.getVisibleRobotMap(), choices[i][0] + m.me.x, choices[i][1] + m.me.y));
            if (r === null) continue;
            if (r.unit <= 1) {
                m.ix = choices[i][0] + m.me.x;
                m.iy = choices[i][1] + m.me.y;
                break;
            }
        }
    }
    if (typeof m.pathfinder === "undefined")
        m.pathfinder = new Pathfinder(m, karbonite_pred(m), 0);
    let next = m.pathfinder.next_loc(m);
    if (next.fin) {
        if (m.pathfinder.type == 0) {
            if (m.me.karbonite === m.stats.get("kcap") || m.me.fuel === m.stats.get("fcap")) {
                m.log("DROPPING OFF");
                m.pathfinder = new Pathfinder(m, around_pred(m.ix, m.iy, 1, 2), 1);
                next = m.pathfinder.next_loc(m);
            }
            else {
                m.log("MINING");
                return m.mine();
            }
        }
        else if (m.pathfinder.type == 1) {
            let dx = m.ix - m.me.x;
            let dy = m.iy - m.me.y;
            m.pathfinder = new Pathfinder(m, karbonite_pred(m), 0);
            return m.give(dx, dy, m.me.karbonite, m.me.fuel);
        }
    }
    else if (next.wait) {
        m.log("WAITING");
        return;
    }
    else if (next.weird) {
        m.log("DIDN'T MOVE");
        return;
    }
    else {
        m.log("PILGRIM MOVING: " + next.res);
        let dx = next.res[0] - m.me.x; let dy = next.res[1] - m.me.y;
        return m.move(dx, dy);
    }
}
