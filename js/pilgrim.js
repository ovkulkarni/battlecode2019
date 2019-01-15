import { SPECS } from 'battlecode';
import { Pathfinder } from './pathfinder.js';
import { karbonite_pred, around_pred, fuel_pred, karbonite_pred_church, fuel_pred_church } from './predicates.js';
import { constants } from './constants.js';
import { unit_cost } from './castle.js';
import { encode8, decode8 } from './communication.js';
import { open_neighbors2, idx, dis } from './helpers.js';

export function runPilgrim(m) {
    m.log(`PILGRIM: (${m.me.x}, ${m.me.y})`);
    m.log("INITIAL MISSION: " + m.mission);
    if (m.me.turn === 1) {
        m.log("INITIAL MISSION: " + m.mission);
        switch (m.mission) {
            case constants.GATHER:
                if (m.fuel < constants.MIN_FUEL) {
                    m.mission = constants.GATHER_FUEL;
                    m.pathfinder = new Pathfinder(m, fuel_pred(m));
                }
                else if (m.karbonite < constants.MIN_KARB) {
                    m.mission = constants.GATHER_KARB;
                    m.pathfinder = new Pathfinder(m, fuel_pred(m));
                }
                else {
                    if (Math.random() < constants.FUEL_KARB_RATIO) {
                        m.pathfinder = new Pathfinder(m, fuel_pred(m));
                        m.mission = constants.GATHER_FUEL;
                    }
                    else {
                        m.pathfinder = new Pathfinder(m, karbonite_pred(m));
                        m.mission = constants.GATHER_KARB;
                    }
                }
                break;
            case constants.DEPOSIT:
                m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 2));
                m.pathfinder.final_loc = [m.spawn_castle.x, m.spawn_castle.y];
                break;
            case constants.GATHER_KARB:
                m.pathfinder = new Pathfinder(m, karbonite_pred(m));
                break;
            case constants.CHURCH_KARB:
                m.pathfinder = new Pathfinder(m, karbonite_pred_church(m, m.me.x, m.me.y));
                break;
            case constants.GATHER_FUEL:
                m.pathfinder = new Pathfinder(m, fuel_pred(m));
                break;
            case constants.CHURCH_FUEL:
                m.pathfinder = new Pathfinder(m, fuel_pred_church(m, m.me.x, m.me.y));
                break;
            default:
                m.log("ERROR SHOULDNT HAPPEN");
        }
    }
    if (m.mission === constants.GATHER) {
        if (m.fuel > constants.MIN_FUEL) {
            if (Math.random() < constants.FUEL_KARB_RATIO) {
                m.pathfinder = new Pathfinder(m, fuel_pred(m));
                m.mission = constants.GATHER_FUEL;
            }
            else {
                m.pathfinder = new Pathfinder(m, karbonite_pred(m));
                m.mission = constants.GATHER_KARB;
            }
        } else {
            m.mission = constants.GATHER_FUEL;
            m.pathfinder = new Pathfinder(m, fuel_pred(m));
        }
    }
    let next = m.pathfinder.next_loc(m);
    if (next.fin) {
        if ((m.mission === constants.GATHER_KARB) || (m.mission === constants.GATHER_FUEL) || (m.mission === constants.CHURCH_KARB) || (m.mission === constants.CHURCH_FUEL)) {
            if (m.me.karbonite === m.stats.KARBONITE_CAPACITY || m.me.fuel === m.stats.FUEL_CAPACITY) {
                if (m.mission === constants.CHURCH_KARB || m.mission === constants.CHURCH_FUEL) {
                    if (m.church === undefined) {
                        let dir = open_neighbors2(m, m.me.x, m.me.y);
                        if (dir.length === 0) {
                            m.log("CANNOT BUILD CHURCH ANYWHERE, GOING BACK TO DROP OFF");
                            m.mission = (m.mission === constants.CHURCH_KARB) ? constants.GATHER_KARB : constants.GATHER_FUEL;
                            m.mission = constants.DEPOSIT;
                            m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 2));
                            m.pathfinder.final_loc = [m.spawn_castle.x, m.spawn_castle.y];
                            return;
                        }
                        let dr = dir[0];
                        m.church = [dr[0] - m.me.x, dr[1] - m.me.y];
                        if (m.karbonite >= unit_cost(SPECS.CHURCH)[0] && m.fuel >= unit_cost(SPECS.CHURCH)[1]) {
                            m.log("BUILDING CHURCH: " + dr);
                            return m.buildUnit(SPECS.CHURCH, ...m.church);
                        }
                        m.church = undefined;
                        m.log("NOT ENOUGH RESOURCES");
                        // Tell Castle to Send more Harvesters if Feasable
                        return;
                    }
                    m.log("DEPOSITING RESOURCES IN LOCAL CHURCH" + m.church);
                    return m.give(...m.church, m.me.karbonite, m.me.fuel);
                }
                else {
                    m.log("GOING BACK");
                    m.mission = constants.DEPOSIT;
                    let foundDrop = false;
                    let minr = 10000000;
                    for (let i = 0; i < m.visible_allies.length; i++) {
                        let ally = m.visible_allies[i];
                        if (ally.unit <= 1) {
                            foundDrop = true;
                            if (dis(ally.x, ally.y, m.me.x, m.me.y) < minr) {
                                minr = dis(ally.x, ally.y, m.me.x, m.me.y);
                                m.log("FOUND CLOSER DROPOFF");
                                m.pathfinder = new Pathfinder(m, around_pred(ally.x, ally.y, 1, 2));
                                m.pathfinder.final_loc = [ally.x, ally.y];
                            }
                        }
                    }
                    if (!foundDrop) {
                        m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 2));
                        m.pathfinder.final_loc = [m.spawn_castle.x, m.spawn_castle.y];
                    }
                }
            }
            else if (m.mission === constants.DEPOSIT) {
                m.log("DEPOSITING RESOURCES IN CASTLE");
                m.mission === constants.GATHER;
                return m.give(m.spawn_castle.x - m.me.x, m.spawn_castle.y - m.me.y, m.me.karbonite, m.me.fuel);
            }
            else {
                m.log("MINING");
                m.log("CHECKING FOR ENEMIES");
                let robArr = m.getVisibleRobots();
                for (let i = 0; i < robArr.length; i++) {
                    let tempRob = robArr[i];
                    if (tempRob.team != m.me.team) {
                        m.log("FOUND ENEMY");
                        // Tell the Castle you hit an enemy so they can defend.
                        // Altenratively tell remaining
                    }
                }
                if (m.fuel > SPECS.MINE_FUEL_COST)
                    return m.mine();

            }
        }
        else if (m.mission === constants.DEPOSIT) {
            let dx = m.pathfinder.final_loc[0] - m.me.x;
            let dy = m.pathfinder.final_loc[1] - m.me.y;

            m.mission = constants.GATHER;
            if (m.fuel > constants.MIN_FUEL) {
                m.pathfinder = Math.random() < constants.FUEL_KARB_RATIO ? new Pathfinder(m, fuel_pred(m)) : new Pathfinder(m, karbonite_pred(m));
            } else {
                m.pathfinder = new Pathfinder(m, fuel_pred(m));
            }
            m.log("GIVING IN DIRECTION: " + dx + " " + dy);
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
