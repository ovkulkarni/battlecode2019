export let constants = {
    MIN_FUEL: 1000,
    FUEL_KARB_RATIO: 0.75,
}

export let name_constants = [
    "HORIZONTAL",
    "VERTICAL",
    "GATHER",
    "DEPOSIT",
    "DEFEND",
    "NEUTRAL",
    "ATTACK"
]

for (let i = 0; i < name_constants.length; i++)
    constants[name_constants[i]] = i;