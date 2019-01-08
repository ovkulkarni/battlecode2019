import { SPECS } from 'battlecode';
import { open_neighbors, idx } from './helpers.js';

// premade predicates
export function exact_pred(fx, fy) {
    return ((x, y) => fx === x && fy === y);
}
export function karbonite_pred(m) {
    return ((x, y) => idx(m.karbonite_map, x, y));
}
export function on_path(path) {
  let spath = path.map(a => a.toString());
  return ((x, y) => path.includes([x, y].toString()));
}

export class Pathfinder {
    constructor(m, goal) {
        this.m = m;
        this.loc = [m.me.x, m.me.y];
        this.goal = goal;
        this.speed = SPECS.UNITS[m.me.unit].SPEED;
        this.recalculate();
    }
    next_loc(m, wait=false) {
        let next = this.path[0];
        if(next === undefined) return undefined;
        if (idx(m.getVisibleRobotMap(), ...next) != 0) {
          // add ability to go around better
          if (wait)
            return undefined;
          else
            this.recalculate();
        }
        let result = this.path.shift();
        this.loc = result;
        return result;
    }
    recalculate(){
      this.path = this.find_path(this.goal);
    }
    find_path(pred) {
        let parent = new Map();
        let vis = new Set();
        let q = [this.loc];
        while (q.length != 0) {
            let cur = q.shift();
            vis.add(cur.toString());
            if (pred(...cur)) {
                let path = [cur];
                while (parent.has(cur)) {
                    cur = parent.get(cur);
                    path.push(cur);
                }
                return path.reverse();
            }
            for (let space of open_neighbors(this.m, ...cur)) {
                if (vis.has(space.toString())) continue;
                parent.set(space, cur);
                q.push(space);
            }
        }
    }
}
