'use strict';

var SPECS = {"COMMUNICATION_BITS":16,"CASTLE_TALK_BITS":8,"MAX_ROUNDS":1000,"TRICKLE_FUEL":25,"INITIAL_KARBONITE":100,"INITIAL_FUEL":500,"MINE_FUEL_COST":1,"KARBONITE_YIELD":2,"FUEL_YIELD":10,"MAX_TRADE":1024,"MAX_BOARD_SIZE":64,"MAX_ID":4096,"CASTLE":0,"CHURCH":1,"PILGRIM":2,"CRUSADER":3,"PROPHET":4,"PREACHER":5,"RED":0,"BLUE":1,"CHESS_INITIAL":100,"CHESS_EXTRA":20,"TURN_MAX_TIME":200,"MAX_MEMORY":50000000,"UNITS":[{"CONSTRUCTION_KARBONITE":null,"CONSTRUCTION_FUEL":null,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":100,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":50,"CONSTRUCTION_FUEL":200,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":50,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":10,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":1,"STARTING_HP":10,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":20,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":9,"FUEL_PER_MOVE":1,"STARTING_HP":40,"VISION_RADIUS":36,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":25,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":2,"STARTING_HP":20,"VISION_RADIUS":64,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[16,64],"ATTACK_FUEL_COST":25,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":30,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":3,"STARTING_HP":60,"VISION_RADIUS":16,"ATTACK_DAMAGE":20,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":15,"DAMAGE_SPREAD":3}]};

function insulate(content) {
    return JSON.parse(JSON.stringify(content));
}

class BCAbstractRobot {
    constructor() {
        this._bc_reset_state();
    }

    // Hook called by runtime, sets state and calls turn.
    _do_turn(game_state) {
        this._bc_game_state = game_state;
        this.id = game_state.id;
        this.karbonite = game_state.karbonite;
        this.fuel = game_state.fuel;
        this.last_offer = game_state.last_offer;

        this.me = this.getRobot(this.id);

        if (this.me.turn === 1) {
            this.map = game_state.map;
            this.karbonite_map = game_state.karbonite_map;
            this.fuel_map = game_state.fuel_map;
        }

        try {
            var t = this.turn();
        } catch (e) {
            t = this._bc_error_action(e);
        }

        if (!t) t = this._bc_null_action();

        t.signal = this._bc_signal;
        t.signal_radius = this._bc_signal_radius;
        t.logs = this._bc_logs;
        t.castle_talk = this._bc_castle_talk;

        this._bc_reset_state();

        return t;
    }

    _bc_reset_state() {
        // Internal robot state representation
        this._bc_logs = [];
        this._bc_signal = 0;
        this._bc_signal_radius = 0;
        this._bc_game_state = null;
        this._bc_castle_talk = 0;
        this.me = null;
        this.id = null;
        this.fuel = null;
        this.karbonite = null;
        this.last_offer = null;
    }

    // Action template
    _bc_null_action() {
        return {
            'signal': this._bc_signal,
            'signal_radius': this._bc_signal_radius,
            'logs': this._bc_logs,
            'castle_talk': this._bc_castle_talk
        };
    }

    _bc_error_action(e) {
        var a = this._bc_null_action();
        
        if (e.stack) a.error = e.stack;
        else a.error = e.toString();

        return a;
    }

    _bc_action(action, properties) {
        var a = this._bc_null_action();
        if (properties) for (var key in properties) { a[key] = properties[key]; }
        a['action'] = action;
        return a;
    }

    _bc_check_on_map(x, y) {
        return x >= 0 && x < this._bc_game_state.shadow[0].length && y >= 0 && y < this._bc_game_state.shadow.length;
    }
    
    log(message) {
        this._bc_logs.push(JSON.stringify(message));
    }

    // Set signal value.
    signal(value, radius) {
        // Check if enough fuel to signal, and that valid value.

        if (this.fuel < radius) throw "Not enough fuel to signal given radius.";
        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.COMMUNICATION_BITS)) throw "Invalid signal, must be int within bit range.";
        if (radius > 2*Math.pow(SPECS.MAX_BOARD_SIZE-1,2)) throw "Signal radius is too big.";

        this._bc_signal = value;
        this._bc_signal_radius = radius;

        this.fuel -= radius;
    }

    // Set castle talk value.
    castleTalk(value) {
        // Check if enough fuel to signal, and that valid value.

        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.CASTLE_TALK_BITS)) throw "Invalid castle talk, must be between 0 and 2^8.";

        this._bc_castle_talk = value;
    }

    proposeTrade(karbonite, fuel) {
        if (this.me.unit !== SPECS.CASTLE) throw "Only castles can trade.";
        if (!Number.isInteger(karbonite) || !Number.isInteger(fuel)) throw "Must propose integer valued trade."
        if (Math.abs(karbonite) >= SPECS.MAX_TRADE || Math.abs(fuel) >= SPECS.MAX_TRADE) throw "Cannot trade over " + SPECS.MAX_TRADE + " in a given turn.";

        return this._bc_action('trade', {
            trade_fuel: fuel,
            trade_karbonite: karbonite
        });
    }

    buildUnit(unit, dx, dy) {
        if (this.me.unit !== SPECS.PILGRIM && this.me.unit !== SPECS.CASTLE && this.me.unit !== SPECS.CHURCH) throw "This unit type cannot build.";
        if (this.me.unit === SPECS.PILGRIM && unit !== SPECS.CHURCH) throw "Pilgrims can only build churches.";
        if (this.me.unit !== SPECS.PILGRIM && unit === SPECS.CHURCH) throw "Only pilgrims can build churches.";
        
        if (!Number.isInteger(dx) || !Number.isInteger(dx) || dx < -1 || dy < -1 || dx > 1 || dy > 1) throw "Can only build in adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't build units off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] > 0) throw "Cannot build on occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot build onto impassable terrain.";
        if (this.karbonite < SPECS.UNITS[unit].CONSTRUCTION_KARBONITE || this.fuel < SPECS.UNITS[unit].CONSTRUCTION_FUEL) throw "Cannot afford to build specified unit.";

        return this._bc_action('build', {
            dx: dx, dy: dy,
            build_unit: unit
        });
    }

    move(dx, dy) {
        if (this.me.unit === SPECS.CASTLE || this.me.unit === SPECS.CHURCH) throw "Churches and Castles cannot move.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't move off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot move outside of vision range.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] !== 0) throw "Cannot move onto occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot move onto impassable terrain.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);  // Squared radius
        if (r > SPECS.UNITS[this.me.unit]['SPEED']) throw "Slow down, cowboy.  Tried to move faster than unit can.";
        if (this.fuel < r*SPECS.UNITS[this.me.unit]['FUEL_PER_MOVE']) throw "Not enough fuel to move at given speed.";

        return this._bc_action('move', {
            dx: dx, dy: dy
        });
    }

    mine() {
        if (this.me.unit !== SPECS.PILGRIM) throw "Only Pilgrims can mine.";
        if (this.fuel < SPECS.MINE_FUEL_COST) throw "Not enough fuel to mine.";
        
        if (this.karbonite_map[this.me.y][this.me.x]) {
            if (this.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) throw "Cannot mine, as at karbonite capacity.";
        } else if (this.fuel_map[this.me.y][this.me.x]) {
            if (this.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) throw "Cannot mine, as at fuel capacity.";
        } else throw "Cannot mine square without fuel or karbonite.";

        return this._bc_action('mine');
    }

    give(dx, dy, karbonite, fuel) {
        if (dx > 1 || dx < -1 || dy > 1 || dy < -1 || (dx === 0 && dy === 0)) throw "Can only give to adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't give off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] <= 0) throw "Cannot give to empty square.";
        if (karbonite < 0 || fuel < 0 || this.me.karbonite < karbonite || this.me.fuel < fuel) throw "Do not have specified amount to give.";

        return this._bc_action('give', {
            dx:dx, dy:dy,
            give_karbonite:karbonite,
            give_fuel:fuel
        });
    }

    attack(dx, dy) {
        if (this.me.unit !== SPECS.CRUSADER && this.me.unit !== SPECS.PREACHER && this.me.unit !== SPECS.PROPHET) throw "Given unit cannot attack.";
        if (this.fuel < SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) throw "Not enough fuel to attack.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't attack off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot attack outside of vision range.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot attack impassable terrain.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);
        if (r > SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][1] || r < SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][0]) throw "Cannot attack outside of attack range.";

        return this._bc_action('attack', {
            dx:dx, dy:dy
        });
        
    }


    // Get robot of a given ID
    getRobot(id) {
        if (id <= 0) return null;
        for (var i=0; i<this._bc_game_state.visible.length; i++) {
            if (this._bc_game_state.visible[i].id === id) {
                return insulate(this._bc_game_state.visible[i]);
            }
        } return null;
    }

    // Check if a given robot is visible.
    isVisible(robot) {
        return ('x' in robot);
    }

    // Check if a given robot is sending you radio.
    isRadioing(robot) {
        return robot.signal >= 0;
    }

    // Get map of visible robot IDs.
    getVisibleRobotMap() {
        return this._bc_game_state.shadow;
    }

    // Get boolean map of passable terrain.
    getPassableMap() {
        return this.map;
    }

    // Get boolean map of karbonite points.
    getKarboniteMap() {
        return this.karbonite_map;
    }

    // Get boolean map of impassable terrain.
    getFuelMap() {
        return this.fuel_map;
    }

    // Get a list of robots visible to you.
    getVisibleRobots() {
        return this._bc_game_state.visible;
    }

    turn() {
        return null;
    }
}

let constants = {
    MIN_FUEL: 1000,
    MIN_KARB: 80,
    FUEL_KARB_RATIO: 0.2,
    FUEL_MIN_DIS: 15,
    KARB_MIN_DIS: 15,
    EMERGENCY_PRIORITY: 10,
    DEFENSE_RATIO: 1.5,
    HORDE_SIZE: 4,
    ATTACKING_TROOPS: new Set([SPECS.CRUSADER, SPECS.PREACHER])
};

let name_constants = [
    "HORIZONTAL",
    "VERTICAL",
    "FIRST_CHURCH",
    "FIRST_NOT_CHURCH",
    "NOT_FIRST_TURN",
];

let task_constant_bins = [
    [// PILGRIM
        "GATHER",
        "GATHER_FUEL",
        "GATHER_KARB",
        "CHURCH_KARB",
        "CHURCH_FUEL",
        "DEPOSIT",
        "NEUTRAL"
    ],
    [// CRUSADER, PROPHET, PREACHER
        "ATTACK",
        "DEFEND",
        "NEUTRAL",
        "HORDE"
    ],
];

let max_task = 0;
for (let bin of task_constant_bins) {
    let used_ixs = new Set();
    for (let task of bin) {
        if (constants[task] !== undefined)
            used_ixs.add(constants[task]);
    }
    let i = 0;
    for (let task of bin) {
        if (constants[task] !== undefined)
            continue;
        while (used_ixs.has(i))
            i++;
        constants[task] = i;
        max_task = Math.max(max_task, i);
        i++;
    }
}

for (let i = 0; i < name_constants.length; i++)
    constants[name_constants[i]] = max_task + i + 1;

let encode8, decode8, encode16, decode16;

const commands8 = [
    command("castle_coord", [6])
];

const commands16 = [
    command("task", [4]),
    command("horde_loc", [6, 6]),
    command("release_horde", [])
];

function command(name, bit_list) {
    return { name: name, bit_list: bit_list };
    // bit_list is a list of bit lengths, which signify the maximum
    // integer size which can be encoded/decoded in that slot.
}

function setup(bits, cs) {
    // header analysis
    for (let c of cs)
        c.header_len = bits - c.bit_list.reduce((a, b) => a + b, 0);
    let sorted_cs = cs.sort((a, b) => b.header_len - a.header_len);

    let header_name = new Map();
    let name_header = new Map();
    let name_header_len = new Map();

    let next_acc = -1;
    let cur_len = sorted_cs[0].header_len;
    for (let c of sorted_cs) {
        if (c.header_len < cur_len) {
            next_acc >>= cur_len - c.header_len;
            cur_len = c.header_len;
        }
        next_acc++;
        let header = bitMirror(next_acc, cur_len);
        header_name.set(header, c.name);
        name_header.set(c.name, header);
        name_header_len.set(c.name, c.header_len);
    }

    // generate partial encode and decode functions
    let e_funcs = {};
    let d_funcs = {};
    for (let c of cs) {

        let entries = c.bit_list.length;
        let passed = [0];
        for (let i = 0; i < entries - 1; i++)
            passed.push(passed[passed.length - 1] + c.bit_list[i]);

        let encode_partial = (list => {
            let sum = 0;
            for (let i = 0; i < entries; i++)
                sum += list[i] * 2 ** passed[i];
            return sum;
        });

        let decode_partial = (x => {
            let list = [];
            let acc = x;
            for (let i = 0; i < entries; i++) {
                let denom = 2 ** c.bit_list[i];
                list.push(acc % denom);
                acc = Math.floor(acc / denom);
            }
            return list;
        });

        e_funcs[c.name] = encode_partial;
        d_funcs[c.name] = decode_partial;
    }

    // generate full encode and decode functions

    let encode = ((command, ...list) => {
        return 1 + e_funcs[command](list) * 2 ** name_header_len.get(command) + name_header.get(command);
    });

    let decode = (x => {
        x--;
        let command;
        for (let len of sorted_cs.map(c => c.header_len)) {
            if (header_name.has(x % (2 ** len))) {
                command = header_name.get(x % (2 ** len));
                break;
            }
            len++;
        }
        let denom = 2 ** name_header_len.get(command);
        let args = d_funcs[command](Math.floor(x / denom));
        return { command: command, args: args };
    });

    return { encode: encode, decode: decode };
}

function bitMirror(x, bits) {
    let j = 0;
    let result = 0;
    for (let i = bits - 1; i >= 0; i--) {
        result |= ((x >> j) & 1) << i;
        j++;
    }
    return result;
}

let functions16 = setup(16, commands16);
let functions8 = setup(8, commands8);

encode16 = functions16.encode;
decode16 = functions16.decode;
encode8 = functions8.encode;
decode8 = functions8.decode;

// Based on the Unit, returns an array of movement speed, movement cost, vision radius, damage, attack damage, attack range, and fuel cost
function get_stats(m) {
    let o = SPECS.UNITS[m.me.unit];
    switch (m.me.unit) {
        case SPECS.CASTLE:
            o.DIRECTIONS = list_dir(2);
            break;
        case SPECS.CHURCH:
            o.DIRECTIONS = list_dir(2);
            break;
        default:
            o.DIRECTIONS = list_dir(o.SPEED);
    }
    return o;
}

function open_neighbors(m, x, y, speed = undefined) {
    const choices = speed !== undefined ? list_dir(speed) : m.stats.DIRECTIONS; //[[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    return choices.map(s => [x + s[0], y + s[1]])
        .filter(valid_loc(m));
}

function create_augmented_obj(m, x, y) {
    let o = {};
    o.me = {};
    o.me.x = x;
    o.me.y = y;
    o.stats = m.stats;
    o.map = m.map;
    o.visible_map = m.visible_map;
    return o;
}

function open_neighbors2(m, x, y) {
    const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    return choices.map(s => [x + s[0], y + s[1]])
        .filter(valid_loc(m));
}

function open_neighbors_diff(m, x, y) {
    return open_neighbors(m, x, y).map(s => [s[0] - x, s[1] - y]);
}
function valid_loc(m) {
    return (l => {
        let x = l[0];
        let y = l[1];
        if (!(x >= 0 && y >= 0 && x < m.map[0].length && y < m.map.length))
            return false;
        let visMapIx = idx(m.visible_map, x, y);
        return idx(m.map, x, y) && (visMapIx == 0 || visMapIx == -1);
    });
}

function passable_loc(m, x, y) {
    return x >= 0 && y >= 0 && x < m.map[0].length && y < m.map.length && idx(m.map, x, y)
}

function list_dir(r) {
    let pos = [];
    for (var i = Math.floor(-1 * Math.sqrt(r)); i <= Math.sqrt(r); i++) {
        for (var j = Math.floor(-1 * Math.sqrt(r)); j <= Math.sqrt(r); j++) {
            if (i * i + j * j <= r && i * i + j * j != 0) {
                pos.push([i, j]);
            }
        }
    }
    return pos;
}

function idx(a, x, y) {
    return a[y][x];
}

function calcOpposite(m, x, y) {
    const y_max = m.karbonite_map.length;
    const x_max = m.karbonite_map[0].length;
    if (m.symmetry === constants.VERTICAL) {
        return [x_max - x - 1, y];
    }
    return [x, y_max - y - 1];
}

function dis(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

function get_mission(m) {
    m.log("GETTING MISSION");
    for (let r of m.visible_allies) {
        if (r.signal !== -1) {
            let message = decode16(r.signal);
            m.log(`GOT MISSION ${message.args[0]} FROM ${r.id}`);
            return message.args[0];
        }
    }
}

function most_central_loc(m, list) {
    let min_val;
    let min_i;
    for (let i of list) {
        let val = centricity(m, i[0] + m.me.x, i[1] + m.me.y);
        if (min_val === undefined || val < min_val) {
            min_val = val;
            min_i = i;
        }
    }
    return min_i;
}

function centricity(m, x, y) {
    let center_x = Math.floor(m.map[0].length / 2);
    let center_y = Math.floor(m.map.length / 2);
    if (m.symmetry === constants.VERTICAL) {
        return dis(x, y, center_x, y);
    } else if (m.symmetry === constants.HORIZONTAL) {
        return dis(x, y, x, center_y);
    }
}

function stash_condition(m, x, y) {
    return m.me.turn > 20 && m.karbonite >= 75;
}

class Pathfinder {
    constructor(m, goal, speed = undefined) {
        this.goal = goal;
        this.passed_speed = speed;
        this.speed = speed || m.stats.SPEED;
        this.recalculate(m);
    }
    next_loc(m, wait = false) {
        let o = {};
        if (this.path === undefined) {
            m.log("PATH UNDEFINED");
            o.fail = true;
            return o;
        }
        if (this.path.length === 0) {
            o.fin = true;
            this.fin = true;
            return o;
        }
        let next = this.path[this.path.length - 1];
        if (m.fuel <= (m.stats.FUEL_PER_MOVE * dis(m.me.x, m.me.y, ...next) * 30)) {
            o.wait = true;
            return o;
        }
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
        if (dis(...next, m.me.x, m.me.y) > this.speed) {
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

class LinkedList {
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

// predicate combinators
function pand(...ps) {
    return ((x, y) => ps.map(p => p(x, y)).reduce((a, b) => a && b));
}
function around_pred(fx, fy, l, r) {
    return ((x, y) => dis(x, y, fx, fy) <= r && dis(x, y, fx, fy) >= l);
}
function attack_pred(m, fx, fy) {
    return around_pred(fx, fy, m.stats.ATTACK_RADIUS[0], m.stats.ATTACK_RADIUS[1]);
}

function fuel_pred(m) {
    return ((x, y) => idx(m.fuel_map, x, y));
}

function fuel_pred_church(m, xx, yy) {
    return ((x, y) => idx(m.fuel_map, x, y) /*&& dis(x, y, xx, yy) >= constants.FUEL_MIN_DIS*/);
}

function karbonite_pred(m) {
    return ((x, y) => idx(m.karbonite_map, x, y));
}

function karbonite_pred_church(m, xx, yy) {
    return ((x, y) => idx(m.karbonite_map, x, y) && dis(x, y, xx, yy) >= constants.KARB_MIN_DIS);
}
function central_of_pred(m, fx, fy) {
    let center_x = Math.floor(m.map[0].length / 2);
    let center_y = Math.floor(m.map.length / 2);
    if (m.symmetry === constants.VERTICAL) {
        let fd = dis(fx, fy, center_x, fy);
        return ((x, y) => dis(x, y, center_x, y) < fd);
    } else if (m.symmetry === constants.HORIZONTAL) {
        let fd = dis(fx, fy, fx, center_y);
        return ((x, y) => dis(x, y, x, center_y) < fd);
    }
}
function prophet_pred(m, cx, cy) {
    return pand(
        around_pred(cx, cy, 16, 25),
        central_of_pred(m, cx, cy)
    );
}

function get_symmetry(m) {
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

function best_fuel_locs(m) {
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

function best_karb_locs(m) {
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

function get_visible_base(m) {
    for (let robot of m.visible_robots) {
        if (robot.unit === SPECS.CASTLE || robot.unit === SPECS.CHURCH)
            return robot;
    }
}

function wander$1(m) {
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


function get_region_locs(m) {
    let r = constants.HORDE_SIZE ** 2;
    let regions = [];
    for (let i = Math.floor(r ** 0.5); i < m.karbonite_map.length; i += r) {
        for (let j = ((i / r) % 2 === 0) ? Math.floor(r ** 0.5) : m.karbonite_map[0].length - Math.floor(r ** 0.5); ((i / r) % 2 === 0) ? j < m.karbonite_map[0].length : j > -1; j += ((i / r) % 2 === 0) ? r : -1 * r) {
            regions.push(m.symmetry === constants.VERTICAL ? [i, j] : [j, i]);
        }
    }
    return regions.filter(valid_loc(m));
}

function check_horde(m) {
    let count = 0;
    for (let r of m.visible_allies) {
        if (r.x && r.y && dis(r.x, r.y, m.me.x, m.me.y) > 10)
            continue;
        if (constants.ATTACKING_TROOPS.has(r.unit))
            count++;
    }
    return count >= constants.HORDE_SIZE;
}

function horde(m) {
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

const top = 0;
const parent = i => ((i + 1) >>> 1) - 1;
const left = i => (i << 1) + 1;
const right = i => (i + 1) << 1;

class PriorityQueue {
  constructor(comparator = (a, b) => a > b) {
    this.task_count = new Map();
    this.unit_count = new Map();
    this._heap = [];
    this._comparator = comparator;
  }
  size() {
    return this._heap.length;
  }
  isEmpty() {
    return this.size() == 0;
  }
  peek() {
    return this._heap[top];
  }
  push(...values) {
    values.forEach(value => {

      if (!this.task_count.has(value.task))
        this.task_count.set(value.task, 0);
      this.task_count.set(value.task, 1 + this.task_count.get(value.task));

      if (!this.unit_count.has(value.unit))
        this.unit_count.set(value.unit, 0);
      this.unit_count.set(value.unit, 1 + this.unit_count.get(value.unit));

      this._heap.push(value);
      this._siftUp();
    });
    return this.size();
  }
  pop() {
    const poppedValue = this.peek();
    const bottom = this.size() - 1;
    if (bottom > top) {
      this._swap(top, bottom);
    }
    this._heap.pop();
    this._siftDown();
    this.task_count.set(poppedValue.task, this.task_count.get(poppedValue.task) - 1);
    this.unit_count.set(poppedValue.unit, this.unit_count.get(poppedValue.unit) - 1);
    return poppedValue;
  }
  replace(value) {
    const replacedValue = this.peek();
    this._heap[top] = value;
    this._siftDown();
    return replacedValue;
  }
  _greater(i, j) {
    return this._comparator(this._heap[i], this._heap[j]);
  }
  _swap(i, j) {
    [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
  }
  _siftUp() {
    let node = this.size() - 1;
    while (node > top && this._greater(node, parent(node))) {
      this._swap(node, parent(node));
      node = parent(node);
    }
  }
  _siftDown() {
    let node = top;
    while (
      (left(node) < this.size() && this._greater(left(node), node)) ||
      (right(node) < this.size() && this._greater(right(node), node))
    ) {
      let maxChild = (right(node) < this.size() && this._greater(right(node), left(node))) ? right(node) : left(node);
      this._swap(node, maxChild);
      node = maxChild;
    }
  }
}

function runCastle(m) {
    m.log(`CASTLE: (${m.me.x}, ${m.me.y})`);

    set_globals(m);
    handle_kstash(m);
    handle_castle_talk(m);
    send_castle_coord(m);
    determine_mission(m);

    // first turn logic
    if (m.me.turn === 1) {
        initialize_queue(m);
    }

    let build_opts = open_neighbors_diff(m, m.me.x, m.me.y);
    let unit = pick_unit(m);
    if (unit !== undefined) {
        let leftover_k = m.karbonite - unit_cost(unit.unit)[0];
        let leftover_f = m.fuel - unit_cost(unit.unit)[1];
        if (
            build_opts.length > 0 &&
            leftover_k >= 0 && leftover_f >= 0 &&
            (leftover_k >= m.kstash || unit.priority >= constants.EMERGENCY_PRIORITY)
        ) {
            let build_loc = most_central_loc(m, build_opts);
            m.log(`BUILD UNIT ${unit.unit} AT (${build_loc[0] + m.me.x}, ${build_loc[1] + m.me.y})`);
            m.log(`SENDING TASK ${unit.task}`);
            let msg = encode16("task", unit.task);
            m.signal(msg, build_loc[0] ** 2 + build_loc[1] ** 2);
            return m.buildUnit(unit.unit, ...build_loc);
        } else {
            m.log(`FAILED BUILD ATTEMPT: ${JSON.stringify(unit)}`);
            m.queue.push(unit);
            if (!check_horde(m)) {
                let opp = calcOpposite(m, m.me.x, m.me.y);
                m.log(`SENDING OUT LOCATION ${JSON.stringify(opp)}`);
                m.signal(encode16("horde_loc", ...opp), 10);
            }
            else {
                m.signal(encode16("release_horde"), 10);
            }
        }
    }
    return;
}

function pick_unit(m) {
    update_queue(m);
    if (!m.queue.isEmpty()) {
        return m.queue.pop();
    }
    // TODO: Remove this once we have better logic for when to spawn a crusader
    return Unit(SPECS.CRUSADER, constants.HORDE, 8)
}

function update_queue(m) {
    if (m.kstash > 0 && m.church_flag === constants.FIRST_CHURCH) {
        m.log("CHURCH PILGRIM QUEUED");
        m.queue.push(Unit(SPECS.PILGRIM, constants.CHURCH_KARB, 2));
        m.church_flag = constants.FIRST_NOT_CHURCH;
    }
    if (m.mission === constants.DEFEND) {
        const current_defenders = m.visible_allies.length;
        const desired_defenders = Math.floor(m.visible_enemies.length * constants.DEFENSE_RATIO);
        while (m.queue.task_count.get(constants.DEFEND) + current_defenders < desired_defenders) {
            m.log("QUEUE DEFENDER!");
            m.queue.push(Unit(SPECS.PROPHET, constants.DEFEND, constants.EMERGENCY_PRIORITY + 1));
        }
    }
    const visible_pilgrims = m.visible_allies.filter(r => r.unit == SPECS.PILGRIM);
    const desired_pilgrims = m.fuel_locs.length + m.karb_locs.length;
    while (m.queue.unit_count.get(SPECS.PILGRIM) + visible_pilgrims < desired_pilgrims) {
        m.log("QUEUE PILGRIM!");
        m.queue.push(Unit(SPECS.PILGRIM, constants.GATHER, 10));
    }
}

function initialize_queue(m) {
    for (let i = 0; i < m.karb_locs.length; i++)
        m.queue.push(Unit(SPECS.PILGRIM, constants.GATHER_KARB, 1));
    for (let i = 0; i < m.fuel_locs.length; i++)
        m.queue.push(Unit(SPECS.PILGRIM, constants.GATHER_FUEL, 1));
    m.queue.push(Unit(SPECS.PROPHET, constants.DEFEND, 3));
}

function determine_mission(m) {
    if (m.visible_enemies.length > 0) {
        m.log("I'm being attacked! Ow.");
        m.mission = constants.DEFEND;
    }
    else {
        m.mission = constants.NEUTRAL;
    }
}

function handle_castle_talk(m) {
    for (let r of m.visible_allies) {
        if (r.castle_talk !== 0) {

            let message = decode8(r.castle_talk);
            m.log(`RECEIVED (${message.command} ${message.args}) FROM ${r.id}`);

            if (message.command === "castle_coord") {
                handle_castle_coord(m, r, message);
                if (m.church_flag === constants.FIRST_CHURCH)
                    m.church_flag = constants.FIRST_NOT_CHURCH;
            }
            if (message.command === "firstdone") ;

            if (m.me.turn === 1)
                m.church_flag = constants.FIRST_NOT_CHURCH;
        }
    }
}

function send_castle_coord(m) {
    if (m.sent_x_coord === undefined) {
        m.sent_x_coord = true;
        let msg = encode8("castle_coord", m.me.x);
        m.log(`Sending ${msg} as x-coordinate`);
        m.castleTalk(msg);
    }
    else if (m.sent_y_coord === undefined) {
        m.sent_y_coord = true;
        let msg = encode8("castle_coord", m.me.y);
        m.log(`Sending ${msg} as y-coordinate`);
        m.castleTalk(msg);
    }
    else {
        m.log(`Friendlies: ${JSON.stringify(m.friendly_castles)}`);
    }
}

function handle_castle_coord(m, r, message) {
    if (m.friendly_castles[r.id] === undefined)
        m.friendly_castles[r.id] = {};
    if (m.friendly_castles[r.id].x === undefined)
        m.friendly_castles[r.id].x = message.args[0];
    else if (m.friendly_castles[r.id].y === undefined)
        m.friendly_castles[r.id].y = message.args[0];
}

function set_globals(m) {
    if (m.kstash === undefined) {
        m.kstash = 0;
    }
    if (m.queue === undefined) {
        m.queue = new PriorityQueue((a, b) => a.priority > b.priority);
    }
    if (m.friendly_castles === undefined) {
        m.friendly_castles = {};
    }
    if (m.mission === undefined) {
        m.mission = constants.NEUTRAL;
    }
    if (m.fuel_locs === undefined) {
        m.fuel_locs = best_fuel_locs(m);
    }
    if (m.karb_locs === undefined) {
        m.karb_locs = best_karb_locs(m);
    }
    if (m.mission === undefined) {
        m.mission = constants.NEUTRAL;
    }
    if (m.church_flag === undefined) {
        m.church_flag = constants.FIRST_CHURCH;
    }
}

function handle_kstash(m) {
    if (stash_condition(m)) {
        m.log("KSTASH");
        m.kstash = 50;
    } else {
        m.kstash = 0;
    }
}

function Unit(unit, task, priority) {
    return { unit: unit, task: task, priority: priority };
}

function unit_cost(b) {
    return [SPECS.UNITS[b].CONSTRUCTION_KARBONITE, SPECS.UNITS[b].CONSTRUCTION_FUEL];
}

function runCrusader(m) {
    m.log(`CRUSADER: (${m.me.x}, ${m.me.y})`);
    if (m.me.turn === 1) {
        let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);        switch (m.mission) {
            case constants.ATTACK:
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                break;
            case constants.HORDE:
                m.horde_loc = { x: opp[0], y: opp[1] };
                break;
        }
    }
    for (let r of m.visible_allies) {
        if (r.signal !== -1) {
            let message = decode16(r.signal);
            m.log(`GOT COMMAND ${message.command} (${message.args}) FROM ${r.id}`);
            if (message.command === "horde_loc") {
                m.horde_loc = {};
                m.horde_loc.x = message.args[0];
                m.horde_loc.y = message.args[1];
            } else if (message.command === "release_horde") {
                m.begin_horde = true;
            } else if (message.command === "task") {
                m.mission = message.args[0];
            }
        }
    }
    for (let r of m.visible_enemies) {
        let dist = dis(m.me.x, m.me.y, r.x, r.y);
        if (m.stats.ATTACK_RADIUS[0] < dist && dist < m.stats.ATTACK_RADIUS[1]) {
            m.log(`ATTACKING: (${r.x}, ${r.y})`);
            return m.attack(r.x - m.me.x, r.y - m.me.y);
        }
    }
    if (m.mission === constants.HORDE) {
        if (m.begin_horde) {
            if (m.intermediate_point === undefined) {
                m.log(`Trying to find path from ${JSON.stringify(m.spawn_castle)} to ${JSON.stringify(m.horde_loc)}`);
                let pf = new Pathfinder(create_augmented_obj(m, m.spawn_castle.x, m.spawn_castle.y), attack_pred(m, m.horde_loc.x, m.horde_loc.y));
                if (pf.path === undefined) {
                    m.log(`NO PATH FROM CASTLE TO OPPOSITE :(`);
                    return;
                }
                m.intermediate_point = pf.path[Math.floor(pf.path.length / 2)];
                return;
            } else {
                m.pathfinder = new Pathfinder(m, around_pred(...m.intermediate_point, 1, 2));
                m.begin_horde = false;
                m.on_intermediate = true;
                m.started = true;
            }
        } else if (!m.started) {
            return;
        }
    }
    let next = m.pathfinder.next_loc(m);
    if (next.fail) { m.log("FAILED"); return; }
    if (next.wait) { m.log("WAITING"); return; }
    if (next.fin) {
        switch (m.mission) {
            case constants.HORDE:
                if (m.on_intermediate) {
                    m.on_intermediate = false;
                    m.pathfinder = new Pathfinder(m, attack_pred(m, m.horde_loc.x, m.horde_loc.y));
                    return;
                } else {
                    m.mission = constants.RETURN;
                    m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 3));
                    m.begin_horde = undefined;
                    m.intermediate_point = undefined;
                    m.on_intermediate = undefined;
                    m.started = undefined;
                    return;
                }
            case constants.RETURN:
                return;
            default:
                m.mission = constants.NEUTRAL;
                m.log("WANDERING");
                wander$1(m);
                return;
        }
    }
    return m.move(...next.diff);
}

function runChurch(m) {
    m.log(`CHURCH: (${m.me.x}, ${m.me.y})`);

    set_globals$1(m);
    determine_mission$1(m);

    // first turn logic
    if (m.me.turn === 1) {
        initialize_queue$1(m);
    }

    let build_opts = open_neighbors_diff(m, m.me.x, m.me.y);
    let unit = pick_unit$1(m);
    if (unit !== undefined) {
        let leftover_k = m.karbonite - unit_cost$1(unit.unit)[0];
        let leftover_f = m.fuel - unit_cost$1(unit.unit)[1];
        if (
            build_opts.length > 0 &&
            leftover_k >= 0 && leftover_f >= 0 &&
            (leftover_k >= m.kstash || unit.priority >= constants.EMERGENCY_PRIORITY)
        ) {
            let build_loc = most_central_loc(m, build_opts);
            m.log(`BUILD UNIT ${unit.unit} AT (${build_loc[0] + m.me.x}, ${build_loc[1] + m.me.y})`);
            m.log(`SENDING TASK ${unit.task}`);
            let msg = encode16("task", unit.task);
            m.signal(msg, build_loc[0] ** 2 + build_loc[1] ** 2);
            return m.buildUnit(unit.unit, ...build_loc);
        } else {
            m.log(`FAILED BUILD ATTEMPT: ${JSON.stringify(unit)}`);
            m.queue.push(unit);
        }
    }
    return;
}

function pick_unit$1(m) {
    update_queue$1(m);
    if (!m.queue.isEmpty()) {
        return m.queue.pop();
    }
}

function update_queue$1(m) {
    if (m.mission === constants.DEFEND) {
        const current_defenders = m.visible_allies.length;
        const desired_defenders = Math.floor(m.visible_enemies.length * constants.DEFENSE_RATIO);
        while (m.queue.task_count.get(constants.DEFEND) + current_defenders < desired_defenders) {
            m.log("QUEUE DEFENDER!");
            m.queue.push(Unit$1(SPECS.PROPHET, constants.DEFEND, constants.EMERGENCY_PRIORITY + 1));
        }
    }
    const visible_pilgrims = m.visible_allies.filter(r => r.unit == SPECS.PILGRIM);
    const desired_pilgrims = m.fuel_locs.length + m.karb_locs.length;
    while (m.queue.unit_count.get(SPECS.PILGRIM) + visible_pilgrims < desired_pilgrims) {
        m.queue.push(Unit$1(SPECS.PILGRIM, constants.GATHER, 1));
    }
}

function initialize_queue$1(m) {
    for (let i = 0; i < m.karb_locs.length; i++)
        m.queue.push(Unit$1(SPECS.PILGRIM, constants.GATHER_KARB, 1));
    for (let i = 0; i < m.fuel_locs.length; i++)
        m.queue.push(Unit$1(SPECS.PILGRIM, constants.GATHER_FUEL, 1));
    m.queue.push(Unit$1(SPECS.PROPHET, constants.DEFEND, 3));
}

function determine_mission$1(m) {
    if (m.visible_enemies.length > 0) {
        m.log("I'm being attacked! Ow.");
        m.mission = constants.DEFEND;
    }
    else {
        m.mission = constants.NEUTRAL;
    }
}

function set_globals$1(m) {
    m.kstash = 50;
    if (m.queue === undefined) {
        m.queue = new PriorityQueue((a, b) => a.priority > b.priority);
    }
    if (m.mission === undefined) {
        m.mission = constants.NEUTRAL;
    }
    if (m.fuel_locs === undefined) {
        m.fuel_locs = best_fuel_locs(m);
    }
    if(m.karb_locs === undefined) {
        m.karb_locs = best_karb_locs(m);
    }
    if (m.mission === undefined) {
        m.mission = constants.NEUTRAL;
    }
    if (m.church_flag === undefined) {
        m.church_flag = constants.FIRST_CHURCH;
    }
}

function Unit$1(unit, task, priority) {
    return { unit: unit, task: task, priority: priority };
}

function unit_cost$1(b) {
    return [SPECS.UNITS[b].CONSTRUCTION_KARBONITE, SPECS.UNITS[b].CONSTRUCTION_FUEL];
}

function runPilgrim(m) {
    m.log(`PILGRIM: (${m.me.x}, ${m.me.y})`);
    m.log("INITIAL MISSION: " + m.mission);
    if (m.me.turn === 1) {
        m.log("INITIAL MISSION: " + m.mission);
        switch (m.mission) {
            case constants.GATHER:
                if (m.fuel < constants.MIN_FUEL) {
                    m.mission = constants.GATHER_FUEL;
                    m.pathfinder = new Pathfinder(m, fuel_pred(m));
                }
                else if (m.karbonite < constants.MIN_KARB) {
                    m.mission = constants.GATHER_KARB;
                    m.pathfinder = new Pathfinder(m, fuel_pred(m));
                }
                else {
                    if (Math.random() < constants.FUEL_KARB_RATIO) {
                        m.pathfinder = new Pathfinder(m, fuel_pred(m));
                        m.mission = constants.GATHER_FUEL;
                    }
                    else {
                        m.pathfinder = new Pathfinder(m, karbonite_pred(m));
                        m.mission = constants.GATHER_KARB;
                    }
                }
                break;
            case constants.DEPOSIT:
                m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 2));
                m.pathfinder.final_loc = [m.spawn_castle.x, m.spawn_castle.y];
                break;
            case constants.GATHER_KARB:
                m.pathfinder = new Pathfinder(m, karbonite_pred(m));
                m.initial_mission = m.mission;
                break;
            case constants.CHURCH_KARB:
                m.pathfinder = new Pathfinder(m, karbonite_pred_church(m, m.me.x, m.me.y));
                break;
            case constants.GATHER_FUEL:
                m.pathfinder = new Pathfinder(m, fuel_pred(m));
                m.initial_mission = m.mission;
                break;
            case constants.CHURCH_FUEL:
                m.pathfinder = new Pathfinder(m, fuel_pred_church(m, m.me.x, m.me.y));
                break;
            default:
                m.log("ERROR SHOULDNT HAPPEN");
        }
    }
    if (m.mission === constants.GATHER) {
        if (m.fuel > constants.MIN_FUEL) {
            if (Math.random() < constants.FUEL_KARB_RATIO) {
                m.pathfinder = new Pathfinder(m, fuel_pred(m));
                m.mission = constants.GATHER_FUEL;
            }
            else {
                m.pathfinder = new Pathfinder(m, karbonite_pred(m));
                m.mission = constants.GATHER_KARB;
            }
        } else {
            m.mission = constants.GATHER_FUEL;
            m.pathfinder = new Pathfinder(m, fuel_pred(m));
        }
    }
    let next = m.pathfinder.next_loc(m);
    if (next.fin) {
        if ((m.mission === constants.GATHER_KARB) || (m.mission === constants.GATHER_FUEL) || (m.mission === constants.CHURCH_KARB) || (m.mission === constants.CHURCH_FUEL)) {
            if (m.me.karbonite === m.stats.KARBONITE_CAPACITY || m.me.fuel === m.stats.FUEL_CAPACITY) {
                if (m.mission === constants.CHURCH_KARB || m.mission === constants.CHURCH_FUEL) {
                    if (m.church === undefined) {
                        let dir = open_neighbors2(m, m.me.x, m.me.y);
                        if (dir.length === 0) {
                            m.log("CANNOT BUILD CHURCH ANYWHERE, GOING BACK TO DROP OFF");
                            m.mission = (m.mission === constants.CHURCH_KARB) ? constants.GATHER_KARB : constants.GATHER_FUEL;
                            m.mission = constants.DEPOSIT;
                            m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 2));
                            m.pathfinder.final_loc = [m.spawn_castle.x, m.spawn_castle.y];
                            return;
                        }
                        let dr = dir[0];
                        m.church = [dr[0] - m.me.x, dr[1] - m.me.y];
                        if (m.karbonite >= unit_cost(SPECS.CHURCH)[0] && m.fuel >= unit_cost(SPECS.CHURCH)[1]) {
                            m.log("BUILDING CHURCH: " + dr);
                            return m.buildUnit(SPECS.CHURCH, ...m.church);
                        }
                        m.church = undefined;
                        m.log("NOT ENOUGH RESOURCES");
                        // Tell Castle to Send more Harvesters if Feasable
                        return;
                    }
                    m.log("DEPOSITING RESOURCES IN LOCAL CHURCH" + m.church);
                    return m.give(...m.church, m.me.karbonite, m.me.fuel);
                }
                else {
                    m.log("GOING BACK");
                    m.mission = constants.DEPOSIT;
                    let foundDrop = false;
                    let minr = 10000000;
                    for (let i = 0; i < m.visible_allies.length; i++) {
                        let ally = m.visible_allies[i];
                        if (ally.unit <= 1) {
                            foundDrop = true;
                            if (dis(ally.x, ally.y, m.me.x, m.me.y) < minr) {
                                minr = dis(ally.x, ally.y, m.me.x, m.me.y);
                                m.log("FOUND CLOSER DROPOFF");
                                m.pathfinder = new Pathfinder(m, around_pred(ally.x, ally.y, 1, 2));
                                m.pathfinder.final_loc = [ally.x, ally.y];
                            }
                        }
                    }
                    if (!foundDrop) {
                        m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 2));
                        m.pathfinder.final_loc = [m.spawn_castle.x, m.spawn_castle.y];
                    }
                }
            }
            else if (m.mission === constants.DEPOSIT) {
                m.log("DEPOSITING RESOURCES IN CASTLE");
                m.mission === constants.GATHER;
                return m.give(m.spawn_castle.x - m.me.x, m.spawn_castle.y - m.me.y, m.me.karbonite, m.me.fuel);
            }
            else {
                m.log("MINING");
                m.log("CHECKING FOR ENEMIES");
                let robArr = m.getVisibleRobots();
                for (let i = 0; i < robArr.length; i++) {
                    let tempRob = robArr[i];
                    if (tempRob.team != m.me.team) {
                        m.log("FOUND ENEMY");
                        // Tell the Castle you hit an enemy so they can defend.
                        // Altenratively tell remaining
                    }
                }
                if (m.fuel > SPECS.MINE_FUEL_COST)
                    return m.mine();

            }
        }
        else if (m.mission === constants.DEPOSIT) {
            let dx = m.pathfinder.final_loc[0] - m.me.x;
            let dy = m.pathfinder.final_loc[1] - m.me.y;

            m.mission = constants.GATHER;
            if (m.initial_mission === constants.GATHER_FUEL) {
                m.pathfinder = new Pathfinder(m, fuel_pred(m));
                m.mission = m.initial_mission;
            } else if (m.initial_mission === constants.GATHER_KARB) {
                m.pathfinder = new Pathfinder(m, karbonite_pred(m));
                m.mission = m.initial_mission;
            }
            else if (m.fuel > constants.MIN_FUEL) {
                m.pathfinder = Math.random() < constants.FUEL_KARB_RATIO ? new Pathfinder(m, fuel_pred(m)) : new Pathfinder(m, karbonite_pred(m));
            } else {
                m.pathfinder = new Pathfinder(m, fuel_pred(m));
            }
            m.log("GIVING IN DIRECTION: " + dx + " " + dy);
            return m.give(dx, dy, m.me.karbonite, m.me.fuel);
        }
    }
    else if (next.wait) {
        m.log("WAITING");
        return;
    }
    else if (next.fail) {
        m.log("FAILED TO MOVE");
        return;
    }
    else {
        m.log("PILGRIM MOVING: " + next.res);
        return m.move(...next.diff);
    }
}

function runPreacher(m) {
    m.log("PREACHER ID: " + m.me.id + "  X: " + m.me.x + "  Y: " + m.me.y);
    if (m.me.turn === 1) {
        switch (m.mission) {
            case constants.ATTACK:
                let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                break;
            default:
                m.pathfinder = new Pathfinder(m, attack_pred(m, m.spawn_castle.x, m.spawn_castle.y));
                break;
        }
    }
    for (let r of m.visible_enemies) {
        let dist = dis(m.me.x, m.me.y, r.x, r.y);
        if (shouldAttack(m, r.x - m.me.x, r.y - m.me.y) && m.stats.ATTACK_RADIUS[0] <= dist && dist <= m.stats.ATTACK_RADIUS[1]) {
            m.log(`ATTACKING: (${r.x}, ${r.y})`);
            return m.attack(r.x - m.me.x, r.y - m.me.y);
        }
    }
    let h = horde(m);
    if (h === false)
        return;
    let next = m.pathfinder.next_loc(m);
    if (next.fin) {
        switch (m.mission) {
            case constants.HORDE_INTERMEDIATE:
                m.mission = constants.ATTACK;
                let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                return;
            default:
                m.mission = constants.NEUTRAL;
                m.log("WANDERING");
                wander(m);
                return;
        }
    }
    else if (next.wait || next.fail) {
        m.log("PREACHER STUCK");
        return;
    }
    else {
        m.log("PREACHER MOVING: " + next);
        //let dx = next[0] - m.me.x; let dy = next[1] - m.me.y;
        return m.move(...next.diff);
    }
}

function shouldAttack(m, x, y) {

    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            //if (i != 0 || j != 0) {
            let id = idx(m.visible_map, m.me.x + i + x, m.me.y + j + y);
            // m.log("ROBOT ID " + id);
            if (id !== 0 && id !== -1) {
                // m.log("TEAM " + m.getRobot(id).team);
                if (m.getRobot(id).team === m.team) {
                    count = count - 1;
                }
                else count = count + 1;
            }
            //}
        }
    }
    return count > 0;
}

function runProphet(m) {
    m.log(`PROPHET: (${m.me.x}, ${m.me.y})`);
    if (m.me.turn) {
        switch (m.mission) {
            case constants.ATTACK:
                let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                break;
            default:
                m.pathfinder = new Pathfinder(m, prophet_pred(m, m.spawn_castle.x, m.spawn_castle.y));
                break;
        }
    }
    for (let r of m.visible_enemies) {
        let dist = dis(m.me.x, m.me.y, r.x, r.y);
        if (m.stats.ATTACK_RADIUS[0] <= dist && dist <= m.stats.ATTACK_RADIUS[1]) {
            m.log(`ATTACKING: (${r.x}, ${r.y})`);
            return m.attack(r.x - m.me.x, r.y - m.me.y);
        }
    }
    let next = m.pathfinder.next_loc(m);
    if (next.fin || next.fail || next.wait)
        return;
    return m.move(...next.diff);
}

class MyRobot extends BCAbstractRobot {
    turn() {
        this.visible_map = this.getVisibleRobotMap();
        this.visible_robots = this.getVisibleRobots();
        if (this.me.unit === SPECS.CASTLE) {
            this.visible_allies = this.visible_robots.filter(r => r.castle_talk !== undefined).filter(r => this.me.id !== r.id);
            this.visible_enemies = this.visible_robots.filter(r => r.castle_talk === undefined);
        } else {
            this.visible_allies = this.visible_robots.filter(r => r.team === this.me.team).filter(r => r.id !== this.me.id);
            this.visible_enemies = this.visible_robots.filter(r => r.team !== this.me.team);
        }
        if (this.mission === undefined)
            this.mission = get_mission(this);
        if (this.stats === undefined)
            this.stats = get_stats(this);
        if (this.symmetry === undefined)
            this.symmetry = get_symmetry(this);
        if (this.spawn_castle === undefined)
            this.spawn_castle = get_visible_base(this);
        let ret = undefined;
        switch (this.me.unit) {
            case SPECS.CASTLE:
                ret = runCastle(this);
                break;
            case SPECS.CRUSADER:
                ret = runCrusader(this);
                break;
            case SPECS.CHURCH:
                ret = runChurch(this);
                break;
            case SPECS.PILGRIM:
                ret = runPilgrim(this);
                break;
            case SPECS.PREACHER:
                ret = runPreacher(this);
                break;
            case SPECS.PROPHET:
                ret = runProphet(this);
                break;
        }
        if (ret === undefined && this.me.unit !== SPECS.CHURCH && this.me.unit !== SPECS.CASTLE) {
            let diff = undefined;
            let min_allies = this.visible_allies.filter(r => dis(this.me.x, this.me.y, r.x, r.y) <= 2).length;
            if (min_allies < 3)
                return;
            for (let opt of open_neighbors2(this, this.me.x, this.me.y)) {
                let count = 0;
                for (let ally of this.visible_allies) {
                    if (dis(ally.x, ally.y, opt[0], opt[1]) <= 2)
                        count++;
                }
                if (count < min_allies) {
                    min_allies = count;
                    diff = [opt[0] - this.me.x, opt[1] - this.me.y];
                }
            }
            if (diff !== undefined) {
                this.log(`DIFFUSING by ${JSON.stringify(diff)}`);
                return this.move(...diff);
            }
        }
        return ret;
    }
}

var robot = new MyRobot();

var robot = new MyRobot();
