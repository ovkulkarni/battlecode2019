import { SPECS } from 'battlecode';
export let constants = {
    MIN_FUEL: 1000,
    MIN_KARB: 100,
    FUEL_KARB_RATIO: 0.2,
    FUEL_MIN_DIS: 15,
    KARB_MIN_DIS: 15,
    KSTASH_DISREGARD_PRIORITY: 10,
    HORDE_SIZE: 4,
    ATTACKING_TROOPS: new Set([SPECS.CRUSADER, SPECS.PREACHER])
}

let name_constants = [
    "HORIZONTAL",
    "VERTICAL",
    "FIRST_CHURCH",
    "FIRST_NOT_CHURCH",
    "NOT_FIRST_TURN",
]

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
        "HORDE_INTERMEDIATE"
    ],
]

export let max_task = 0;
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
