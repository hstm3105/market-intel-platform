export type DiscoverableKnowledgeAsset = {
  id: string;
  title: string;
  content: string;
  kind: "insight" | "brief" | "decision_note";
  status: "draft" | "published";
  tags: string[];
};

export type KnowledgeSearchFilters = {
  query?: string;
  tags?: string[];
  kinds?: DiscoverableKnowledgeAsset["kind"][];
  statuses?: DiscoverableKnowledgeAsset["status"][];
};

export function normalizeTag(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

export function normalizeTags(values: string[]) {
  return Array.from(new Set(values.map(normalizeTag).filter(Boolean))).slice(0, 12);
}

export function filterKnowledgeAssets<T extends DiscoverableKnowledgeAsset>(assets: T[], filters: KnowledgeSearchFilters = {}) {
  const query = (filters.query ?? "").trim().toLowerCase();
  const tags = normalizeTags(filters.tags ?? []);
  return assets.filter(asset => {
    const matchesQuery = !query || `${asset.title} ${asset.content} ${asset.tags.join(" ")}`.toLowerCase().includes(query);
    const matchesTags = !tags.length || tags.every(tag => asset.tags.includes(tag));
    const matchesKinds = !filters.kinds?.length || filters.kinds.includes(asset.kind);
    const matchesStatuses = !filters.statuses?.length || filters.statuses.includes(asset.status);
    return matchesQuery && matchesTags && matchesKinds && matchesStatuses;
  });
}

export function tagDirectory<T extends { tags: string[] }>(assets: T[]) {
  const counts = new Map<string, number>();
  assets.forEach(asset => asset.tags.forEach(tag => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
  return Array.from(counts.entries()).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
