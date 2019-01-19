import { SPECS } from 'battlecode';
import { constants } from './constants.js';
import { idx, dis, passable_loc, valid_loc, calcOpposite, create_augmented_obj, visible_ally_attackers, slow_down } from './helpers.js';
import { Pathfinder } from './pathfinder.js';
import { around_pred, attack_pred } from './predicates.js';

export function get_symmetry(m) {
    const N = m.karbonite_map.length;
    const M = m.karbonite_map[0].length;
    let horizontal = true;
    if (m.symmetry === undefined) {
        for (let i = 0, k = N - 1; i < N / 2; i++ , k--) {
            for (let j = 0; j < M; j++) {
                if (m.karbonite_map[i][j] !== m.karbonite_map[k][j]) {
                    horizontal = false;
                    break;
                }
            }
        }
        if (horizontal) {
            return constants.HORIZONTAL;
        }
        else {
            return constants.VERTICAL;
        }
    }
}

export function on_ally_side(m, xx, yy, x, y) {
    let sym = get_symmetry(m);
    let half = Math.floor(m.karbonite_map.length/2);
    if(sym === constants.HORIZONTAL) {
        // x stays same
        return !(y < half)^(m.me.y < half);
    }
    else {
        // y stays same
        return !(x < half)^(m.me.x < half);
    }
}

export function best_fuel_locs(m) {
    let pilgrim = SPECS.UNITS[SPECS.PILGRIM];
    let max_dist = pilgrim.FUEL_CAPACITY / (2 * pilgrim.FUEL_PER_MOVE);
    const adjs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    let fuel_locs = [];
    let init = [m.me.x, m.me.y];
    let vis = new Set([init.toString()]);
    let stk = [init];
    while (stk.length > 0) {
        let loc = stk.pop();
        if (idx(m.fuel_map, ...loc))
            fuel_locs.push(loc);
        for (let adj of adjs.map(s => [s[0] + loc[0], s[1] + loc[1]])) {
            if (vis.has(adj.toString()) || dis(...adj, ...init) >= max_dist || !passable_loc(m, ...adj))
                continue;
            vis.add(adj.toString());
            stk.push(adj);
        }
    }
    return fuel_locs.sort((a, b) => dis(...a, ...init) - dis(...b, ...init));
}

export function best_karb_locs(m) {
    let pilgrim = SPECS.UNITS[SPECS.PILGRIM];
    let max_dist = 3 * pilgrim.KARBONITE_CAPACITY / (2 * pilgrim.FUEL_PER_MOVE);
    const adjs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    let karbonite_locs = [];
    let init = [m.me.x, m.me.y];
    let vis = new Set([init.toString()]);
    let stk = [init];
    while (stk.length > 0) {
        let loc = stk.pop();
        if (idx(m.karbonite_map, ...loc))
            karbonite_locs.push(loc);
        for (let adj of adjs.map(s => [s[0] + loc[0], s[1] + loc[1]])) {
            if (vis.has(adj.toString()) || dis(...adj, ...init) >= max_dist || !passable_loc(m, ...adj))
                continue;
            vis.add(adj.toString());
            stk.push(adj);
        }
    }
    return karbonite_locs.sort((a, b) => dis(...a, ...init) - dis(...b, ...init));
}

export function get_visible_base(m) {
    for (let robot of m.visible_robots) {
        if (robot.unit === SPECS.CASTLE || robot.unit === SPECS.CHURCH)
            return robot;
    }
}

export function find_optimal_churches(m) {
    /*
    Set karbLocs = new Set();
    for(let i = 0; i < m.karbonite_map.length; i++) {
        for(let j = 0; j < m.karbonite_map.length; j++) {
            if(idx(m.karbonite_map, i, j)) {
                karbLocs.add(i + " " + j);
            }
        }
    }
    let MAX_DIS = 200;
    var finLoc = [];
    while(karbLocs.size !== 0) {
        var compLoc = [];
        compLoc.push(karbLocs[0]);
        for(let i = 0; i < karbLocs.length; i++) {
            var tempLoc = karbLocs[i];
            let flag = false;
            for(let j = 0; j < compLoc.length; j++) {
                if(dis(tempLoc[0], tempLoc[1], compLoc[j][0], compLoc[j][1]) < MAX_DIS) {
                    flag = true;
                    break;
                }
            }
            if(flag) {
                compLoc.push(tempLoc);
                karbLocs.splice(i,1);
                i--; // SHIFT BACK INDEX
            }
        }
    }
    var answer = [];
    for(let i = 0; i < finLoc.length; i++) {
        answer.push(finLoc[i][0]);
    }
    return answer.sort((a, b) => dis(...a, m.me.x, m.me.y) - dis(...b, m.me.x, m.me.y));
    */
    let width = m.karbonite_map.length;
    let squareLen = Math.floor(width/8);
    //m.log("SQUARE LENGTH: " + squareLen);
    let numSquares = Math.ceil(width/squareLen);
    //m.log("NUM SQUARES: " + numSquares);
    var matrix = []; // Marix of the  fuel/karb locations in each square
    for(let i = 0; i < numSquares; i++) {
        matrix.push([]);
        for(let j = 0; j < numSquares; j++) {
            matrix[i].push([]);
        }
    }
    let goodRegions = [];
    for(let i = 0; i < m.karbonite_map.length; i++) {
        for(let j = 0; j < m.karbonite_map.length; j++) {
            if(idx(m.karbonite_map, i, j) || idx(m.fuel_map, i, j)) {
                let numCol = Math.floor(i/squareLen);
                let numRow = Math.floor(j/squareLen);
                //m.log("KARB/FUEL FOUND IN SQUARE: " + numCol + " " + numRow);
                matrix[numCol][numRow].push([i,j]);
                //m.log("LENGTH OF SQUARE: " + matrix[numCol][numRow].length);
                if(matrix[numCol][numRow].length === 2) {
                    goodRegions.push([numCol,numRow]);
                    //m.log("PUSHED REGION: " + numCol + " " + numRow);
                }
            }
        }
    }
    var answer = [];
    var friendlies = m.friendly_castles;
    for(let i = 0; i < goodRegions.length; i++) {
        var r = goodRegions[i][0];
        var c = goodRegions[i][1];
        let flag = true; // Determines if it is far enough from the castle
        let flag2 = false; // Is some of this on our side?
        for(let j = 0; j < matrix[r][c].length; j++) {
            for(let a_id in m.friendly_castles) {
                if(dis(...matrix[r][c][j], m.friendly_castles[a_id].x, m.friendly_castles[a_id].y) <= 50) {
                    flag = false;
                    break;
                }
                if(on_ally_side(m, m.friendly_castles[a_id].x, m.friendly_castles[a_id].y, ...matrix[r][c][j])) {
                    flag2 = true;
                }
            }
            if(flag === false) break;
        }
        if(flag && flag2) answer.push(matrix[r][c]);
    }
    answer = answer.sort((a, b) => dis(...a[0], m.me.x, m.me.y) - dis(...b[0], m.me.x, m.me.y));
    m.log("PRINTING THE CHURCH LOCATIONS")
    for(let i = 0; i < answer.length; i++) {
        m.log((i+1) + ": " + answer[i]);
    }
    m.log("FINISHED PRINTING CHURCH LOCATIONS");
    return answer;

}

export function wander(m) {
    if (m.split_regions === undefined) {
        m.split_regions = get_region_locs(m);
    }
    if (m.curr_index === undefined) {
        let min_dist = 64 * 64;
        m.curr_index = 0;
        for (let i in m.split_regions) {
            let dist = dis(...m.split_regions[i], m.me.x, m.me.y);
            if (dist < min_dist) {
                m.curr_index = i;
                min_dist = dist;
            }
        }
    } else {
        m.curr_index++;
        m.curr_index %= m.split_regions.length;
    }
    m.pathfinder = new Pathfinder(m, around_pred(...m.split_regions[m.curr_index], 1, Math.floor(constants.HORDE_SIZE ** 0.5)));
}


export function get_region_locs(m) {
    let r = constants.HORDE_SIZE ** 2;
    let regions = [];
    for (let i = Math.floor(r ** 0.5); i < m.karbonite_map.length; i += r) {
        for (let j = ((i / r) % 2 === 0) ? Math.floor(r ** 0.5) : m.karbonite_map[0].length - Math.floor(r ** 0.5); ((i / r) % 2 === 0) ? j < m.karbonite_map[0].length : j > -1; j += ((i / r) % 2 === 0) ? r : -1 * r) {
            regions.push(m.symmetry === constants.VERTICAL ? [i, j] : [j, i]);
        }
    }
    return regions.filter(valid_loc(m));
}

export function horde(m) {
    let castle_dist = dis(m.spawn_castle.x, m.spawn_castle.y, m.me.x, m.me.y);
    let in_horde = check_horde(m) || m.joined_horde;
    if (!in_horde && castle_dist <= 10)
        return false;
    else if (in_horde && (castle_dist <= 10 || m.mission === constants.HORDE_INTERMEDIATE)) {
        m.log("IN HORDE");
        m.joined_horde = true;
        if (m.intermediate_point === undefined) {
            m.mission = constants.HORDE_INTERMEDIATE;
            let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
            let pf = new Pathfinder(create_augmented_obj(m, m.spawn_castle.x, m.spawn_castle.y), attack_pred(m, ...opp));
            m.intermediate_point = pf.path[Math.floor(pf.path.length / 2)];
            return false;
        }
        else {
            m.pathfinder = new Pathfinder(m, around_pred(...m.intermediate_point, 1, 2));
        }
    }
}
