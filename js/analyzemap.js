import { SPECS } from 'battlecode';
import { constants } from './constants.js';
import { idx, dis, passable_loc, valid_loc } from './helpers.js';
import { Pathfinder } from './pathfinder.js';
import { around_pred } from './predicates.js';

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
        if (horizontal)
            return constants.HORIZONTAL;
        else
            return constants.VERTICAL;
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
    let max_dist = pilgrim.KARBONITE_CAPACITY / (2 * pilgrim.FUEL_PER_MOVE);
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

export function get_visible_castle(m) {
    for (let robot of m.visible_robots) {
        if (robot.unit === SPECS.CASTLE)
            return robot;
    }
}

export function find_optimal_churches(m) {

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

export function check_horde(m) {
    let count = 1;
    for (let r of m.visible_allies) {
        if (constants.ATTACKING_TROOPS.has(r.unit))
            count++;
    }
    return count >= constants.HORDE_SIZE;
}
