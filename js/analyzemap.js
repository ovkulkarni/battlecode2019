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
    let sym = m.symmetry;
    let half = Math.floor(m.karbonite_map.length / 2);
    if (sym === constants.HORIZONTAL) {
        // x stays same
        return !(y < half) ^ (m.me.y < half);
    }
    else {
        // y stays same
        return !(x < half) ^ (m.me.x < half);
    }
}

export function best_fuel_locs(m) {
    let pilgrim = SPECS.UNITS[SPECS.PILGRIM];
    let max_dist =  50; // pilgrim.FUEL_CAPACITY / (2 * pilgrim.FUEL_PER_MOVE * pilgrim.SPEED);
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
    let max_dist = 50; //3 * pilgrim.KARBONITE_CAPACITY / (2 * pilgrim.FUEL_PER_MOVE * pilgrim.SPEED);
    // m.log("MAX DIST: " + max_dist);
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
    let width = m.karbonite_map.length;
    let squareLen = Math.floor(width / 8);
    //m.log("SQUARE LENGTH: " + squareLen);
    let numSquares = Math.ceil(width / squareLen);
    //m.log("NUM SQUARES: " + numSquares);
    let matrix = []; // Marix of the  fuel/karb locations in each square
    for (let i = 0; i < numSquares; i++) {
        matrix.push([]);
        for (let j = 0; j < numSquares; j++) {
            matrix[i].push([]);
        }
    }
    let goodRegions = [];
    for (let i = 0; i < m.karbonite_map.length; i++) {
        for (let j = 0; j < m.karbonite_map.length; j++) {
            if (idx(m.karbonite_map, i, j) || idx(m.fuel_map, i, j)) {
                let numCol = Math.floor(i / squareLen);
                let numRow = Math.floor(j / squareLen);
                //m.log("KARB/FUEL FOUND IN SQUARE: " + numCol + " " + numRow);
                matrix[numCol][numRow].push([i, j]);
                //m.log("LENGTH OF SQUARE: " + matrix[numCol][numRow].length);
                if (matrix[numCol][numRow].length === 1) {
                    goodRegions.push([numCol, numRow]);
                    //m.log("PUSHED REGION: " + numCol + " " + numRow);
                }
            }
        }
    }
    let answer = [];
    let friendlies = m.friendly_castles;
    for (let i = 0; i < goodRegions.length; i++) {
        let r = goodRegions[i][0];
        let c = goodRegions[i][1];
        let merge = false;
        for (let a of answer) {
            if (dis(...a[0], ...matrix[r][c][0]) <= 50) {
                //m.log(`MERGE ${a[0]} ${matrix[r][c][0]}`);
                merge = true;
                a.push(...matrix[r][c]);
                break;
            }
        }
        if (!merge)
            answer.push(matrix[r][c]);
    }
    /*
    m.log("PRINTING THE CHURCH LOCATIONS");
    for (let i = 0; i < answer.length; i++) {
        m.log((i + 1) + ": " + answer[i]);
    }
    m.log("FINISHED PRINTING CHURCH LOCATIONS");
    */
    let patches = [];
    for (let a of answer.filter(a => a.length > 1)) {
        let cx = 0;
        let cy = 0;
        let size = a.length;
        for (let loc of a) {
            cx += loc[0];
            cy += loc[1];
        }
        cx = Math.floor(cx / size);
        cy = Math.floor(cy / size);
        patches.push({ x: cx, y: cy, size: size });
    }
    //m.log(patches);
    return patches;

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

export function front_back_ratio(m) {
    if (!m.started || m.on_intermediate || m.horde_loc === undefined || m.mission !== constants.HORDE) {
        return -1;
    }
    let count_front = 1;
    let count_back = 1;
    for (let r of visible_ally_attackers(m))
        if (dis(r.x, r.y, m.horde_loc.x, m.horde_loc.y) < dis(m.me.x, m.me.y, m.horde_loc.x, m.horde_loc.y)) {
            count_front++;
        }
        else {
            count_back++;
        }
    return count_front / count_back;
}


export function compact_horde(m, next) {
    let fbr = front_back_ratio(m);
    if (0 <= fbr && fbr < 1) {
        next.diff = slow_down(m, next.diff);
        next.res = [m.me.x + next.diff[0], m.me.y + next.diff[1]];
    }
}

export function optimal_attack_diff(m) {
    if (m.visible_enemies.length === 0) return;
    switch (m.unit) {
        case SPECS.PREACHER:
            let castles = m.visible_enemies.filter(r => r.unit === SPECS.CASTLE);
            if (castles.length > 0 && m.stats.ATTACK_RADIUS[0] <= castles[0].dist && castles[0].dist <= m.stats.ATTACK_RADIUS[1]) {
                return [castles[0].x - m.me.x, castles[0].y - m.me.y];
            }
            let max_diff = 0;
            let optimal;
            for (let x = m.me.x - m.stats.ATTACK_RADIUS[1]; x < m.me.x + m.stats.ATTACK_RADIUS[1]; x++) {
                for (let y = m.me.y - m.stats.ATTACK_RADIUS[1]; y < m.me.y + m.stats.ATTACK_RADIUS[1]; y++) {
                    let d = dis(x, y, m.me.x, m.me.y);
                    let diff = 0;
                    if (m.stats.ATTACK_RADIUS[0] > d || m.stats.ATTACK_RADIUS[1] < d)
                        continue;
                    for (let i = -1; i <= 1; i++) {
                        for (let j = -1; j <= 1; j++) {
                            if (passable_loc(m, x + i, y + j)) {
                                let id = idx(m.visible_map, x + i, y + j);
                                if (id > 0) {
                                    if (m.getRobot(id).team === m.me.team) {
                                        diff--;
                                    }
                                    else {
                                        diff++
                                    }
                                }
                            }
                        }
                    }
                    if (diff > max_diff) {
                        max_diff = diff;
                        optimal = { x: x, y: y }
                    }
                }
            }
            return [optimal.x - m.me.x, optimal.y - m.me.y];
        default:
            let castles_in_vision = m.visible_enemies.filter(r => r.unit === SPECS.CASTLE);
            if (castles_in_vision.length > 0 && m.stats.ATTACK_RADIUS[0] <= castles_in_vision[0].dist && castles_in_vision[0].dist <= m.stats.ATTACK_RADIUS[1]) {
                return [castles_in_vision[0].x - m.me.x, castles_in_vision[0].y - m.me.y];
            }
            let closest = m.visible_enemies.concat().sort((r1, r2) => r1.dist - r2.dist)[0];
            if (m.stats.ATTACK_RADIUS[0] <= closest.dist && closest.dist <= m.stats.ATTACK_RADIUS[1])
                return [closest.x - m.me.x, closest.y - m.me.y];
    }
}
