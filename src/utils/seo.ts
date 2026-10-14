export const SITE_URL = 'https://funkie.dev'

/** Link preview image: the desk, 1200x630. */
export const OG_IMAGE = `${SITE_URL}/og.jpg`

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }

export const absoluteUrl = (path: string) => new URL(path, SITE_URL).href

/**
 * Title, description, Open Graph and Twitter card tags. Child routes override
 * a parent's tags with the same name or property, so routes only need to
 * pass what differs.
 */
export const seo = ({
  title,
  description,
  keywords,
  image,
  path,
}: {
  title: string
  description?: string
  keywords?: string
  image?: string
  /** Page path, used for og:url. */
  path?: string
}): MetaTag[] => {
  const tags: MetaTag[] = [
    { title },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'funkie.dev' },
    { property: 'og:title', content: title },
    { name: 'twitter:title', content: title },
  ]
  if (description) {
    tags.push(
      { name: 'description', content: description },
      { property: 'og:description', content: description },
      { name: 'twitter:description', content: description },
    )
  }
  if (keywords) tags.push({ name: 'keywords', content: keywords })
  if (path !== undefined) tags.push({ property: 'og:url', content: absoluteUrl(path) })
  if (image) {
    tags.push(
      { property: 'og:image', content: image },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: image },
    )
  }
  return tags
}

/** `<link rel="canonical">` for a page path. Only set this on leaf routes. */
export const canonical = (path: string) => ({
  rel: 'canonical',
  href: absoluteUrl(path),
})

/** An inline JSON-LD `<script>` for a route's `head().scripts`. */
export const jsonLd = (data: Record<string, unknown>) => ({
  type: 'application/ld+json',
  // `<` is escaped so the JSON can never close the script tag early.
  children: JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(
    /</g,
    '\\u003c',
  ),
})
