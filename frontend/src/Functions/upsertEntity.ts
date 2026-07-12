export const upsertEntity = <T extends { id: string | number }>(items: T[], entity: T) => {
  const index = items.findIndex((item) => item.id === entity.id);
  if (index === -1) return [entity, ...items];
  return items.map((item) => item.id === entity.id ? entity : item);
};
