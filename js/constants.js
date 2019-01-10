export let constants = {
    MIN_FUEL: 1000,
    MIN_KARB: 200,
    FUEL_KARB_RATIO: 0.75,
}

let name_constants = [
    "HORIZONTAL",
    "VERTICAL",
    "GATHER",
    "DEPOSIT",
    "DEFEND",
    "NEUTRAL"
]

for (let i = 0; i < name_constants.length; i++)
    constants[name_constants[i]] = i;