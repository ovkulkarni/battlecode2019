import { SPECS } from 'battlecode';
import { constants } from './constants.js';
import { idx, dis, valid_loc, passable_loc } from './helpers.js';

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
            return constants.HORIZONTAL
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
    let vis = new Set(init.toString());
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

export function get_visible_castle(m) {
    for (let robot of m.visible_robots) {
        if (robot.unit === SPECS.CASTLE)
            return robot;
    }
}

export function find_optimal_churches(m) {

}