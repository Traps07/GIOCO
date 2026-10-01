/**
 * Modalità sopravvivenza: una serie infinita di round da 60 secondi.
 * Ogni round superato ne apre uno più duro; un gol subìto chiude la serie.
 */
import { DIFFICULTIES, type Difficulty } from './engine';
import { NATIONAL_TEAMS, type NationalTeamId } from './teams';

/** Ogni tot round la difficoltà sale di un gradino. */
export const SURVIVAL_DIFF_STEP = 2;
/** Gradini della scala avversari: ogni round si risale di tot posizioni. */
export const SURVIVAL_OPPONENT_STEP = 5;
/** Quante nazionali elite ruotare quando la scala è finita. */
export const SURVIVAL_ELITE_SIZE = 20;

/** Tutte le nazionali ordinate dalla più debole alla più forte. */
export const SURVIVAL_LADDER = [...NATIONAL_TEAMS].sort((a, b) => a.strength - b.strength);

/**
 * Difficoltà del round: si parte da quella scelta nel menu (che quindi fa da
 * "primo gradino") e si sale di un livello ogni SURVIVAL_DIFF_STEP round.
 */
export function survivalDifficulty(round: number, floor: Difficulty): Difficulty {
  const step = Math.floor((Math.max(1, round) - 1) / SURVIVAL_DIFF_STEP);
  const idx = Math.min(DIFFICULTIES.length - 1, Math.max(0, DIFFICULTIES.indexOf(floor)) + step);
  return DIFFICULTIES[idx];
}

/** Avversario del round: si sale la scala di forza, senza ripetizioni immediate. */
export function survivalOpponent(round: number, exclude: NationalTeamId): NationalTeamId {
  const ladder = SURVIVAL_LADDER.filter((team) => team.id !== exclude);
  const step = (Math.max(1, round) - 1) * SURVIVAL_OPPONENT_STEP;
  if (step < ladder.length) return ladder[step].id;
  const elite = ladder.slice(-SURVIVAL_ELITE_SIZE);
  return elite[(round - 1) % elite.length].id;
}
