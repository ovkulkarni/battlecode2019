import { SPECS } from 'battlecode';
import { open_neighbors, idx } from './helpers.js';

// premade predicates
export function exact_pred(fx, fy) {
    return ((x, y) => fx === x && fy === y);
}
export function around_pred(fx, fy, l, r) {
    return ((x, y) => (x-fx)*(x-fx) + (y-fy)*(y-fy) >= l && (x-fx)*(x-fx) + (y-fy)*(y-fy) <= r);
}
export function attack_pred(m, fx, fy){
    return around_pred(fx, fy, 1, m.stats.ar);
}
export function karbonite_pred(m) {
    return ((x, y) => idx(m.karbonite_map, x, y));
}
export function on_path(path) {
    let spath = path.map(a => a.toString());
    return ((x, y) => path.includes([x, y].toString()));
}

export class Pathfinder {
    constructor(m, goal, type) {
        /*
            PathFinder Types
            WORKER
            0 - Mining Path
            1 - Deposit Path
            2 - Church Path
        */
        this.m = m;
        this.type = type;
        this.loc = [m.me.x, m.me.y];
        this.goal = goal;
        this.speed = SPECS.UNITS[m.me.unit].SPEED;
        this.recalculate();
    }
    next_loc(m, wait = false) {
        if(m.me.x === this.fin[0] && m.me.y === this.fin[1]) return undefined;
        m.log("FINDING NEXT " + this.path);
        let next = this.path[0];
        if (next === undefined) return undefined;
        let occupied = idx(m.visible_map, ...next);
        if (occupied !== 0 && occupied !== -1) {
            // add ability to go around better
            if (wait) {
                m.log("WAITING");
                return undefined;
            }
            else {
                m.log("RECALCULATING");
                this.recalculate();
                m.log("RECALCULATING DONE");
            }
        }
        let result = this.path.shift();
        if (result[0] === this.loc[0] && result[1] === this.loc[1]) {
            result = this.path.shift();
        }
        this.loc = result
        m.log("NEXT MOVE: " + result);
        return result;
    }
    recalculate() {
        this.path = this.find_path(this.goal);
    }
    find_path(pred) {
        let parent = new Map();
        let vis = new Set();
        let q = new LinkedList();
        q.addToHead(this.loc);
        //let q = [this.loc];
        while (q.len !== 0) {
            //let cur = q.shift();
            let cur = q.head.value;
            q.removeHead();
            if (pred(...cur)) {
                let path = [cur];
                this.fin = cur;
                while (parent.has(cur)) {
                    cur = parent.get(cur);
                    path.push(cur);
                }
                this.m.log("FOUND:" + path);
                return path.reverse();
            }
            for (let space of open_neighbors(this.m, ...cur)) {
                if (vis.has(space.toString())) continue;
                parent.set(space, cur);
                vis.add(space.toString());
                //q.push(space);
                q.addToTail(space);
            }
        }
    }
}

function LinkedList() {
    this.head = null;
    this.tail = null;
    this.len = 0;
}

function Node(value, next, prev) {
    this.value = value;
    this.next = next;
    this.prev = prev;
}

// Add nodes methods

LinkedList.prototype.addToHead = function (value) {
    const newNode = new Node(value, this.head, null);
    if (this.head) this.head.prev = newNode;
    else this.tail = newNode;
    this.head = newNode;
    this.len += 1;
};

LinkedList.prototype.addToTail = function (value) {
    const newNode = new Node(value, null, this.tail);
    if (this.tail) this.tail.next = newNode;
    else this.head = newNode;
    this.tail = newNode;
    this.len += 1;
}

// Remove nodes methods
LinkedList.prototype.removeHead = function () {
    if (!this.head) return null;
    let value = this.head.value;
    this.head = this.head.next;

    if (this.head) this.head.prev = null;
    else this.tail = null;
    this.len -= 1;
    return value;

}

LinkedList.prototype.removeTail = function () {
    if (!this.tail) return null;
    let value = this.tail.value;
    this.tail = this.tail.prev;

    if (this.tail) this.tail.next = null;
    else this.head = null;
    this.len -= 1;
    return value;
}

// Search method

LinkedList.prototype.search = function (searchValue) {
    let currentNode = this.head;

    while (currentNode) {
        if (currentNode.value === searchValue) return currentNode;
        currentNode = currentNode.next;
    }
    return null;
}

LinkedList.prototype.len = function () {
    return this.len;
}
