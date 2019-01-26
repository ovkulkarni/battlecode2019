import { SPECS } from 'battlecode';
import { open_neighbors, idx, dis } from './helpers.js';

export class Pathfinder {
    constructor(m, goal, speed = undefined) {
        this.goal = goal;
        this.passed_speed = speed;
        this.speed = speed || m.stats.SPEED;
        this.pilgrim_kys = false
        this.recalculate_points = [];
        this.recalculate(m);
    }
    next_loc(m, wait = false) {
        let o = {};
        if (this.path === undefined) {
            //m.log("PATH UNDEFINED");
            o.fail = true;
            return o;
        }
        if (this.path.length === 0) {
            o.fin = true;
            this.fin = true;
            return o;
        }
        let next = this.path[this.path.length - 1];
        if (m.fuel < m.stats.FUEL_PER_MOVE * dis(m.me.x, m.me.y, ...next)) {
            o.wait = true;
            return o;
        }
        let occupied = idx(m.visible_map, ...next);
        let attackable = m.me.unit === SPECS.PILGRIM && m.attackable_map[next[0]][next[1]]
        if (occupied >= 1 || attackable) {
            if (wait) {
                o.wait = true;
                return o;
            }
            
            let old_path = this.path;

            let back_and_forth = false;
            for (let rp of this.recalculate_points) {
                if (dis(...rp, m.me.x, m.me.y) < 8) {
                    //m.log("I'm just moving back and forth!");
                    back_and_forth = true;
                    this.path = undefined;
                    break;
                }
            }
            this.recalculate_points.push([m.me.x, m.me.y]); 
            
            if (!back_and_forth)
                this.recalculate(m);
            if (this.path === undefined) {
                if (attackable && this.pilgrim_kys) {
                    m.log("Intentionally die!");
                    this.path = old_path;
                } else {
                    o.fail = true;
                    return o;
                }
            }
            next = this.path[this.path.length - 1];
        }
        if (dis(...next, m.me.x, m.me.y) > this.speed) {
            this.recalculate(m);
            if (this.path === undefined) {
                o.fail = true;
                return o;
            }
            next = this.path[this.path.length - 1];
        }
        let result = this.path.pop();
        //m.log("NEXT MOVE: " + result);
        if (result === undefined) {
            o.fail = true;
            return o;
        }
        o.res = result;
        o.diff = [o.res[0] - m.me.x, o.res[1] - m.me.y];
        return o;
    }
    recalculate(m) {
        // m.log("CALCULATING");
        this.path = this.find_path(m, this.goal);
        // m.log("FOUND PATH: " + this.path);
    }
    find_path(m, pred) {
        let parent = new Map();
        let vis = new Set();
        let q = new LinkedList();
        q.addToHead([m.me.x, m.me.y]);
        while (q.length !== 0) {
            let cur = q.head.value;
            q.removeHead();
            if (pred(...cur)) {
                let path = [];
                this.fin = cur;
                while (parent.has(cur)) {
                    path.push(cur);
                    cur = parent.get(cur);
                }
                return path;
            }
            for (let space of open_neighbors(m, ...cur, this.passed_speed)) {
                if (vis.has(space.toString())) continue;
                parent.set(space, cur);
                vis.add(space.toString());
                q.addToTail(space);
            }
        }
    }
}

export class LinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;
    }

    addToHead(value) {
        const newNode = new Node(value, this.head, null);
        if (this.head) this.head.prev = newNode;
        else this.tail = newNode;
        this.head = newNode;
        this.length += 1;
    };

    addToTail(value) {
        const newNode = new Node(value, null, this.tail);
        if (this.tail) this.tail.next = newNode;
        else this.head = newNode;
        this.tail = newNode;
        this.length += 1;
    }
    removeHead() {
        if (!this.head) return null;
        let value = this.head.value;
        this.head = this.head.next;

        if (this.head) this.head.prev = null;
        else this.tail = null;
        this.length -= 1;
        return value;
    }

    removeTail() {
        if (!this.tail) return null;
        let value = this.tail.value;
        this.tail = this.tail.prev;

        if (this.tail) this.tail.next = null;
        else this.head = null;
        this.length -= 1;
        return value;
    }
    search(searchValue) {
        let currentNode = this.head;

        while (currentNode) {
            if (currentNode.value === searchValue) return currentNode;
            currentNode = currentNode.next;
        }
        return null;
    }
    len() {
        return this.len;
    }
}

class Node {
    constructor(value, next, prev) {
        this.value = value;
        this.next = next;
        this.prev = prev;
    }
}
