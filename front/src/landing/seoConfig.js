export const SITE = {
  name: 'CENPROD — Centro Profesional Docente',
  shortName: 'CENPROD',
  url: 'https://cenprod.pe',
  ogImage: 'https://cenprod.pe/assets/og-ascenso-2026.jpg',
  locale: 'es_PE',
  lang: 'es',
  twitter: '@cenprod_pe',
}

export const PAGE_SEO = {
  inicio: {
    title: 'CENPROD · Cursos Ascenso de Escala 2026 | Examen 12 de octubre',
    description:
      'Preparación virtual para docentes peruanos: Ascenso de Escala Magisterial 2026, Nombramiento, Cargos Directivos y certificados. +500 docentes capacitados. Tutoría por WhatsApp. Examen: 12 de octubre.',
    keywords:
      'ascenso de escala 2026, ascenso magisterial 2026, MINEDU, curso ascenso docente, nombramiento docente 2026, cargos directivos, CENPROD, examen ascenso 12 octubre',
    robots: 'index, follow',
    breadcrumb: [{ name: 'Inicio', url: SITE.url + '/' }],
  },
  cursos: {
    title: 'Catálogo de Cursos Docentes 2026 · Ascenso, Nombramiento y Directivos | CENPROD',
    description:
      'Cursos virtuales para docentes: Ascenso de Escala 2026, Nombramiento Docente, Cargos Directivos y Certificados descargables. Filtra por tipo, tutoría por WhatsApp y modalidad 100% virtual.',
    keywords:
      'curso ascenso 2026, curso nombramiento docente, cargos directivos 2026, certificados docentes, capacitación docente virtual Perú, CENPROD cursos',
    robots: 'index, follow',
    breadcrumb: [
      { name: 'Inicio', url: SITE.url + '/' },
      { name: 'Cursos', url: SITE.url + '/cursos' },
    ],
  },
  verificar: {
    title: 'Verificar Certificado CENPROD · Validación en línea',
    description:
      'Valida la autenticidad de tu certificado CENPROD con el código único CPD-. Consulta nombre, horas pedagógicas y fecha de emisión en segundos.',
    keywords:
      'verificar certificado docente, certificado CENPROD, código CPD, validar certificado en línea, certificado ascenso docente',
    robots: 'index, follow',
    breadcrumb: [
      { name: 'Inicio', url: SITE.url + '/' },
      { name: 'Verificar certificado', url: SITE.url + '/verificar' },
    ],
  },
  blog: {
    title: 'Noticias Docentes · Convocatorias Ascenso 2026 y MINEDU | CENPROD',
    description:
      'Noticias para docentes peruanos: convocatoria Ascenso 2026, examen 12 de octubre, fechas MINEDU, eventos CENPROD y guías de preparación magisterial.',
    keywords:
      'noticias docentes Perú, convocatoria ascenso 2026, examen ascenso octubre, MINEDU 2026, noticias magisterio',
    robots: 'index, follow',
    breadcrumb: [
      { name: 'Inicio', url: SITE.url + '/' },
      { name: 'Noticias', url: SITE.url + '/blog' },
    ],
  },
  nosotros: {
    title: 'Sobre CENPROD · Centro Profesional Docente | Formación virtual docente',
    description:
      'CENPROD capacita a docentes peruanos en modalidad 100% virtual: ascenso, nombramiento, cargos directivos y certificaciones. +500 docentes, tutoría por WhatsApp y materiales auditados.',
    keywords:
      'CENPROD, centro profesional docente, capacitación docente Perú, formación magisterial virtual, cursos docentes',
    robots: 'index, follow',
    breadcrumb: [
      { name: 'Inicio', url: SITE.url + '/' },
      { name: 'Sobre nosotros', url: SITE.url + '/nosotros' },
    ],
  },
  contacto: {
    title: 'Contacto CENPROD · Asesoría docente por WhatsApp',
    description:
      'Escríbenos por WhatsApp +51 987 654 321 o completa el formulario. Asesoría sobre Ascenso 2026, Nombramiento y Cargos Directivos. Lun – Sáb, 8 am – 8 pm. Todo el Perú.',
    keywords:
      'contacto CENPROD, asesoría docente WhatsApp, consulta ascenso 2026, atención docentes virtual',
    robots: 'index, follow',
    breadcrumb: [
      { name: 'Inicio', url: SITE.url + '/' },
      { name: 'Contacto', url: SITE.url + '/contacto' },
    ],
  },
  certificado: {
    title: 'Consulta de certificado | CENPROD',
    description: 'Resultado de verificación de certificado docente CENPROD.',
    keywords: 'certificado CENPROD, consulta certificado',
    robots: 'noindex, nofollow',
    breadcrumb: [
      { name: 'Inicio', url: SITE.url + '/' },
      { name: 'Verificar certificado', url: SITE.url + '/verificar' },
    ],
  },
  login: {
    title: 'Aula Virtual · Iniciar sesión | CENPROD',
    description: 'Accede al aula virtual CENPROD.',
    robots: 'noindex, nofollow',
    breadcrumb: [{ name: 'Inicio', url: SITE.url + '/' }],
  },
}

export function pageIdFromPathname(pathname) {
  const seg = pathname.replace(/^\//, '').split('/')[0]
  if (!seg) return 'inicio'
  if (seg === 'certificado' || seg === 'consulta') return 'certificado'
  if (seg === 'login' || seg === 'panel' || seg === 'dashboard' || seg === 'pdf') return 'login'
  return PAGE_SEO[seg] ? seg : 'inicio'
}

export function canonicalUrl(pageId) {
  if (pageId === 'inicio') return SITE.url + '/'
  if (pageId === 'certificado' || pageId === 'login') return null
  return `${SITE.url}/${pageId}`
}
