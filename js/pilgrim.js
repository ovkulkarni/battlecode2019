import { SPECS } from 'battlecode';
import { Pathfinder } from './pathfinder.js';
import { karbonite_pred, around_pred, fuel_pred } from './predicates.js';
import { constants } from './constants.js';

export function runPilgrim(m) {
    m.log(`PILGRIM: (${m.me.x}, ${m.me.y})`);
    if (typeof m.pathfinder === "undefined") {
        if (m.fuel > constants.MIN_FUEL) {
            m.pathfinder = Math.random() < constants.FUEL_KARB_RATIO ? new Pathfinder(m, fuel_pred(m)) : new Pathfinder(m, karbonite_pred(m));
        } else {
            m.pathfinder = new Pathfinder(m, fuel_pred(m));
        }
        m.mission = constants.GATHER;
    }
    let next = m.pathfinder.next_loc(m);
    if (next.fin) {
        if (m.mission === constants.GATHER) {
            if (m.me.karbonite === m.stats.KARBONITE_CAPACITY || m.me.fuel === m.stats.FUEL_CAPACITY) {
                m.log("DROPPING OFF");
                m.mission = constants.DEPOSIT;
                m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 2));
                return;
            }
            else {
                m.log("MINING");
                if (m.fuel > SPECS.MINE_FUEL_COST)
                    return m.mine();
            }
        }
        else if (m.mission === constants.DEPOSIT) {
            let dx = m.spawn_castle.x - m.me.x;
            let dy = m.spawn_castle.y - m.me.y;
            m.mission = constants.GATHER;
            if (m.fuel > constants.MIN_FUEL) {
                m.pathfinder = Math.random() < constants.FUEL_KARB_RATIO ? new Pathfinder(m, fuel_pred(m)) : new Pathfinder(m, karbonite_pred(m));
            } else {
                m.pathfinder = new Pathfinder(m, fuel_pred(m));
            }
            return m.give(dx, dy, m.me.karbonite, m.me.fuel);
        }
    }
    else if (next.wait) {
        m.log("WAITING");
        return;
    }
    else if (next.fail) {
        m.log("FAILED TO MOVE");
        return;
    }
    else {
        m.log("PILGRIM MOVING: " + next.res);
        return m.move(...next.diff);
    }
}
