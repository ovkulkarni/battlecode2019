import { SPECS } from 'battlecode';
import { Pathfinder } from './pathfinder.js';
import { karbonite_pred, around_pred, fuel_pred, exact_pred, every_pred } from './predicates.js';
import { constants } from './constants.js';
import { unit_cost } from './castle.js';
//import { get_symmetry } from './analyzemap.js';
import { encode8, decode8 } from './communication.js';
import { open_neighbors2, idx, dis } from './helpers.js';

export function runPilgrim(m) {
    //m.log(`PILGRIM: (${m.me.x}, ${m.me.y})`);
    //m.log("INITIAL MISSION: " + m.mission);
    if (m.diffused) {
        m.diffused = false;
        if (m.pathfinder === undefined)
            m.pathfinder.recalculate(m);
    }
    if (m.me.turn === 1) {
        get_start_pathfinder(m);
    }
    if (m.mission === constants.GATHER) {
        get_pathfinder(m);
    }
    if (m.pathfinder === undefined) {
        m.log("PATHFINDER DOESNT EXIST");
        m.log("MISSION: " + m.mission);
        get_pathfinder(m);
    }
    //m.log("PATHFINDER: " + JSON.stringify(m.pathfinder));
    let next = m.pathfinder.next_loc(m);
    //m.log("NEXT MOVE: " + JSON.stringify(next));
    if (next.fin) {
        if ((m.mission === constants.GATHER_KARB) || (m.mission === constants.GATHER_FUEL) || (m.mission === constants.CHURCH) || (m.mission === constants.GATHER)) {
            if (m.me.karbonite === m.stats.KARBONITE_CAPACITY || m.me.fuel === m.stats.FUEL_CAPACITY) {
                if (m.mission === constants.CHURCH) {
                    if (m.church_loc === undefined) {
                        return build_church(m);
                    }
                    // m.log(m.church_loc);
                    if (idx(m.visible_map, ...m.church_loc) === 0) {
                        return build_church(m);
                    }
                    return m.give(...m.diff_church_loc, m.me.karbonite, m.me.fuel);
                }
                else {
                    m.mission = constants.DEPOSIT;
                    get_pathfinder(m);
                    let nextt = m.pathfinder.next_loc(m);
                    if (nextt.fin) {
                        //m.log("HERE");
                        m.mission === constants.GATHER;
                        //m.log("GIVING TO: " + m.pathfinder.final_loc);
                        return m.give(m.pathfinder.final_loc[0] - m.me.x, m.pathfinder.final_loc[1] - m.me.y, m.me.karbonite, m.me.fuel);
                    }
                    else if (nextt.fail) {
                        // m.log("PILGRIM CANNOT MOVE BACK");
                        m.pathfinder.recalculate(m);
                        return true;
                    }
                    else if (nextt.wait) {
                        // m.log("PILGRIM WAITING TO MOVE");
                        return true;
                    }
                    else {
                        // m.log("MOVING: " + next.diff);
                        return m.move(...nextt.diff);
                    }
                }
            }
            else if (m.mission === constants.DEPOSIT) {
                //m.log("DEPOSITING RESOURCES IN CASTLE");
                m.mission = constants.GATHER;
                if (m.initial_mission === constants.GATHER_FUEL || m.initial_mission === constants.GATHER_KARB)
                    m.initial_mission = m.initial_mission;
                else
                    m.mission = constants.GATHER;
                return m.give(m.spawn_castle.x - m.me.x, m.spawn_castle.y - m.me.y, m.me.karbonite, m.me.fuel);
            }
            else {
                //m.log("MINING");
                //m.log("CHECKING FOR ENEMIES");
                let robArr = m.getVisibleRobots();
                for (let i = 0; i < robArr.length; i++) {
                    let tempRob = robArr[i];
                    if (tempRob.team != m.me.team) {
                        //m.log("FOUND ENEMY");
                        // Tell the Castle you hit an enemy so they can defend.
                        // Altenratively tell remaining
                    }
                }
                if (m.fuel > SPECS.MINE_FUEL_COST) {
                    if (idx(m.fuel_map, m.me.x, m.me.y) || idx(m.karbonite_map, m.me.x, m.me.y))
                        return m.mine();
                    else {
                        m.pathfinder.recalculate(m);
                    }
                }

            }
        }
        else if (m.mission === constants.DEPOSIT) {
            //m.log("GIVING TO: " + m.pathfinder.final_loc);
            let dx = m.pathfinder.final_loc[0] - m.me.x;
            let dy = m.pathfinder.final_loc[1] - m.me.y;

            m.mission = constants.GATHER;
            get_pathfinder(m);
            //m.log("GIVING IN DIRECTION: " + dx + " " + dy);
            if (idx(m.visible_map, m.me.x + dx, m.me.y + dy) === 0) {
                m.log("CASTLE DIED: BUILDING CHURCH");
                return m.buildUnit(SPECS.CHURCH, dx, dy);
            }
            return m.give(dx, dy, m.me.karbonite, m.me.fuel);
        }
    }
    else if (next.wait) {
        // m.log("WAITING");
        return;
    }
    else if (next.fail) {
        // m.log("FAILED TO MOVE");
        m.pathfinder.recalculate(m);
        return;
    }
    else {
        //m.log("PILGRIM MOVING: " + next.res);
        return m.move(...next.diff);
    }
}

export function get_start_pathfinder(m) {
    switch (m.mission) {
        case constants.GATHER:
            m.pathfinder = new Pathfinder(m, every_pred(m));
            m.mission = constants.GATHER;
            break;
        case constants.DEPOSIT:
            m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 2));
            m.pathfinder.final_loc = [m.spawn_castle.x, m.spawn_castle.y];
            break;
        case constants.GATHER_KARB:
            m.pathfinder = new Pathfinder(m, karbonite_pred(m));
            //m.pathfinder = new Pathfinder(m, every_pred(m));
            m.initial_mission = m.mission;
            break;
        case constants.CHURCH:
            m.castleTalk(encode8("watch_me"));
            //m.log("CHURCH PILGRIM   CHURCH: " + m.church);
            m.pathfinder = new Pathfinder(m, exact_pred(...m.church));
            break;
        case constants.GATHER_FUEL:
            m.pathfinder = new Pathfinder(m, fuel_pred(m));
            //m.pathfinder = new Pathfinder(m, every_pred(m));
            m.initial_mission = m.mission;
            break;
        default:
            m.log("ERROR SHOULDNT HAPPEN");
    }
}

export function get_pathfinder(m) {
    switch (m.mission) {
        case constants.GATHER:
            m.pathfinder = new Pathfinder(m, every_pred(m));
            m.mission = constants.GATHER;
            break;
        case constants.DEPOSIT:
            m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 2));
            m.pathfinder.final_loc = [m.spawn_castle.x, m.spawn_castle.y];
            break;
        case constants.GATHER_KARB:
            m.pathfinder = new Pathfinder(m, karbonite_pred(m));
            //m.pathfinder = new Pathfinder(m, every_pred(m));
            m.initial_mission = m.mission;
            break;
        case constants.CHURCH:
            m.castleTalk(encode8("watch_me"));
            //m.log("CHURCH PILGRIM   CHURCH: " + m.church);
            m.pathfinder = new Pathfinder(m, exact_pred(...m.church));
            break;
        case constants.GATHER_FUEL:
            m.pathfinder = new Pathfinder(m, fuel_pred(m));
            //m.pathfinder = new Pathfinder(m, every_pred(m));
            m.initial_mission = m.mission;
            break;
        default:
            m.log("ERROR SHOULDNT HAPPEN");
    }
}

export function build_church(m) {
    let dir = open_neighbors2(m, m.me.x, m.me.y);
    if (dir.length === 0) {
        m.mission = constants.DEPOSIT;
        get_pathfinder(m);
        return;
    }
    let dr = dir[0];
    for (let i = 0; i < dir.length; i++) {
        // m.log("CHOICE: " + dir[i]);
        if (idx(m.karbonite_map, ...dir[i]) || idx(m.fuel_map, ...dir[i])) continue;
        dr = dir[i];
        break;
    }
    m.church_loc = dr;
    m.diff_church_loc = [dr[0] - m.me.x, dr[1] - m.me.y];
    if (m.karbonite >= unit_cost(SPECS.CHURCH)[0] && m.fuel >= unit_cost(SPECS.CHURCH)[1]) {
        return m.buildUnit(SPECS.CHURCH, ...m.diff_church_loc);
    }
    m.church_loc = undefined;
    return;
}
