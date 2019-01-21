'use strict';

var SPECS$1 = {"COMMUNICATION_BITS":16,"CASTLE_TALK_BITS":8,"MAX_ROUNDS":1000,"TRICKLE_FUEL":25,"INITIAL_KARBONITE":100,"INITIAL_FUEL":500,"MINE_FUEL_COST":1,"KARBONITE_YIELD":2,"FUEL_YIELD":10,"MAX_TRADE":1024,"MAX_BOARD_SIZE":64,"MAX_ID":4096,"CASTLE":0,"CHURCH":1,"PILGRIM":2,"CRUSADER":3,"PROPHET":4,"PREACHER":5,"RED":0,"BLUE":1,"CHESS_INITIAL":100,"CHESS_EXTRA":20,"TURN_MAX_TIME":200,"MAX_MEMORY":50000000,"UNITS":[{"CONSTRUCTION_KARBONITE":null,"CONSTRUCTION_FUEL":null,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":200,"VISION_RADIUS":100,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,64],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":50,"CONSTRUCTION_FUEL":200,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":100,"VISION_RADIUS":100,"ATTACK_DAMAGE":0,"ATTACK_RADIUS":0,"ATTACK_FUEL_COST":0,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":10,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":1,"STARTING_HP":10,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":15,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":9,"FUEL_PER_MOVE":1,"STARTING_HP":40,"VISION_RADIUS":49,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":25,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":2,"STARTING_HP":20,"VISION_RADIUS":64,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[16,64],"ATTACK_FUEL_COST":25,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":30,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":3,"STARTING_HP":60,"VISION_RADIUS":16,"ATTACK_DAMAGE":20,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":15,"DAMAGE_SPREAD":3}]};

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
        
        var fuelNeeded = Math.ceil(Math.sqrt(radius));
        if (this.fuel < fuelNeeded) throw "Not enough fuel to signal given radius.";
        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS$1.COMMUNICATION_BITS)) throw "Invalid signal, must be int within bit range.";
        if (radius > 2*Math.pow(SPECS$1.MAX_BOARD_SIZE-1,2)) throw "Signal radius is too big.";

        this._bc_signal = value;
        this._bc_signal_radius = radius;

        this.fuel -= fuelNeeded;
    }

    // Set castle talk value.
    castleTalk(value) {
        // Check if enough fuel to signal, and that valid value.

        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS$1.CASTLE_TALK_BITS)) throw "Invalid castle talk, must be between 0 and 2^8.";

        this._bc_castle_talk = value;
    }

    proposeTrade(karbonite, fuel) {
        if (this.me.unit !== SPECS$1.CASTLE) throw "Only castles can trade.";
        if (!Number.isInteger(karbonite) || !Number.isInteger(fuel)) throw "Must propose integer valued trade."
        if (Math.abs(karbonite) >= SPECS$1.MAX_TRADE || Math.abs(fuel) >= SPECS$1.MAX_TRADE) throw "Cannot trade over " + SPECS$1.MAX_TRADE + " in a given turn.";

        return this._bc_action('trade', {
            trade_fuel: fuel,
            trade_karbonite: karbonite
        });
    }

    buildUnit(unit, dx, dy) {
        if (this.me.unit !== SPECS$1.PILGRIM && this.me.unit !== SPECS$1.CASTLE && this.me.unit !== SPECS$1.CHURCH) throw "This unit type cannot build.";
        if (this.me.unit === SPECS$1.PILGRIM && unit !== SPECS$1.CHURCH) throw "Pilgrims can only build churches.";
        if (this.me.unit !== SPECS$1.PILGRIM && unit === SPECS$1.CHURCH) throw "Only pilgrims can build churches.";
        
        if (!Number.isInteger(dx) || !Number.isInteger(dx) || dx < -1 || dy < -1 || dx > 1 || dy > 1) throw "Can only build in adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't build units off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] > 0) throw "Cannot build on occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot build onto impassable terrain.";
        if (this.karbonite < SPECS$1.UNITS[unit].CONSTRUCTION_KARBONITE || this.fuel < SPECS$1.UNITS[unit].CONSTRUCTION_FUEL) throw "Cannot afford to build specified unit.";

        return this._bc_action('build', {
            dx: dx, dy: dy,
            build_unit: unit
        });
    }

    move(dx, dy) {
        if (this.me.unit === SPECS$1.CASTLE || this.me.unit === SPECS$1.CHURCH) throw "Churches and Castles cannot move.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't move off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot move outside of vision range.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] !== 0) throw "Cannot move onto occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot move onto impassable terrain.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);  // Squared radius
        if (r > SPECS$1.UNITS[this.me.unit]['SPEED']) throw "Slow down, cowboy.  Tried to move faster than unit can.";
        if (this.fuel < r*SPECS$1.UNITS[this.me.unit]['FUEL_PER_MOVE']) throw "Not enough fuel to move at given speed.";

        return this._bc_action('move', {
            dx: dx, dy: dy
        });
    }

    mine() {
        if (this.me.unit !== SPECS$1.PILGRIM) throw "Only Pilgrims can mine.";
        if (this.fuel < SPECS$1.MINE_FUEL_COST) throw "Not enough fuel to mine.";
        
        if (this.karbonite_map[this.me.y][this.me.x]) {
            if (this.me.karbonite >= SPECS$1.UNITS[SPECS$1.PILGRIM].KARBONITE_CAPACITY) throw "Cannot mine, as at karbonite capacity.";
        } else if (this.fuel_map[this.me.y][this.me.x]) {
            if (this.me.fuel >= SPECS$1.UNITS[SPECS$1.PILGRIM].FUEL_CAPACITY) throw "Cannot mine, as at fuel capacity.";
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
        if (this.me.unit === SPECS$1.CHURCH) throw "Churches cannot attack.";
        if (this.fuel < SPECS$1.UNITS[this.me.unit].ATTACK_FUEL_COST) throw "Not enough fuel to attack.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't attack off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot attack outside of vision range.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);
        if (r > SPECS$1.UNITS[this.me.unit]['ATTACK_RADIUS'][1] || r < SPECS$1.UNITS[this.me.unit]['ATTACK_RADIUS'][0]) throw "Cannot attack outside of attack range.";

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
        return ('unit' in robot);
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
    ATTACKING_TROOPS: new Set([SPECS$1.CRUSADER, SPECS$1.PREACHER])
};

let name_constants = [
    "HORIZONTAL",
    "VERTICAL",
    "BUILD_CHURCH",
    "CLEAR_QUEUE",
];

let task_constant_bins = [
    [// PILGRIM
        "GATHER",
        "GATHER_FUEL",
        "GATHER_KARB",
        "CHURCH",
        "DEPOSIT",
        "NEUTRAL"
    ],
    [// CRUSADER, PROPHET, PREACHER
        "ATTACK",
        "DEFEND",
        "NEUTRAL",
        "HORDE",
        "RETURN"
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
    command("castle_coord", [6]),
    command("event_complete", []),
    command("castle_killed", [2]),
    command("came_back", []),
    command("watch_me", []),
    command("pause", []),
    command("unpause", [])
];

const commands16 = [
    command("task", [4]),
    command("send_horde", [6, 6, 2]),
    command("build_church", [6, 6])
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
        if (command === undefined)
            return { command: "ERROR", args: [] };
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
    let o = SPECS$1.UNITS[m.me.unit];
    switch (m.me.unit) {
        case SPECS$1.CASTLE:
            o.DIRECTIONS = list_dir(2);
            break;
        case SPECS$1.CHURCH:
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

function all_neighbors2(m, x, y) {
    const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    return choices.map(s => [x + s[0], y + s[1]])
        .filter(passable_loc_lambda(m));
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
function passable_loc_lambda(m) {
    return (l => {
        let x = l[0];
        let y = l[1];
        if (!(x >= 0 && y >= 0 && x < m.map[0].length && y < m.map.length))
            return false;
        return idx(m.map, x, y);
    });
}

function passable_loc(m, x, y) {
    return x >= 0 && y >= 0 && x < m.map[0].length && y < m.map.length && idx(m.map, x, y)
}

function list_dir(r) {
    let pos = [];
    for (let i = Math.floor(-1 * Math.sqrt(r)); i <= Math.sqrt(r); i++) {
        for (let j = Math.floor(-1 * Math.sqrt(r)); j <= Math.sqrt(r); j++) {
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
    //m.log("GETTING MISSION");
    for (let r of m.visible_allies) {
        if (r.signal !== -1) {
            let message = decode16(r.signal);
            //m.log(`GOT MISSION ${message.args[0]} FROM ${r.id}`);
            if (message.command === "task")
                return message.args[0];
            if (message.command === "build_church") {
                m.church = message.args;
                return constants.CHURCH;
            }
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

function current_stash(m) {
    return 101;
}

function visible_ally_attackers(m) {
    return m.visible_allies
        .filter(r => r.unit !== undefined && r.unit !== SPECS$1.PILGRIM && r.unit !== SPECS$1.CASTLE && r.unit !== SPECS$1.CHURCH);
}

function getDef(map, key, value) {
    return map.has(key) ? map.get(key) : value
}

function slow_down(m, diff) {
    let magnitude = Math.sqrt(diff[0] ** 2 + diff[1] ** 2);
    if (Math.min(...visible_ally_attackers(m).map(r => r.dist)) > 4)
        return [0, 0];
    return [Math.floor(diff[0] / magnitude), Math.floor(diff[1] / magnitude)];
}

function dis_opp_side(m, x, y) {
    let center_x = Math.floor(m.map[0].length / 2);
    let center_y = Math.floor(m.map.length / 2);
    let x_far = m.me.x > center_x ? 0 : m.map[0].length;
    let y_far = m.me.y > center_y ? 0 : m.map.length;
    if (m.symmetry === constants.VERTICAL) {
        return dis(x, y, x_far, y);
    } else if (m.symmetry === constants.HORIZONTAL) {
        return dis(x, y, x, y_far);
    }
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
        //m.log("NEXT MOVE: " + result);
        if(result === undefined) {
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
function por(...ps) {
    return ((x, y) => ps.map(p => p(x, y)).reduce((a, b) => a || b));
}

// actual predicates
function exact_pred(fx, fy) {
    return ((x, y) => fx === x && fy === y);
}
function around_pred(fx, fy, l, r) {
    return ((x, y) => dis(x, y, fx, fy) <= r && dis(x, y, fx, fy) >= l);
}
function attack_pred(m, fx, fy) {
    return around_pred(fx, fy, m.stats.ATTACK_RADIUS[0], m.stats.ATTACK_RADIUS[1]);
}

function fuel_pred_helper(m) {
    return ((x, y) => idx(m.fuel_map, x, y));
}

function fuel_pred(m) {
    return pand(fuel_pred_helper(m), on_ally_side_pred(m));
}

function karbonite_pred_helper(m) {
    return ((x, y) => idx(m.karbonite_map, x, y));
}

function karbonite_pred(m) {
    return pand(karbonite_pred_helper(m), on_ally_side_pred(m));
}

function every_pred(m) {
    return por(karbonite_pred_helper(m), fuel_pred_helper(m));
}
function no_depots(m) {
    return ((x, y) => !idx(m.karbonite_map, x, y) && !idx(m.fuel_map, x, y));
}

function on_ally_side_pred(m) {
    let sym = m.symmetry;
    let half = Math.floor(m.karbonite_map.length / 2);
    if (sym === constants.HORIZONTAL) {
        // x stays same
        return ((x, y) => !(y < half) ^ (m.me.y < half));
    }
    else {
        // y stays same
        return ((x, y) => !(x < half) ^ (m.me.x < half));
    }
}
function prophet_pred(m, cx, cy) {
    return pand(
        no_depots(m),
        around_pred(cx, cy, 16, 49),
        def_pred(m)
    );
}

function def_pred(m) {
    let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
    if (m.symmetry === constants.HORIZONTAL) {
        return ((x, y) => Math.abs(opp[0] - x) < Math.abs(m.spawn_castle.x - opp[0]))
    }
    return ((x, y) => Math.abs(opp[1] - y) < Math.abs(m.spawn_castle.y - opp[1]))
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
        if (horizontal) {
            return constants.HORIZONTAL;
        }
        else {
            return constants.VERTICAL;
        }
    }
}

function best_fuel_locs(m) {
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

function best_karb_locs(m) {
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

function get_visible_base(m) {
    for (let robot of m.visible_robots) {
        if (robot.unit === SPECS$1.CASTLE || robot.unit === SPECS$1.CHURCH)
            return robot;
    }
}

function find_optimal_churches(m) {
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
                if (matrix[numCol][numRow].length === 2) {
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
        for (let a in answer) {
            if (dis(...a, ...matrix[r][c][0]) <= 25) {
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
    return answer;

}

function wander(m) {
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

function front_back_ratio(m) {
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


function compact_horde(m, next) {
    let fbr = front_back_ratio(m);
    if (0 <= fbr && fbr < 1) {
        next.diff = slow_down(m, next.diff);
        next.res = [m.me.x + next.diff[0], m.me.y + next.diff[1]];
    }
}

function optimal_attack_diff(m) {
    if (m.visible_enemies.length === 0) return;
    switch (m.unit) {
        case SPECS$1.PREACHER:
            let castles = m.visible_enemies.filter(r => r.unit === SPECS$1.CASTLE);
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
                                        diff++;
                                    }
                                }
                            }
                        }
                    }
                    if (diff > max_diff) {
                        max_diff = diff;
                        optimal = { x: x, y: y };
                    }
                }
            }
            return [optimal.x - m.me.x, optimal.y - m.me.y];
        default:
            let castles_in_vision = m.visible_enemies.filter(r => r.unit === SPECS$1.CASTLE);
            if (castles_in_vision.length > 0 && m.stats.ATTACK_RADIUS[0] <= castles_in_vision[0].dist && castles_in_vision[0].dist <= m.stats.ATTACK_RADIUS[1]) {
                return [castles_in_vision[0].x - m.me.x, castles_in_vision[0].y - m.me.y];
            }
            let closest = m.visible_enemies.concat().sort((r1, r2) => r1.dist - r2.dist)[0];
            if (m.stats.ATTACK_RADIUS[0] <= closest.dist && closest.dist <= m.stats.ATTACK_RADIUS[1])
                return [closest.x - m.me.x, closest.y - m.me.y];
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

var mask = 0xffffffff;

class EventHandler {
    constructor(seed = 0) {
        this.seed = seed;
        this.m_w = (123456789 + seed) & mask;
        this.m_z = (987654321 - seed) & mask;
        this.past = [];
        this.last_clear = {};
    }
    next_event(m) {
        let clear = this.next_clear(m);
        let church = this.next_church(m);
        let horde = this.next_horde(m, 0.2);
        let event;
        if(this.past.length < 50) {
            if(this.past.length % 4 === 3 && church !== undefined) {
                event = church;
                m.log("CHURCH V1");
            }
            else {
                event = clear;
                m.log("CLEARING V1");
            }
        }
        else {
            if (this.past.length % 3 === 2 && m.fuel > (m.me.turn / 50) * 500) {
                event = horde;
                m.log("HORDING V2");
            }
            else {
                event = clear;
                m.log("CLEARING V2");
            }
        }
        this.handle_chosen_event(m, event);
        this.past.push(event);
        return event;
    }
    handle_chosen_event(m, event) {
        switch (event.what) {
            case constants.CLEAR_QUEUE:
                this.last_clear[event.who] = m.me.turn;
                break;
        }
    }
    next_clear(m) {
        let nc;
        let first_flag = false;
        for (let id in m.friendly_castles) {
            if (this.last_clear[id] === undefined) {
                this.last_clear[id] = -1;
                first_flag = true;
            }
            if (nc === undefined || this.last_clear[id] < this.last_clear[nc])
                nc = id;
        }
        if (first_flag) {
            return Event(this.closest_to_enemy(m, -1), constants.CLEAR_QUEUE, undefined, 0);
        }
        return Event(nc - 0, constants.CLEAR_QUEUE, undefined, 0);
    }
    next_horde(m, random_factor) {
        return Event(this.closest_to_enemy(m, random_factor), constants.ATTACK, undefined, 0);
    }
    next_church(m) {
        let where;
        let who;
        for (let group of m.resource_groups) {
            let group_karbs = group.filter(l => idx(m.karbonite_map, ...l));
            let candidate = group_karbs.length !== 0 ? group_karbs[0] : group[0];
            let too_close = false;
            let min_dist_castle_id;
            let min_dist;
            // compare distance to castles
            for (let a_id in m.friendly_castles) {
                let dist = dis(
                    m.friendly_castles[a_id].x, m.friendly_castles[a_id].y,
                    ...candidate
                );
                if (dist <= 49)
                    too_close = true;
                else if (min_dist === undefined || dist < min_dist) {
                    min_dist_castle_id = a_id;
                    min_dist = dist;
                }
            }
            //compare distance to churches
            for (let a_id in m.friendly_churches) {
                let dist = dis(
                    m.friendly_churches[a_id].x, m.friendly_churches[a_id].y,
                    ...candidate
                );
                if (dist <= 49)
                    too_close = true;
            }
            //compare distance to enemy castles
            for (let a_id in m.enemy_castles) {
                let dist = dis(
                    m.enemy_castles[a_id].x, m.enemy_castles[a_id].y,
                    ...candidate
                );
                if (dist <= 225)
                    too_close = true;
            }
            if (too_close) continue;
            if (where === undefined || dis_opp_side(m, ...where) < dis_opp_side(m, ...candidate)) {
                where = candidate;
                who = min_dist_castle_id;
            }
        }
        if (who !== undefined && where !== undefined) {
            return Event(who - 0, constants.BUILD_CHURCH, where, 50);
        }
        return;
    }
    closest_to_enemy(m, random_factor) {
        let best_a_id;
        let min_distance = 64 * 64 + 1;
        for (let a_id in m.friendly_castles) {
            for (let e_id in m.enemy_castles) {
                let distance = dis(
                    m.friendly_castles[a_id].x, m.friendly_castles[a_id].y,
                    m.enemy_castles[e_id].x, m.enemy_castles[e_id].y
                );
                if (distance < min_distance) {
                    min_distance = distance;
                    if (best_a_id === undefined || this.random() > random_factor)
                        best_a_id = a_id;
                }
            }
        }
        return best_a_id - 0;
    }
    random() {
        this.m_z = (36969 * (this.m_z & 65535) + (this.m_z >> 16)) & mask;
        this.m_w = (18000 * (this.m_w & 65535) + (this.m_w >> 16)) & mask;
        let result = ((this.m_z << 16) + (this.m_w & 65535)) >>> 0;
        result /= 4294967296;
        return result;
    }
}

function Event(who, what, where, blocking) {
    return { who: who, what: what, where: where, blocking: blocking };
}

function runCastle(m) {
    //m.log(`CASTLE [${m.me.turn}]: (${m.me.x}, ${m.me.y})`);

    if (m.me.turn === 1) {
        set_globals(m);
    }

    if (m.new_event_available) {
        m.new_event_available = false;
        new_event(m);
    }
    handle_castle_talk(m);
    send_castle_coord(m);

    if (m.me.turn === 3) {
        m.resource_groups = find_optimal_churches(m);
        create_event_handler(m);
    }
    determine_mission(m);

    // first turn logic
    if (m.me.turn === 1) {
        initialize_queue(m);
    }

    let att = optimal_attack_diff(m);
    if (att)
        return m.attack(...att);

    if (handle_horde(m)) {
        return;
    }

    let build_opts = open_neighbors_diff(m, m.me.x, m.me.y);
    let unit = pick_unit(m);
    let result;
    if (unit !== undefined) {
        let leftover_k = m.karbonite - unit_cost(unit.unit)[0];
        let leftover_f = m.fuel - unit_cost(unit.unit)[1];
        if (!m.paused &&
            build_opts.length > 0 &&
            leftover_k >= 0 && leftover_f >= 0 &&
            !(m.mission === constants.DEFEND && unit.task !== constants.DEFEND) &&
            (m.event === undefined || (m.event.who === m.me.id && leftover_k >= m.event.blocking)
                || leftover_k >= (m.event.blocking + current_stash(m))
                || unit.priority >= constants.EMERGENCY_PRIORITY)
        ) {
            let build_loc = most_central_loc(m, build_opts);
            //m.log(`BUILD UNIT ${unit.unit} AT (${build_loc[0] + m.me.x}, ${build_loc[1] + m.me.y})`);
            //m.log(`SENDING TASK ${unit.task}`);
            switch (unit.task) {
                case constants.HORDE:
                    m.current_horde++; break;
            }
            let msg = 0;
            if (unit.task === constants.CHURCH)
                msg = encode16("build_church", ...unit.loc);
            else
                msg = encode16("task", unit.task);
            m.signal(msg, build_loc[0] ** 2 + build_loc[1] ** 2);
            result = m.buildUnit(unit.unit, ...build_loc);
        } else {
            //m.log(`FAILED BUILD ATTEMPT: ${JSON.stringify(unit)}`);
            m.queue.push(unit);
        }
    }
    if (m.event && m.event.who === m.me.id && m.event.what === constants.CLEAR_QUEUE && m.queue.isEmpty()) {
        event_complete(m);
    }
    return result;
}

function pick_unit(m) {
    update_queue(m);
    if (!m.queue.isEmpty()) {
        return m.queue.pop();
    }
}

function update_queue(m) {
    if (m.mission === constants.DEFEND) {
        //m.log("DEFENDING");
        const defenders = [SPECS$1.PREACHER, SPECS$1.PROPHET];
        for (let d of defenders) {
            if (m.karbonite >= unit_cost(d)[0]) {
                m.queue.push(Unit(d, constants.DEFEND, constants.EMERGENCY_PRIORITY + 1));
                break;
            }
        }
    }
    // restore pilgrims
    const visible_pilgrims = m.visible_allies.filter(r => r.unit === SPECS$1.PILGRIM).length;
    const desired_pilgrims = m.fuel_locs.length + m.karb_locs.length;
    //m.log("VISIBLE: " + (visible_pilgrims+getDef(m.queue.unit_count, SPECS.PILGRIM, 0)) + " DESIRED: " + desired_pilgrims);
    //if(visible_pilgrims === 0) initialize_queue(m);
    //else
    while (getDef(m.queue.unit_count, SPECS$1.PILGRIM, 0) + visible_pilgrims < desired_pilgrims) {
        m.queue.push(Unit(SPECS$1.PILGRIM, constants.GATHER, 4));
    }
    // restore defense
    const current_defenders = visible_ally_attackers(m).length - m.current_horde;
    const desired_defenders = Math.floor(m.me.turn / 50)*1 + 3;
    while (getDef(m.queue.task_count, constants.DEFEND, 0) + current_defenders < desired_defenders) {
        m.queue.push(Unit(random_defender(m), constants.DEFEND, 5));
    }
}

function initialize_queue(m) {
    for (let i = 0; i < m.karb_locs.length; i++)
        m.queue.push(Unit(SPECS$1.PILGRIM, constants.GATHER_KARB, 6));
    for (let i = 0; i < m.fuel_locs.length; i++)
        m.queue.push(Unit(SPECS$1.PILGRIM, constants.GATHER_FUEL, 3));
    for (let i = 0; i < 3; i++)
        m.queue.push(Unit(SPECS$1.PROPHET, constants.DEFEND, 4));
}

function handle_horde(m) {
    if (check_horde$1(m) && m.event.who === m.me.id) {
        let best_e_loc;
        let best_e_id;
        let min_distance = 64 * 64 + 1;
        for (let e_id in m.enemy_castles) {
            let distance = dis(
                m.me.x, m.me.y,
                m.enemy_castles[e_id].x, m.enemy_castles[e_id].y
            );
            if (distance < min_distance) {
                min_distance = distance;
                best_e_loc = [m.enemy_castles[e_id].x, m.enemy_castles[e_id].y];
                best_e_id = e_id;
            }
        }
        m.log(`SENDING HORDE TO ${JSON.stringify(best_e_loc)} opposite ${best_e_id} (${JSON.stringify(m.friendly_ids)}`);

        //todo only send as far as u have to
        m.log("SENDING HORDE OF SIZE: " + m.current_horde);
        m.signal(encode16("send_horde", ...best_e_loc, m.friendly_ids.indexOf(`${best_e_id}`)), 20 * 20);
        if (m.max_horde_size < m.ultimate_horde_size)
            m.max_horde_size += 2;
        m.current_horde = 0;

        event_complete(m);
        return true;
    }
}

function determine_mission(m) {
    let prev_mission = m.mission;
    if (m.visible_enemies.length > 0) {
        m.mission = constants.DEFEND;
        if (prev_mission !== constants.DEFEND) {
            m.log(`I'm under attack! (${m.me.turn})`);
            m.my_pause = true;
            m.castleTalk(encode8("pause"));
        }
    }
    else {
        m.mission = constants.NEUTRAL;
        if (prev_mission !== constants.NEUTRAL)
            m.log(`NEUTRAL (${m.me.turn})`);
        while (!m.queue.isEmpty()) {
            let unit = m.queue.peek();
            if (unit.priority >= constants.EMERGENCY_PRIORITY && unit.task === constants.DEFEND) {
                m.queue.pop();
            } else { break; }
        }
        if (m.my_pause) {
            m.castleTalk(encode8("unpause"));
            m.my_pause = false;
        }
    }
}

function handle_castle_talk(m) {
    let alive = {};
    let event_complete_flag;
    let event_failed_flag = false;
    for (let r of m.visible_allies) {
        if (r.castle_talk !== 0) {
            let message = decode8(r.castle_talk);
            let log_recieve = true;
            switch (message.command) {
                case "castle_coord":
                    handle_castle_coord(m, r, message); break;
                case "event_complete":
                    event_complete_flag = true;
                    if (m.friendly_castles[r.id] === undefined) {
                        m.log("CHURCH LOCATED  EVENT: " + JSON.stringify(m.event));
                        m.friendly_churches[r.id] = { x: m.event.where[0], y: m.event.where[1] };
                    }
                    break;
                case "castle_killed":
                    let c_id = m.friendly_ids[message.args[0]];
                    m.log(`CASTLE OPPOSITE ${c_id} WAS KILLED`);
                    delete m.enemy_castles[c_id];
                    break;
                case "watch_me":
                    if (m.watch_out) {
                        m.watch_me = r.id;
                        m.watch_out = false;
                    } else { log_recieve = false; }
                    break;
                case "pause":
                    m.paused = true;
                    m.paused_by = r.id;
                    break;
                case "unpause":
                    m.paused = false;
                    break;
                case "came_back":
                    if (r.dist <= 36)
                        m.current_horde++;
                    break;
            }
            if (log_recieve)
                m.log(`RECEIVED (${message.command} ${message.args}) FROM ${r.id}`);
        }
        alive[r.id] = true;
    }

    // delete dead castles
    let to_delete = [];
    for (let id in m.friendly_castles) {
        if (id - 0 === m.me.id) continue;
        if (alive[id] === undefined) {
            to_delete.push(id);
            if (m.event !== undefined && m.event.who === id - 0)
                event_complete_flag = true;
        }
    }
    for (let id of to_delete) {
        delete m.friendly_castles[id];
        m.log("DEATH OF " + id);
        if (m.paused && m.paused_by === (id - 0)) {
            m.paused = false;
            m.log("UNPAUSED");
        }
    }

    // delete dead churches
    to_delete = [];
    for (let id in m.friendly_churches) {
        if (id - 0 === m.me.id) continue;
        if (alive[id] === undefined) {
            to_delete.push(id);
            if (m.event !== undefined && m.event.who === id - 0)
                event_complete_flag = true;
        }
    }
    for (let id of to_delete) {
        delete m.friendly_churches[id];
        m.log("DEATH OF " + id);
        if (m.paused && m.paused_by === (id - 0)) {
            m.paused = false;
            m.log("UNPAUSED");
        }
    }

    // check on m.watch_me
    if (m.watch_me !== undefined && alive[m.watch_me] === undefined) {
        m.watch_me = undefined;
        event_complete_flag = true;
        event_failed_flag = true;
    }

    // complete the event!
    if (event_complete_flag) {
        event_complete(m, event_failed_flag);
    }
}

function event_complete(m, failed = false) {
    if (m.event !== undefined) {
        if (m.event.who === m.me.id && !(m.event.what === constants.BUILD_CHURCH && !failed)) {
            m.log("Sending event_complete");
            m.castleTalk(encode8("event_complete"));
        }
    }
    m.new_event_available = true;
}

function new_event(m) {
    // load new event
    m.event = m.event_handler.next_event(m);
    //m.log(`NEW EVENT ${JSON.stringify(m.event)}`);
    // clear watch_me
    m.watch_me = undefined;
    // initial reaction to event
    if (m.event.who === m.me.id) {
        m.log(`[${m.me.turn}] NEW EVENT ${JSON.stringify(m.event)}`);
        switch (m.event.what) {
            case constants.ATTACK:
                for (let i = 0; i < m.max_horde_size; i++) {
                    m.queue.push(Unit(SPECS$1.PROPHET, constants.HORDE, 2));
                }
                break;
            case constants.BUILD_CHURCH:
                m.watch_out = true;
                m.queue.push(Unit(SPECS$1.PILGRIM, constants.CHURCH, constants.EMERGENCY_PRIORITY - 1, m.event.where));
                break;
            case constants.CLEAR_QUEUE:
                break;
            default:
                m.log(`SWITCH STATEMENT ERROR ${m.event.what}`);
        }
    }
}

function send_castle_coord(m) {
    if (m.sent_x_coord === undefined) {
        m.sent_x_coord = true;
        let msg = encode8("castle_coord", m.me.x);
        //m.log(`Sending ${msg} as x-coordinate`);
        m.castleTalk(msg);
    }
    else if (m.sent_y_coord === undefined) {
        m.sent_y_coord = true;
        let msg = encode8("castle_coord", m.me.y);
        //m.log(`Sending ${msg} as y-coordinate`);
        m.castleTalk(msg);
    }
}

function handle_castle_coord(m, r, message) {
    if (m.friendly_castles[r.id] === undefined) {
        m.friendly_castles[r.id] = {};
    }
    if (m.friendly_castles[r.id].x === undefined)
        m.friendly_castles[r.id].x = message.args[0];
    else if (m.friendly_castles[r.id].y === undefined) {
        m.friendly_castles[r.id].y = message.args[0];
        let x = m.friendly_castles[r.id].x;
        let y = m.friendly_castles[r.id].y;
        let opp = calcOpposite(m, x, y);
        m.enemy_castles[r.id] = { x: opp[0], y: opp[1] };
    }
    if (m.friendly_ids.indexOf(`${r.id}`) === -1)
        m.friendly_ids.push(`${r.id}`);
    m.friendly_ids.sort((a, b) => parseInt(a) - parseInt(b));
}

function create_event_handler(m) {
    m.event_handler = new EventHandler();
    new_event(m);
}

function set_globals(m) {
    m.queue = new PriorityQueue((a, b) => a.priority > b.priority);

    m.friendly_castles = {};
    m.friendly_churches = {};
    m.friendly_castles[m.me.id] = { x: m.me.x, y: m.me.y };

    m.enemy_castles = {};
    let opp = calcOpposite(m, m.me.x, m.me.y);
    m.enemy_castles[m.me.id] = { x: opp[0], y: opp[1] };

    m.fuel_locs = best_fuel_locs(m);
    m.karb_locs = best_karb_locs(m);
    m.mission = constants.NEUTRAL;
    m.max_horde_size = 8;
    m.ultimate_horde_size = Math.ceil(Math.max(m.map.length, m.map[0].length) / 4);
    m.current_horde = 0;
    m.friendly_ids = [`${m.me.id}`];
}

function check_horde$1(m) {
    return m.current_horde >= m.max_horde_size;
}

function Unit(unit, task, priority, loc) {
    return { unit: unit, task: task, priority: priority, loc: loc }
}

function unit_cost(b) {
    return [SPECS$1.UNITS[b].CONSTRUCTION_KARBONITE, SPECS$1.UNITS[b].CONSTRUCTION_FUEL];
}

function random_defender(m) {
    let preachers = m.visible_allies.filter(r => r.unit === SPECS$1.PREACHER).length;
    let prophets = m.visible_allies.filter(r => r.unit === SPECS$1.PROPHET).length;
    /*if ((preachers / prophets) < 0.5)
        return SPECS.PREACHER;
    */
    return SPECS$1.PROPHET;
}

function runCrusader(m) {
    //m.log(`CRUSADER: (${m.me.x}, ${m.me.y})`);
    if (m.me.turn === 1) {
        let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);        switch (m.mission) {
            case constants.ATTACK:
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                break;
            case constants.DEFEND:
                m.pathfinder = new Pathfinder(m, prophet_pred(m, m.spawn_castle.x, m.spawn_castle.y));
                break;
            case constants.HORDE:
                m.horde_loc = { x: opp[0], y: opp[1] };
                break;
        }
    }
    for (let r of m.visible_allies) {
        if (r.signal !== -1) {
            let message = decode16(r.signal);
            // m.log(`GOT COMMAND ${message.command} (${message.args}) FROM ${r.id}`);
            if (m.mission === constants.HORDE && message.command === "send_horde") {
                m.horde_loc = {};
                m.horde_loc.x = message.args[0];
                m.horde_loc.y = message.args[1];
                m.sending_castle = message.args[2];
                m.begin_horde = true;
            } else if (message.command === "update_task") {
                m.mission = message.args[0];
            }
        }
    }
    let att = optimal_attack_diff(m);
    if (att)
        return m.attack(...att);
    if (m.mission === constants.HORDE) {
        if (m.begin_horde) {
            if (m.intermediate_point === undefined) {
                //m.log(`Trying to find path from ${JSON.stringify(m.spawn_castle)} to ${JSON.stringify(m.horde_loc)}`);
                let pf = new Pathfinder(create_augmented_obj(m, m.spawn_castle.x, m.spawn_castle.y), attack_pred(m, m.horde_loc.x, m.horde_loc.y));
                if (pf.path === undefined) {
                    //m.log(`NO PATH FROM CASTLE TO OPPOSITE :(`);
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
    if (m.pathfinder === undefined)
        return;
    let next = m.pathfinder.next_loc(m);
    if (next.fail) {
        //m.log("FAILED");
        return;
    }
    if (next.wait) {
        //m.log("WAITING");
        return;
    }
    if (next.fin) {
        switch (m.mission) {
            case constants.HORDE:
                if (m.on_intermediate) {
                    m.on_intermediate = false;
                    m.pathfinder = new Pathfinder(m, attack_pred(m, m.horde_loc.x, m.horde_loc.y));
                    return;
                } else {
                    if (m.sending_castle < 3) {
                        m.mission = constants.RETURN;
                        m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 25));
                        if (dis(m.horde_loc.x, m.horde_loc.y, m.me.x, m.me.y) <= m.stats.VISION_RADIUS && m.visible_enemies.filter(r => r.unit === SPECS.CASTLE).length === 0) {
                            let message = encode8("castle_killed", m.sending_castle);
                            m.castleTalk(message);
                        }
                    } else {
                        m.mission = constants.DEFEND;
                        m.pathfinder = new Pathfinder(m, prophet_pred(m, m.horde_loc.x, m.horde_loc.y));
                    }
                    delete m.begin_horde;
                    delete m.intermediate_point;
                    delete m.on_intermediate;
                    delete m.started;
                    return;
                }
            case constants.RETURN:
                m.mission = constants.HORDE;
                m.castleTalk(encode8("came_back", m.sending_castle));
                delete m.sending_castle;
                return;
            case constants.DEFEND:
                return;
            default:
                m.mission = constants.NEUTRAL;
                //m.log("WANDERING");
                wander(m);
                return;
        }
    }
    compact_horde(m, next);
    if (idx(m.visible_map, ...next.res) >= 1 || !passable_loc(m, ...next.res))
        return;
    return m.move(...next.diff);
}

function runChurch(m) {
    //m.log(`CHURCH: (${m.me.x}, ${m.me.y})`);

    if (m.me.turn === 1) {
        set_globals$1(m);
    }

    determine_mission$1(m);
    if (m.me.turn === 1) {
        initialize_queue$1(m);
    }

    // first turn logic
    if (!m.send_complete && m.queue.isEmpty()) {
        m.log("[CHURCH] Sending Event_complete");
        m.castleTalk(encode8("event_complete"));
        m.send_complete = true;
    }

    let build_opts = open_neighbors_diff(m, m.me.x, m.me.y);
    let unit = pick_unit$1(m);
    if (unit !== undefined) {
        let leftover_k = m.karbonite - unit_cost$1(unit.unit)[0];
        let leftover_f = m.fuel - unit_cost$1(unit.unit)[1];
        if (
            build_opts.length > 0 &&
            leftover_k >= 0 && leftover_f >= 0 &&
            !(m.mission === constants.DEFEND && unit.task !== constants.DEFEND)
        ) {
            let build_loc = most_central_loc(m, build_opts);
            //m.log(`BUILD UNIT ${unit.unit} AT (${build_loc[0] + m.me.x}, ${build_loc[1] + m.me.y})`);
            //m.log(`SENDING TASK ${unit.task}`);
            let msg = encode16("task", unit.task);
            m.signal(msg, build_loc[0] ** 2 + build_loc[1] ** 2);
            return m.buildUnit(unit.unit, ...build_loc);
        } else {
            //m.log(`FAILED BUILD ATTEMPT: ${JSON.stringify(unit)}`);
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
        const defenders = [SPECS$1.PREACHER, SPECS$1.PROPHET];
        for (let d of defenders) {
            if (m.karbonite >= unit_cost$1(d)[0]) {
                m.queue.push(Unit$1(d, constants.DEFEND, constants.EMERGENCY_PRIORITY + 1));
                break;
            }
        }
    }
    const visible_pilgrims = m.visible_allies.filter(r => r.unit === SPECS$1.PILGRIM).length;
    const desired_pilgrims = m.fuel_locs.length + m.karb_locs.length;
    while (getDef(m.queue.unit_count, SPECS$1.PILGRIM, 0) + visible_pilgrims < desired_pilgrims) {
        m.queue.push(Unit$1(SPECS$1.PILGRIM, constants.GATHER, 3));
    }
}

function initialize_queue$1(m) {
    m.queue.push(Unit$1(SPECS$1.PROPHET, constants.DEFEND, 3));
    for (let i = 0; i < m.karb_locs.length - 1; i++)
        m.queue.push(Unit$1(SPECS$1.PILGRIM, constants.GATHER_KARB, 3));
    for (let i = 0; i < m.fuel_locs.length; i++)
        m.queue.push(Unit$1(SPECS$1.PILGRIM, constants.GATHER_FUEL, 1));
}

function determine_mission$1(m) {
    let prev_mission = m.mission;
    if (m.visible_enemies.filter(r => r.unit !== SPECS$1.PILGRIM).length + 2 >= visible_ally_attackers(m).length) {
        m.mission = constants.DEFEND;
        if (prev_mission !== constants.DEFEND) {
            m.log("I'm under attack!");
        }
    }
    else {
        m.mission = constants.NEUTRAL;
        while (!m.queue.isEmpty()) {
            let unit = m.queue.peek();
            if (unit.priority >= constants.EMERGENCY_PRIORITY && unit.task === constants.DEFEND) {
                m.queue.pop();

            } else {
                break;
            }
        }
    }
}

function set_globals$1(m) {
    m.queue = new PriorityQueue((a, b) => a.priority > b.priority);
    m.mission = constants.NEUTRAL;
    m.fuel_locs = best_fuel_locs(m);
    m.karb_locs = best_karb_locs(m);
}

function Unit$1(unit, task, priority) {
    return { unit: unit, task: task, priority: priority };
}

function unit_cost$1(b) {
    return [SPECS$1.UNITS[b].CONSTRUCTION_KARBONITE, SPECS$1.UNITS[b].CONSTRUCTION_FUEL];
}

function runPilgrim(m) {
    //m.log(`PILGRIM: (${m.me.x}, ${m.me.y})`);
    //m.log("INITIAL MISSION: " + m.mission);
    if (m.diffused) {
        m.diffused = false;
        if (m.pathfinder === undefined)
            m.pathfinder.recalculate(m);
    }
    if (m.me.turn === 1) {
        get_start_pathfinder(m);
    }
    if (m.mission === constants.GATHER) {
        get_pathfinder(m);
    }
    if (m.pathfinder === undefined) {
        m.log("PATHFINDER DOESNT EXIST");
        m.log("MISSION: " + m.mission);
        get_pathfinder(m);
    }
    //m.log("PATHFINDER: " + JSON.stringify(m.pathfinder));
    let next = m.pathfinder.next_loc(m);
    //m.log("NEXT MOVE: " + JSON.stringify(next));
    if (next.fin) {
        if ((m.mission === constants.GATHER_KARB) || (m.mission === constants.GATHER_FUEL) || (m.mission === constants.CHURCH) || (m.mission === constants.GATHER)) {
            if (m.me.karbonite === m.stats.KARBONITE_CAPACITY || m.me.fuel === m.stats.FUEL_CAPACITY) {
                if (m.mission === constants.CHURCH) {
                    if (m.church_loc === undefined) {
                        return build_church(m);
                    }
                    // m.log(m.church_loc);
                    if (idx(m.visible_map, ...m.church_loc) === 0) {
                        return build_church(m);
                    }
                    return m.give(...m.diff_church_loc, m.me.karbonite, m.me.fuel);
                }
                else {
                    m.mission = constants.DEPOSIT;
                    get_pathfinder(m);
                    let nextt = m.pathfinder.next_loc(m);
                    if (nextt.fin) {
                        //m.log("HERE");
                        m.mission === constants.GATHER;
                        //m.log("GIVING TO: " + m.pathfinder.final_loc);
                        return m.give(m.pathfinder.final_loc[0] - m.me.x, m.pathfinder.final_loc[1] - m.me.y, m.me.karbonite, m.me.fuel);
                    }
                    else if (nextt.fail) {
                        // m.log("PILGRIM CANNOT MOVE BACK");
                        m.pathfinder.recalculate(m);
                        return true;
                    }
                    else if (nextt.wait) {
                        // m.log("PILGRIM WAITING TO MOVE");
                        return true;
                    }
                    else {
                        // m.log("MOVING: " + next.diff);
                        return m.move(...nextt.diff);
                    }
                }
            }
            else if (m.mission === constants.DEPOSIT) {
                //m.log("DEPOSITING RESOURCES IN CASTLE");
                m.mission === constants.GATHER;
                return m.give(m.spawn_castle.x - m.me.x, m.spawn_castle.y - m.me.y, m.me.karbonite, m.me.fuel);
            }
            else {
                //m.log("MINING");
                //m.log("CHECKING FOR ENEMIES");
                let robArr = m.getVisibleRobots();
                for (let i = 0; i < robArr.length; i++) {
                    let tempRob = robArr[i];
                    if (tempRob.team != m.me.team) ;
                }
                if (m.fuel > SPECS$1.MINE_FUEL_COST) {
                    if (idx(m.fuel_map, m.me.x, m.me.y) || idx(m.karbonite_map, m.me.x, m.me.y))
                        return m.mine();
                    else {
                        m.pathfinder.recalculate(m);
                    }
                }

            }
        }
        else if (m.mission === constants.DEPOSIT) {
            //m.log("GIVING TO: " + m.pathfinder.final_loc);
            let dx = m.pathfinder.final_loc[0] - m.me.x;
            let dy = m.pathfinder.final_loc[1] - m.me.y;

            m.mission = constants.GATHER;
            get_pathfinder(m);
            //m.log("GIVING IN DIRECTION: " + dx + " " + dy);
            if (idx(m.visible_map, m.me.x + dx, m.me.y + dy) === 0) {
                m.log("CASTLE DIED: BUILDING CHURCH");
                return m.buildUnit(SPECS$1.CHURCH, dx, dy);
            }
            return m.give(dx, dy, m.me.karbonite, m.me.fuel);
        }
    }
    else if (next.wait) {
        // m.log("WAITING");
        return;
    }
    else if (next.fail) {
        // m.log("FAILED TO MOVE");
        m.pathfinder.recalculate(m);
        return;
    }
    else {
        //m.log("PILGRIM MOVING: " + next.res);
        return m.move(...next.diff);
    }
}

function get_start_pathfinder(m) {
    switch (m.mission) {
        case constants.GATHER:
            m.pathfinder = new Pathfinder(m, every_pred(m));
            m.mission = constants.GATHER;
            break;
        case constants.DEPOSIT:
            m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 2));
            m.pathfinder.final_loc = [m.spawn_castle.x, m.spawn_castle.y];
            break;
        case constants.GATHER_KARB:
            m.pathfinder = new Pathfinder(m, karbonite_pred(m));
            //m.pathfinder = new Pathfinder(m, every_pred(m));
            m.initial_mission = m.mission;
            break;
        case constants.CHURCH:
            m.castleTalk(encode8("watch_me"));
            //m.log("CHURCH PILGRIM   CHURCH: " + m.church);
            m.pathfinder = new Pathfinder(m, exact_pred(...m.church));
            break;
        case constants.GATHER_FUEL:
            m.pathfinder = new Pathfinder(m, fuel_pred(m));
            //m.pathfinder = new Pathfinder(m, every_pred(m));
            m.initial_mission = m.mission;
            break;
        default:
            m.log("ERROR SHOULDNT HAPPEN");
    }
}

function get_pathfinder(m) {
    switch (m.mission) {
        case constants.GATHER:
            m.pathfinder = new Pathfinder(m, every_pred(m));
            m.mission = constants.GATHER;
            break;
        case constants.DEPOSIT:
            m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 2));
            m.pathfinder.final_loc = [m.spawn_castle.x, m.spawn_castle.y];
            break;
        case constants.GATHER_KARB:
            m.pathfinder = new Pathfinder(m, karbonite_pred(m));
            //m.pathfinder = new Pathfinder(m, every_pred(m));
            m.initial_mission = m.mission;
            break;
        case constants.CHURCH:
            m.castleTalk(encode8("watch_me"));
            //m.log("CHURCH PILGRIM   CHURCH: " + m.church);
            m.pathfinder = new Pathfinder(m, exact_pred(...m.church));
            break;
        case constants.GATHER_FUEL:
            m.pathfinder = new Pathfinder(m, fuel_pred(m));
            //m.pathfinder = new Pathfinder(m, every_pred(m));
            m.initial_mission = m.mission;
            break;
        default:
            m.log("ERROR SHOULDNT HAPPEN");
    }
}

function build_church(m) {
    let dir = open_neighbors2(m, m.me.x, m.me.y);
    if (dir.length === 0) {
        m.mission = constants.DEPOSIT;
        get_pathfinder(m);
        return;
    }
    let dr = dir[0];
    for (let i = 0; i < dir.length; i++) {
        // m.log("CHOICE: " + dir[i]);
        if (idx(m.karbonite_map, ...dir[i]) || idx(m.fuel_map, ...dir[i])) continue;
        dr = dir[i];
        break;
    }
    m.church_loc = dr;
    m.diff_church_loc = [dr[0] - m.me.x, dr[1] - m.me.y];
    if (m.karbonite >= unit_cost(SPECS$1.CHURCH)[0] && m.fuel >= unit_cost(SPECS$1.CHURCH)[1]) {
        return m.buildUnit(SPECS$1.CHURCH, ...m.diff_church_loc);
    }
    m.church_loc = undefined;
    return;
}

function runPreacher(m) {
    //m.log("PREACHER ID: " + m.me.id + "  X: " + m.me.x + "  Y: " + m.me.y);
    if (m.me.turn === 1) {
        let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);        switch (m.mission) {
            case constants.ATTACK:
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                break;
            case constants.HORDE:
                m.horde_loc = { x: opp[0], y: opp[1] };
                break;
            case constants.DEFEND:
                m.pathfinder = new Pathfinder(m, prophet_pred(m, m.spawn_castle.x, m.spawn_castle.y));
                break;
            default:
                m.pathfinder = new Pathfinder(m, attack_pred(m, m.spawn_castle.x, m.spawn_castle.y));
                break;
        }
    }
    for (let r of m.visible_allies) {
        if (r.signal !== -1) {
            let message = decode16(r.signal);
            // m.log(`GOT COMMAND ${message.command} (${message.args}) FROM ${r.id}`);
            if (m.mission === constants.HORDE && message.command === "send_horde") {
                m.horde_loc = {};
                m.horde_loc.x = message.args[0];
                m.horde_loc.y = message.args[1];
                m.sending_castle = message.args[2];
                m.begin_horde = true;
            } else if (message.command === "update_task") {
                m.mission = message.args[0];
            }
        }
    }
    let att = optimal_attack_diff(m);
    if (att)
        return m.attack(...att);
    if (m.mission === constants.HORDE) {
        if (m.begin_horde) {
            if (m.intermediate_point === undefined) {
                //m.log(`Trying to find path from ${JSON.stringify(m.spawn_castle)} to ${JSON.stringify(m.horde_loc)}`);
                let pf = new Pathfinder(create_augmented_obj(m, m.spawn_castle.x, m.spawn_castle.y), attack_pred(m, m.horde_loc.x, m.horde_loc.y));
                if (pf.path === undefined) {
                    //m.log(`NO PATH FROM CASTLE TO OPPOSITE :(`);
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
    if (m.pathfinder === undefined)
        return;
    let next = m.pathfinder.next_loc(m);
    if (next.fail) {
        //m.log("FAILED");
        return;
    }
    if (next.wait) {
        //m.log("WAITING");
        return;
    }
    if (next.fin) {
        switch (m.mission) {
            case constants.HORDE:
                if (m.on_intermediate) {
                    m.on_intermediate = false;
                    m.pathfinder = new Pathfinder(m, attack_pred(m, m.horde_loc.x, m.horde_loc.y));
                    return;
                } else {
                    if (m.sending_castle < 3) {
                        m.mission = constants.RETURN;
                        m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 25));
                        if (dis(m.horde_loc.x, m.horde_loc.y, m.me.x, m.me.y) <= m.stats.VISION_RADIUS && m.visible_enemies.filter(r => r.unit === SPECS.CASTLE).length === 0) {
                            let message = encode8("castle_killed", m.sending_castle);
                            m.castleTalk(message);
                        }
                    } else {
                        m.mission = constants.DEFEND;
                        m.pathfinder = new Pathfinder(m, prophet_pred(m, m.horde_loc.x, m.horde_loc.y));
                    }
                    delete m.begin_horde;
                    delete m.intermediate_point;
                    delete m.on_intermediate;
                    delete m.started;
                    return;
                }
            case constants.RETURN:
                m.mission = constants.HORDE;
                m.castleTalk(encode8("came_back", m.sending_castle));
                delete m.sending_castle;
                return;
            case constants.DEFEND:
                return;
            default:
                m.mission = constants.NEUTRAL;
                //m.log("WANDERING");
                wander(m);
                return;
        }
    }
    compact_horde(m, next);
    if (idx(m.visible_map, ...next.res) >= 1 || !passable_loc(m, ...next.res))
        return;
    return m.move(...next.diff);

}

function runProphet(m) {
    //m.log(`PROPHET: (${m.me.x}, ${m.me.y})`);
    if (m.me.turn === 1) {
        let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
        switch (m.mission) {
            case constants.ATTACK:
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                break;
            case constants.HORDE:
                m.horde_loc = { x: opp[0], y: opp[1] };
                break;
            default:
                m.pathfinder = new Pathfinder(m, prophet_pred(m), 2);
                break;
        }
    }
    for (let r of m.visible_allies) {
        if (r.signal !== -1) {
            let message = decode16(r.signal);
            // m.log(`GOT COMMAND ${message.command} (${message.args}) FROM ${r.id}`);
            if (m.mission === constants.HORDE && message.command === "send_horde") {
                m.horde_loc = {};
                m.horde_loc.x = message.args[0];
                m.horde_loc.y = message.args[1];
                m.sending_castle = message.args[2];
                m.begin_horde = true;
            } else if (message.command === "update_task") {
                m.mission = message.args[0];
            }
        }
    }
    let att = optimal_attack_diff(m);
    if (att)
        return m.attack(...att);
    if (m.mission === constants.HORDE) {
        if (m.begin_horde) {
            if (m.intermediate_point === undefined) {
                //m.log(`Trying to find path from ${JSON.stringify(m.spawn_castle)} to ${JSON.stringify(m.horde_loc)}`);
                let pf = new Pathfinder(create_augmented_obj(m, m.spawn_castle.x, m.spawn_castle.y), attack_pred(m, m.horde_loc.x, m.horde_loc.y));
                if (pf.path === undefined) {
                    //m.log(`NO PATH FROM CASTLE TO OPPOSITE :(`);
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
    if (next.fail || next.wait)
        return;
    else if (next.fin) {
        if (next.fin) {
            switch (m.mission) {
                case constants.HORDE:
                    if (m.on_intermediate) {
                        m.on_intermediate = false;
                        m.pathfinder = new Pathfinder(m, attack_pred(m, m.horde_loc.x, m.horde_loc.y));
                        return;
                    } else {
                        if (m.sending_castle < 3) {
                            m.mission = constants.RETURN;
                            m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 25));
                            if (dis(m.horde_loc.x, m.horde_loc.y, m.me.x, m.me.y) <= m.stats.VISION_RADIUS && m.visible_enemies.filter(r => r.unit === SPECS$1.CASTLE).length === 0) {
                                let message = encode8("castle_killed", m.sending_castle);
                                m.castleTalk(message);
                            }
                        } else {
                            m.mission = constants.DEFEND;
                            m.pathfinder = new Pathfinder(m, prophet_pred(m, m.horde_loc.x, m.horde_loc.y));
                        }
                        delete m.begin_horde;
                        delete m.intermediate_point;
                        delete m.on_intermediate;
                        delete m.started;
                        return;
                    }
                case constants.RETURN:
                    m.mission = constants.HORDE;
                    m.castleTalk(encode8("came_back"));
                    return;
                default:
                    m.mission = constants.DEFEND;
                    return true;
            }
        }
    }
    compact_horde(m, next);
    if (idx(m.visible_map, ...next.res) >= 1 || !passable_loc(m, ...next.res))
        return;
    return m.move(...next.diff);
}

class MyRobot extends BCAbstractRobot {
    turn() {
        this.visible_map = this.getVisibleRobotMap();
        this.visible_robots = this.getVisibleRobots();
        this.visible_others = this.visible_robots.filter(r => this.me.id !== r.id);
        this.visible_others.map(r => r.dist = dis(r.x, r.y, this.me.x, this.me.y));
        if (this.me.unit === SPECS$1.CASTLE) {
            this.visible_allies = this.visible_others.filter(r => r.team === this.me.team);
            this.visible_enemies = this.visible_others.filter(r => r.team !== this.me.team);
        } else {
            this.visible_allies = this.visible_others.filter(r => r.team !== undefined && r.team === this.me.team);
            this.visible_enemies = this.visible_others.filter(r => r.team !== undefined && r.team !== this.me.team);
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
            case SPECS$1.CASTLE:
                ret = runCastle(this);
                break;
            case SPECS$1.CRUSADER:
                ret = runCrusader(this);
                break;
            case SPECS$1.CHURCH:
                ret = runChurch(this);
                break;
            case SPECS$1.PILGRIM:
                ret = runPilgrim(this);
                break;
            case SPECS$1.PREACHER:
                ret = runPreacher(this);
                break;
            case SPECS$1.PROPHET:
                ret = runProphet(this);
                break;
        }
        if (ret === true) {
            return;
        }
        if (ret === undefined && this.me.unit !== SPECS$1.CHURCH && this.me.unit !== SPECS$1.CASTLE) {
            return diffuse(this);
        }
        return ret;
    }
}

function neighbor_score(m, x, y) {
    let count = 0;
    for (let loc of all_neighbors2(m, x, y)) {
        let dist = dis(x, y, loc[0], loc[1]);
        if (dist === 1 && idx(m.visible_map, ...loc) > 0 && idx(m.visible_map, ...loc) !== m.me.id) {
            count++;
        }
    }
    return count;
}

function diffuse(m) {
    if (m.me.unit === SPECS$1.PILGRIM) return;
    let diff = undefined;

    let min_allies = neighbor_score(m, m.me.x, m.me.y);
    for (let opt of open_neighbors(m, m.me.x, m.me.y).filter(opt => !idx(m.karbonite_map, opt[0], opt[1]) && !idx(m.fuel_map, opt[0], opt[1]))) {
        let count = neighbor_score(m, ...opt);
        if (count < min_allies) {
            min_allies = count;
            diff = [opt[0] - m.me.x, opt[1] - m.me.y];
        } else if (count === min_allies) {
            if ((diff === undefined && dis(m.me.x, m.me.y, m.spawn_castle.x, m.spawn_castle.y) < 3) || (diff !== undefined && dis(opt[0], opt[1], m.spawn_castle.x, m.spawn_castle.y) > dis(m.me.x + diff[0], m.me.y + diff[1], m.spawn_castle.x, m.spawn_castle.y))) {
                diff = [opt[0] - m.me.x, opt[1] - m.me.y];
            }
        }
    }
    if (diff !== undefined) {
        m.diffused = true;
        //m.log("DIFFUSING");
        return m.move(...diff);
    }
}

var robot = new MyRobot();

var robot = new MyRobot();
