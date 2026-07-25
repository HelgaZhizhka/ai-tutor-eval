export function requireUniqueModels(models: string[], source: string): string[] {
  const duplicates = [...new Set(models.filter((model, index) => models.indexOf(model) !== index))];
  if (duplicates.length > 0) {
    throw new Error(`${source} contains duplicate model IDs: ${duplicates.join(", ")}. Remove duplicates before running an evaluation.`);
  }
  return models;
}
