// Game constants and helpers

export const CITY_BASE_COST = 50_000;
export const CITY_COST_PER_CITY = 50_000; // each additional city costs more

export const MILITARY_COSTS: Record<string, { money: number; steel?: number; gasoline?: number; munitions?: number; aluminum?: number; uranium?: number }> = {
  soldiers: { money: 5 },
  tanks: { money: 60, steel: 0.5, gasoline: 0.25 },
  aircraft: { money: 4000, aluminum: 5, gasoline: 1 },
  ships: { money: 50_000, steel: 10 },
  missiles: { money: 150_000, steel: 10, aluminum: 10, munitions: 100 },
  nukes: { money: 1_750_000, uranium: 250, steel: 25, aluminum: 25 },
};

export const INFRA_COST = 300; // per unit
export const LAND_COST = 50;   // per unit

// Score formula
export function calcNationScore(cityCount: number, infra: number, military: {
  soldiers: number; tanks: number; aircraft: number; ships: number; missiles: number; nukes: number;
}): number {
  const cityScore = cityCount * 100;
  const infraScore = infra * 0.1;
  const milScore =
    military.soldiers * 0.0005 +
    military.tanks * 0.01 +
    military.aircraft * 0.5 +
    military.ships * 2 +
    military.missiles * 5 +
    military.nukes * 100;
  return Math.round((cityScore + infraScore + milScore) * 100) / 100;
}

// Tax income formula — based on cities and infrastructure
export function calcTaxIncome(cities: { infrastructure: number; commerce: number }[], taxRate: number): number {
  let income = 0;
  for (const city of cities) {
    const baseIncome = city.infrastructure * 2;
    const commerceBonus = city.commerce * 300;
    income += (baseIncome + commerceBonus) * (taxRate / 100);
  }
  return Math.round(income * 100) / 100;
}

// Population per city
export function calcCityPopulation(infra: number): number {
  return Math.round(infra * 100);
}

// War attack simulator
export type AttackType = "ground" | "airstrike" | "naval" | "missile" | "nuke";
export type Outcome = "pyrrhic_victory" | "moderate_success" | "immense_triumph" | "utter_failure";

export function simulateAttack(
  type: AttackType,
  attackerMil: { soldiers: number; tanks: number; aircraft: number; ships: number; missiles: number; nukes: number },
  defenderMil: { soldiers: number; tanks: number; aircraft: number; ships: number; missiles: number; nukes: number },
  defenderInfra: number,
): {
  outcome: Outcome;
  attackerCasualties: number;
  defenderCasualties: number;
  infraDestroyed: number;
  moneyLooted: number;
  warScore: number;
} {
  const rand = Math.random();

  let attackStrength = 0;
  let defenseStrength = 0;
  let attackerCasualties = 0;
  let defenderCasualties = 0;
  let infraDestroyed = 0;
  let moneyLooted = 0;

  if (type === "ground") {
    attackStrength = attackerMil.soldiers * 1.0 + attackerMil.tanks * 40;
    defenseStrength = defenderMil.soldiers * 1.5 + defenderMil.tanks * 50 + defenderMil.aircraft * 20;
  } else if (type === "airstrike") {
    attackStrength = attackerMil.aircraft * 100;
    defenseStrength = defenderMil.aircraft * 75;
  } else if (type === "naval") {
    attackStrength = attackerMil.ships * 1000;
    defenseStrength = defenderMil.ships * 1200;
  } else if (type === "missile") {
    attackStrength = attackerMil.missiles * 2000;
    defenseStrength = 500;
  } else if (type === "nuke") {
    attackStrength = attackerMil.nukes * 100_000;
    defenseStrength = 0;
  }

  const ratio = attackStrength / Math.max(defenseStrength, 1);
  let outcome: Outcome;

  if (rand < 0.1) {
    outcome = "utter_failure";
  } else if (ratio >= 2.5) {
    outcome = rand < 0.6 ? "immense_triumph" : "moderate_success";
  } else if (ratio >= 1.0) {
    outcome = rand < 0.5 ? "moderate_success" : "pyrrhic_victory";
  } else {
    outcome = rand < 0.3 ? "pyrrhic_victory" : "utter_failure";
  }

  const multipliers: Record<Outcome, { infra: number; warScore: number; attCas: number; defCas: number }> = {
    immense_triumph:  { infra: 0.08, warScore: 4.0, attCas: 0.02, defCas: 0.05 },
    moderate_success: { infra: 0.05, warScore: 2.5, attCas: 0.03, defCas: 0.04 },
    pyrrhic_victory:  { infra: 0.02, warScore: 1.0, attCas: 0.05, defCas: 0.02 },
    utter_failure:    { infra: 0.00, warScore: 0.0, attCas: 0.06, defCas: 0.01 },
  };

  const m = multipliers[outcome];

  if (type === "ground") {
    attackerCasualties = Math.floor((attackerMil.soldiers * m.attCas) + (attackerMil.tanks * m.attCas * 2));
    defenderCasualties = Math.floor((defenderMil.soldiers * m.defCas) + (defenderMil.tanks * m.defCas * 2));
    moneyLooted = outcome === "utter_failure" ? 0 : Math.floor(Math.random() * 2000 * m.warScore);
  } else if (type === "airstrike") {
    attackerCasualties = Math.floor(attackerMil.aircraft * m.attCas * 0.5);
    defenderCasualties = Math.floor(defenderMil.aircraft * m.defCas * 0.5);
  } else if (type === "naval") {
    attackerCasualties = Math.floor(attackerMil.ships * m.attCas * 0.1);
    defenderCasualties = Math.floor(defenderMil.ships * m.defCas * 0.1);
  } else if (type === "missile") {
    defenderCasualties = Math.floor(defenderMil.soldiers * 0.03);
  } else if (type === "nuke") {
    defenderCasualties = Math.floor(defenderMil.soldiers * 0.25 + defenderMil.tanks * 5);
    infraDestroyed = Math.min(defenderInfra * 0.5, 2000);
    m.infra = 0;
  }

  infraDestroyed += Math.floor(defenderInfra * m.infra);

  return {
    outcome,
    attackerCasualties,
    defenderCasualties,
    infraDestroyed,
    moneyLooted,
    warScore: m.warScore,
  };
}
