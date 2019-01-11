export let constants = {
    MIN_FUEL: 1000,
    FUEL_KARB_RATIO: 0.75,
    FUEL_MIN_DIS: 15,
    KARB_MIN_DIS: 15
}

let name_constants = [
    "HORIZONTAL",
    "VERTICAL",
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
        "NEUTRAL"
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
