/**
 * Serialisasi JSON-LD yang aman untuk `dangerouslySetInnerHTML`.
 *
 * `JSON.stringify` tidak meng-escape `<`, jadi nilai yang berisi `</script>`
 * (nama tim Scanlator, judul/deskripsi project) bisa memutus tag <script> dan
 * mengeksekusi HTML/JS sembarang di domain ryukomik.my.id.
 *
 * `\u003c` tetap valid di dalam string JSON (parser JSON-LD mengembalikannya
 * menjadi `<`), tetapi tidak dikenali HTML parser sebagai penutup tag.
 */
export function jsonLdScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
