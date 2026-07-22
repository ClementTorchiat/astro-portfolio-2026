import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const galleryCollection = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/galleryCollection" }),
    schema: ({ image }) => z.object({
        title: z.string(),
        subtitle: z.string(),
        coverImage: image(),
    }),
});

const projetsCollection = defineCollection({
    loader: glob({ pattern: "**/*.mdx", base: "./src/content/projets" }),
    schema: ({ image }) => z.object({
        order: z.number(),
        title: z.string(),
        description: z.string(),
        tags: z.array(z.string()),
        coverImage: image(),
        clientName: z.string(),
        clientCompany: z.string(),
        year: z.number(),
    }),
});

export const collections = {
    'galleryCollection': galleryCollection,
    'projets': projetsCollection,
};