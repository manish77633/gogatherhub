export type CsvRow = { categoryid: string; name: string; slug: string; description: string; sku: string; label: string; price: string; stock: string; imageurl?: string };
export function parseCsv(input: string): CsvRow[] {
  if (input.length > 80000) throw new Error("CSV is too large");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell.trim()); cell = ""; }
    else if (char === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
    else if (char !== "\r") cell += char;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  if (rows.length < 2 || rows.length > 101) throw new Error("CSV must contain 1 to 100 product rows");
  const headers = rows.shift()!.map(value => value.toLowerCase());
  const required = ["categoryid", "name", "slug", "description", "sku", "label", "price", "stock"];
  if (new Set(headers).size !== headers.length || required.some(header => !headers.includes(header))) throw new Error("CSV header is missing required columns");
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as CsvRow);
}
