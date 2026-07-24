import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import type { EvalCase, MathItem } from "./types.js";

export async function loadYamlFile<T>(filePath: string): Promise<T> {
  return parse(await readFile(filePath, "utf8")) as T;
}

export async function loadItems(itemsRoot = path.join(process.cwd(), "content", "items")): Promise<MathItem[]> {
  const languages = await readdir(itemsRoot, { withFileTypes: true });
  const files = languages
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(itemsRoot, entry.name));

  const items: MathItem[] = [];
  for (const directory of files) {
    const itemFiles = await readdir(directory, { withFileTypes: true });
    for (const entry of itemFiles.filter((candidate) => candidate.isFile() && /\.ya?ml$/u.test(candidate.name))) {
      items.push(await loadYamlFile<MathItem>(path.join(directory, entry.name)));
    }
  }
  return items;
}

export async function loadCases(casesPath = path.join(process.cwd(), "cases", "base-cases.yaml")): Promise<EvalCase[]> {
  const document = await loadYamlFile<{ cases: EvalCase[] }>(casesPath);
  return document.cases;
}

export function selectedApprovedItems(items: MathItem[]): MathItem[] {
  return items.filter((item) => item.review_status === "approved" && item.license_status === "clear");
}
