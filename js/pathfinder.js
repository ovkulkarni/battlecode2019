import { SPECS } from 'battlecode';
import { open_neighbors, idx } from './helpers.js';

export class Pathfinder {
    constructor(m, goal) {
        this.goal = goal;
        this.speed = SPECS.UNITS[m.me.unit].SPEED;
        this.recalculate(m);
    }
    next_loc(m, wait = false) {
        let o = {};
        if (this.path === undefined) {
            o.fail = true;
            return o;
        }
        if (this.path.length === 0) {
            o.fin = true;
            return o;
        }
        let next = this.path[this.path.length - 1];
        let occupied = idx(m.visible_map, ...next);
        if (occupied >= 1) {
            if (wait) {
                o.wait = true;
                return o;
            }
            this.recalculate(m);
            if (this.path === undefined) {
                o.fail = true;
                return o;
            }
        }
        let result = this.path.pop();
        m.log("NEXT MOVE: " + result);
        o.res = result;
        o.diff = [o.res[0] - m.me.x, o.res[1] - m.me.y];
        return o;
    }
    recalculate(m) {
        m.log("CALCULATING");
        this.path = this.find_path(m, this.goal);
        m.log("FOUND PATH: " + this.path);
    }
    find_path(m, pred) {
        let parent = new Map();
        let vis = new Set();
        let q = new LinkedList();
        q.addToHead([m.me.x, m.me.y]);
        while (q.len !== 0) {
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
            for (let space of open_neighbors(m, ...cur)) {
                if (vis.has(space.toString())) continue;
                parent.set(space, cur);
                vis.add(space.toString());
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
