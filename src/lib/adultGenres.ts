/**
 * Penanda dewasa seri Project (upload sendiri).
 *
 * SATU-SATUNYA sumber kebenaran: kolom `is_adult` yang diatur lewat toggle
 * 18+ di dashboard Project. Genre (Mature/Ecchi/dll) SENGAJA tidak
 * berpengaruh — keputusan user di dashboard yang menentukan.
 */
export function isAdultProject(item: {
  is_adult?: boolean | null;
}): boolean {
  return item.is_adult === true;
}
