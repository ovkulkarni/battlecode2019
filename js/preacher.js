import { Pathfinder } from './pathfinder.js';
import { get_stats, calcOpposite, idx } from './helpers.js';
import { exact_pred } from "./predicates.js";

export function runPreacher(m) {
    m.log("PREACHER ID: " + m.me.id + "  X: " + m.me.x + "  Y: " + m.me.y);
    if (m.stats == undefined) {
        m.stats = get_stats(m);
    }
    if (typeof m.pathfinder === "undefined") {
        m.pathfinder = new Pathfinder(m, attack_pred(m, m.spawn_castle.x, m.spawn_castle.y));
    }
    let next = m.pathfinder.next_loc(m);
<<<<<<< HEAD
    if (next.fin) {
        m.log("FUEL " + m.fuel + " " + m.stats.get("fc"));
        if (shouldAttack(m) && (m.fuel >= m.stats.get("fc"))) {
=======
    if (next === undefined) {
        m.log("FUEL " + m.fuel + " " + m.stats.FUEL_CAPACITY);
        if (shouldAttack(m) && (m.fuel >= m.stats.FUEL_CAPACITY)) {
>>>>>>> 6ad2b0da0ace72f15a58f686a95737bfd805678a
            m.log("PREACHER ATTACKED");
            return m.attack(1, 0);
        }
        return;
    }
    else if (next.wait || next.fail) {
        m.log("PREACHER STUCK");
        return;
    }
    else {
<<<<<<< HEAD
        m.log("PREACHER MOVING: " + next);
        //let dx = next[0] - m.me.x; let dy = next[1] - m.me.y;
        return m.move(...next.diff);
=======
        m.log("PREACHER MOVING: " + next.res);
        let dx = next.res[0] - m.me.x; let dy = next.res[1] - m.me.y;
        return m.move(dx, dy);
>>>>>>> 6ad2b0da0ace72f15a58f686a95737bfd805678a
    }
}

export function shouldAttack(m) {

    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i != 0 || j != 0) {
                let id = idx(m.getVisibleRobotMap(), m.me.x + i+1, m.me.y + j);
                m.log("ROBOT ID " + id);
                if (id != 0 && id != -1) {
                    m.log("TEAM " + m.getRobot(id).team);
                    //if (m.getRobot(id).team === m.team) {
                        return true;
                    //}
                }
            }
        }
    }
    return false;
}
