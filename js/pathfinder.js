import { SPECS } from 'battlecode';
import { open_neighbors, idx } from './helpers.js';

// premade predicates
export function exact_pred(fx, fy) {
    return ((x, y) => fx === x && fy === y);
}
export function karbonite_pred(m) {
    return ((x, y) => idx(m.karbonite_map, x, y));
}

export class Pathfinder {
    constructor(m, pred) {
        this.m = m;
        this.loc = [m.me.x, m.me.y];
        this.pred = pred;
        this.speed = SPECS.UNITS[m.me.unit].SPEED;
        this.path = this.find_path();
    }
    next_loc(m) {
        this.path.shift();
        return this.path[0];
    }
    find_path() {
        let parent = new Map();
        let vis = new Set();
        let q = [this.loc];
        while (q.length != 0) {
            let cur = q.shift();
            vis.add(cur);
            if (this.pred(...cur)) {
                let path = [cur];
                while (parent.has(cur)) {
                    cur = parent.get(cur);
                    path.push(cur);
                }
                return path.reverse();
            }
            for (let space of open_neighbors(this.m, ...cur)) {
                if (vis.has(space)) continue;
                parent.set(space, cur);
                q.push(space);
            }
        }
    }
}