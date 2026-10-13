/**
 * Personajes del usuario.
 *
 * No hay jerarquía: ninguno es "mejor" que otro, son variantes del mismo
 * avatar. Al subir de nivel te toca otro, y la gracia está en no poder
 * adivinar cuál viene.
 *
 * El recorrido avanza con un paso coprimo con la cantidad de personajes,
 * así cada vuelta pasa por todos sin repetir, y el orden visible no es el
 * de esta lista. Al agregar un personaje, revisar que PASO siga siendo
 * coprimo con CHARACTERS.length (con 6 sirven 1 y 5; con 7, cualquiera
 * entre 1 y 6).
 *
 * Los archivos viven en public/sprites/character-{id}.png, a 64x64 px, así
 * que sólo se muestran a 64, 128 o 192 px. Cualquier otro tamaño los
 * deja borrosos.
 */
export const CHARACTERS = ["classic", "punky", "emo", "vampire", "devil", "dj"] as const;

export type CharacterId = (typeof CHARACTERS)[number];

const PASO = 5;

export function characterForLevel(level: number): CharacterId {
  const i = ((Math.max(1, level) - 1) * PASO) % CHARACTERS.length;
  return CHARACTERS[i];
}
