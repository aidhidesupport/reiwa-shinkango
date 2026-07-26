type TaggedSense = {
  tags: Array<{
    tag: {
      id: string;
      name: string;
      slug?: string;
    };
  }>;
};

export function uniqueTagsFromSenses(senses: TaggedSense[]) {
  const tags = new Map<string, TaggedSense["tags"][number]["tag"]>();
  for (const sense of senses) {
    for (const { tag } of sense.tags) tags.set(tag.id, tag);
  }
  return [...tags.values()];
}
