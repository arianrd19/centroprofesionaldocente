import { SITE, PAGE_SEO, canonicalUrl } from './seoConfig.js'

function setMeta(selector, attr, value) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    const match = selector.match(/\[(\w+)="([^"]+)"\]/)
    if (match) el.setAttribute(match[1], match[2])
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

function setLink(rel, href) {
  if (!href) return
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function removeCanonical() {
  document.head.querySelector('link[rel="canonical"]')?.remove()
}

function injectJsonLd(id, data) {
  const old = document.getElementById(id)
  if (old) old.remove()
  if (!data) return
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.id = id
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

function injectBreadcrumb(items) {
  if (!items?.length) {
    injectJsonLd('ld-breadcrumb', null)
    return
  }
  injectJsonLd('ld-breadcrumb', {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  })
}

function injectWebPage(pageId, cfg, url) {
  injectJsonLd('ld-webpage', {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: cfg.title,
    description: cfg.description,
    url,
    inLanguage: SITE.lang,
    isPartOf: { '@type': 'WebSite', name: SITE.shortName, url: SITE.url },
  })
}

export function applyPageSEO(pageId) {
  const cfg = PAGE_SEO[pageId] || PAGE_SEO.inicio
  const canonical = canonicalUrl(pageId)

  document.title = cfg.title
  document.documentElement.lang = SITE.lang

  setMeta('meta[name="description"]', 'content', cfg.description)
  if (cfg.keywords) setMeta('meta[name="keywords"]', 'content', cfg.keywords)
  setMeta('meta[name="robots"]', 'content', cfg.robots || 'index, follow')

  if (canonical) setLink('canonical', canonical)
  else removeCanonical()

  setMeta('meta[property="og:site_name"]', 'content', SITE.shortName)
  setMeta('meta[property="og:locale"]', 'content', SITE.locale)
  setMeta('meta[property="og:title"]', 'content', cfg.title)
  setMeta('meta[property="og:description"]', 'content', cfg.description)
  setMeta('meta[property="og:image"]', 'content', SITE.ogImage)
  setMeta('meta[property="og:type"]', 'content', pageId === 'inicio' ? 'website' : 'article')
  if (canonical) setMeta('meta[property="og:url"]', 'content', canonical)

  setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image')
  setMeta('meta[name="twitter:title"]', 'content', cfg.title)
  setMeta('meta[name="twitter:description"]', 'content', cfg.description)
  setMeta('meta[name="twitter:image"]', 'content', SITE.ogImage)

  injectBreadcrumb(cfg.breadcrumb)
  if (canonical) injectWebPage(pageId, cfg, canonical)
  else injectJsonLd('ld-webpage', null)
}
