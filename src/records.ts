// What grafical prints, as records (DESIGN.md, "Records over prose"): one line each, a word that names
// the record, then key=value fields, in the logfmt style. The fields are the JSON's,
// under the same names, so the text and --json say the same thing in the same words.

/** A field's value: none is "-", a list is comma separated, a count by name is "name:n". */
export type Value =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly string[]
  | { readonly [k: string]: number | string | undefined };

function text(v: Value): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "string") return v === "" ? "-" : quote(v, /[\s"=]/);
  if (Array.isArray(v)) return v.length === 0 ? "-" : v.map((x) => quote(x, /[\s"=,]/)).join(",");
  // A thing and its number, such as {id: "api", lines: 3}, prints as api:3; counts by
  // name, such as {top: 1, bottom: 2}, as top:1,bottom:2.
  const o = v as { readonly [k: string]: number | string | undefined };
  if (typeof o.id === "string") {
    const rest = Object.entries(o).filter(([k]) => k !== "id");
    return `${quote(o.id, /[\s"=,]/)}:${rest.map(([, x]) => String(x)).join(":")}`;
  }
  const parts = Object.entries(o).filter(([, x]) => x !== undefined);
  return parts.length === 0 ? "-" : parts.map(([k, x]) => `${k}:${String(x)}`).join(",");
}

/**
 * A value with a space, a quote or an equals sign is quoted as JSON quotes it, and so is
 * an item of a list that holds a comma.
 */
function quote(s: string, special: RegExp): string {
  return special.test(s) ? JSON.stringify(s) : s;
}

/** One record: its name, then each field as key=value, in the order given. */
export function record(name: string, fields: { readonly [k: string]: Value }): string {
  const parts = Object.entries(fields).map(([k, v]) => `${k}=${text(v)}`);
  return parts.length === 0 ? name : `${name} ${parts.join(" ")}`;
}
