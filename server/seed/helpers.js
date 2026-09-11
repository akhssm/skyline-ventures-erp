// Small random helpers shared by the seed stages.

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const between = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const chance = (percent) => Math.random() * 100 < percent;

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const daysAhead = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

// Indian mobile numbers that cannot collide with the seeded staff numbers.
const randomPhone = () => `${pick([6, 7, 8, 9])}${between(100000000, 999999999)}`;

const log = (message) => console.log(`  ${message}`);

module.exports = { pick, between, chance, daysAgo, daysAhead, randomPhone, log };
