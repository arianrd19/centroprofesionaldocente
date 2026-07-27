// CENPROD — datos de demostración
// Helper para imágenes Unsplash (parámetros consistentes)
const U = (id, w=900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const CENPROD_DATA = {
  imgs: {
    heroPrincipal:  U('1577896851231-70ef18881754', 1100), // docente con niños en aula
    heroSecondary:  U('1497486751825-1233686d5d80', 700),  // notas
    aula:           U('1610484826967-09c5720778c7', 1100), // clase online
    equipo:         U('1517048676732-d65bc937f952', 1100), // reunión grupo
    libros:         U('1532619675605-1ede6c2ed2b0', 800),
    graduacion:    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1100&q=80',
    docenteApuntando: U('1571260899304-425eee4c7efc', 900),
    eventoLima:     U('1540575467063-178a50c2df87', 1100), // conferencia
    eventoAreq:     U('1559223607-a43c990c692c', 900),     // graduación grupo
    laptop:         U('1503676260728-1c00da094a0b', 900),  // niño leyendo laptop
    docenteFeliz:   U('1580894894513-541e068a3e2b', 900),
    estudiante:     U('1523240795612-9a054b0db644', 900),
    docenteMujer:   U('1580582932707-520aed937b7b', 900),
    tips:           U('1456513080510-7bf3a84b82f8', 900),  // biblioteca/libros
    cronograma:     U('1506784983877-45594efa4cbe', 900),  // calendario
  },

  categorias: [
    { id: 'nombramiento', nombre: 'Nombramiento', subtitulo: 'Prepárate para el concurso de nombramiento docente', icon: 'seal', cursos: 18 },
    { id: 'ascenso',      nombre: 'Ascenso de Escala', subtitulo: 'Sube de nivel en la Carrera Pública Magisterial', icon: 'ladder', cursos: 14 },
    { id: 'directivos',   nombre: 'Cargos Directivos', subtitulo: 'Director, subdirector y especialistas UGEL', icon: 'crown', cursos: 9 },
    { id: 'certificados', nombre: 'Certificados', subtitulo: 'Cursos cortos con certificado descargable', icon: 'scroll', cursos: 38 },
  ],

  productos: [
    // NOMBRAMIENTO
    { id:'n-01', categoria:'nombramiento', area:'primaria', titulo:'Nombramiento Docente — Primaria 2026',
      detalle:'Prueba única + sub-prueba específica · Casos reales del MINEDU',
      precio:159, precioAntes:259, duracion:'140 horas', modulos:9, nivel:'Intermedio',
      destacado:true, cupos:'+ 4,100 docentes inscritos', tag:'Más vendido',
      img: U('1503676260728-1c00da094a0b', 700) },
    { id:'n-02', categoria:'nombramiento', area:'inicial', titulo:'Nombramiento Docente — Inicial 2026',
      detalle:'Currículo de inicial + acompañamiento socioemocional',
      precio:159, precioAntes:259, duracion:'140 horas', modulos:9, nivel:'Intermedio',
      cupos:'2,860 inscritos',
      img: U('1587653263995-422546a7a569', 700) },
    { id:'n-03', categoria:'nombramiento', area:'cyt', titulo:'Nombramiento — Ciencia y Tecnología',
      detalle:'Secundaria · Indagación científica y experimentación',
      precio:159, duracion:'140 horas', modulos:9, nivel:'Intermedio',
      cupos:'1,420 inscritos',
      img: U('1532094349884-543bc11b234d', 700) },
    { id:'n-04', categoria:'nombramiento', area:'dpcc', titulo:'Nombramiento — DPCC',
      detalle:'Desarrollo Personal, Ciudadanía y Cívica · Secundaria',
      precio:159, duracion:'140 horas', modulos:9, nivel:'Intermedio',
      cupos:'980 inscritos',
      img: U('1577896851231-70ef18881754', 700) },

    // ASCENSO
    { id:'a-01', categoria:'ascenso', area:'primaria', titulo:'Ascenso de Escala Magisterial — Primaria',
      detalle:'Casos prácticos · Simulacros idénticos a la prueba real',
      precio:149, precioAntes:249, duracion:'120 horas', modulos:8, nivel:'Intermedio',
      destacado:true, cupos:'+ 3,200 inscritos', tag:'Recomendado',
      img: U('1571260899304-425eee4c7efc', 700) },
    { id:'a-02', categoria:'ascenso', area:'inicial', titulo:'Ascenso de Escala — Inicial',
      detalle:'Razonamiento + comprensión lectora aplicada a inicial',
      precio:149, duracion:'120 horas', modulos:8, nivel:'Intermedio',
      cupos:'2,140 inscritos',
      img: U('1580582932707-520aed937b7b', 700) },
    { id:'a-03', categoria:'ascenso', area:'comu', titulo:'Ascenso de Escala — Comunicación',
      detalle:'Secundaria · Producción y comprensión de textos',
      precio:149, duracion:'120 horas', modulos:8, nivel:'Intermedio',
      cupos:'1,510 inscritos',
      img: U('1456513080510-7bf3a84b82f8', 700) },

    // CARGOS DIRECTIVOS
    { id:'d-01', categoria:'directivos', area:'gestion', titulo:'Acceso a Cargo Directivo 2026',
      detalle:'Liderazgo pedagógico · Marco del Buen Desempeño Directivo',
      precio:199, precioAntes:299, duracion:'160 horas', modulos:10, nivel:'Avanzado',
      destacado:true, cupos:'910 inscritos', tag:'Nuevo',
      img: U('1517048676732-d65bc937f952', 700) },
    { id:'d-02', categoria:'directivos', area:'gestion', titulo:'Gestión Escolar y Clima Institucional',
      detalle:'Casos reales y simulacros de entrevista directiva',
      precio:99, duracion:'80 horas', modulos:6, nivel:'Intermedio',
      cupos:'620 inscritos',
      img: U('1543269865-cbf427effbad', 700) },

    // CERTIFICADOS
    { id:'c-01', categoria:'certificados', area:'primaria', titulo:'Evaluación Formativa en el Aula',
      detalle:'Certificado de 50 horas pedagógicas',
      precio:49, duracion:'50 horas', modulos:4, nivel:'Básico',
      cupos:'4,100 emitidos',
      img: U('1497486751825-1233686d5d80', 700) },
    { id:'c-02', categoria:'certificados', area:'cyt', titulo:'Herramientas Digitales + IA en clase',
      detalle:'Canva, Genially, Padlet, ChatGPT para docentes',
      precio:59, precioAntes:89, duracion:'60 horas', modulos:5, nivel:'Intermedio',
      cupos:'2,950 emitidos', tag:'Tendencia',
      img: U('1593642632559-0c6d3fc62b89', 700) },
    { id:'c-03', categoria:'certificados', area:'mate', titulo:'Resolución de problemas — Matemática',
      detalle:'Enfoque por competencias · Secundaria',
      precio:49, duracion:'50 horas', modulos:4, nivel:'Básico',
      cupos:'1,820 emitidos',
      img: U('1635070041078-e363dbe005cb', 700) },
  ],

  noticias: [
    { id:'n1', titulo:'Cronograma oficial del Ascenso de Escala 2026 ya está publicado', seccion:'Convocatorias', fecha:'8 May 2026', urgente:true,
      resumen:'El MINEDU confirmó las fechas de inscripción, evaluación y publicación de resultados. Revisa qué documentos necesitas y cómo prepararte desde hoy.',
      img: U('1506784983877-45594efa4cbe', 1100) },
    { id:'n2', titulo:'Cierre de inscripciones en cursos de preparación: 30 de mayo', seccion:'Convocatorias', fecha:'6 May 2026',
      resumen:'Quedan pocas plazas en los programas de ascenso y nombramiento. Los docentes inscritos reciben acceso inmediato al aula y tutor por WhatsApp.',
      img: U('1571260899304-425eee4c7efc', 900) },
    { id:'n3', titulo:'Encuentro nacional de docentes CENPROD — Lima 2026', seccion:'Comunidad', fecha:'2 May 2026',
      resumen:'Más de 120 docentes participaron en el encuentro de cierre de ciclo. Compartimos testimonios, networking y momentos del evento.',
      img: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1100&q=80' },
    { id:'n4', titulo:'Simulacro nacional en vivo — junio 2026', seccion:'Convocatorias', fecha:'28 Abr 2026',
      resumen:'Inscripciones abiertas para el simulacro gratuito con corrección personalizada. Cupos limitados para docentes de todas las regiones.',
      img: U('1517048676732-d65bc937f952', 900) },
    { id:'n5', titulo:'5 técnicas para resolver casos pedagógicos dentro del tiempo', seccion:'Formación', fecha:'24 Abr 2026',
      resumen:'Estrategias para leer el enunciado, identificar competencias y redactar respuestas completas en la prueba de ascenso o nombramiento.',
      img: U('1456513080510-7bf3a84b82f8', 700) },
    { id:'n6', titulo:'Docentes de Arequipa completan primer ciclo de ascenso', seccion:'Comunidad', fecha:'18 Abr 2026',
      resumen:'La delegación sur compartió resultados del primer módulo y preparación para la convocatoria 2026 en modalidad virtual.',
      img: U('1540575467063-178a50c2df87', 700) },
    { id:'n7', titulo:'Guía: cómo armar tu portafolio docente paso a paso', seccion:'Formación', fecha:'10 Abr 2026',
      resumen:'Checklist de evidencias, formatos recomendados y errores frecuentes al presentar portafolio en ascenso o nombramiento.',
      img: U('1497486751825-1233686d5d80', 700) },
  ],

  /** @deprecated usar noticias */
  get blog() { return this.noticias; },

  nosotros: {
    timeline: [
      { year: '2025', titulo: 'Nace CENPROD', texto: 'Lanzamos la plataforma virtual con cursos de ascenso, nombramiento y certificaciones descargables.' },
      { year: '2025', titulo: 'Primera promoción', texto: 'Docentes de Lima, Arequipa y Piura completan sus primeros programas con tutoría por WhatsApp.' },
      { year: '2026', titulo: 'Convocatoria Ascenso', texto: 'Ampliamos el catálogo para la convocatoria 2026 con simulacros y materiales auditados.' },
      { year: '2026', titulo: '+500 docentes', texto: 'Alcanzamos más de 500 docentes capacitados en modalidad 100% virtual en todo el Perú.' },
    ],
    faqContacto: [
      { q: '¿Cuánto tardan en responder?', a: 'Por WhatsApp respondemos en minutos en horario hábil. Por formulario, en menos de 1 hora de lunes a sábado.' },
      { q: '¿Los cursos son 100% virtuales?', a: 'Sí. Accedes desde cualquier región del Perú con tutoría personalizada por WhatsApp.' },
      { q: '¿Puedo verificar mi certificado?', a: 'Sí. Cada certificado tiene un código único que puedes validar en la sección Verificar certificado.' },
    ],
  },

  contacto: {
    whatsapp: '+51 987 654 321',
    whatsappLink: 'https://wa.me/51987654321?text=Hola%20CENPROD%2C%20quiero%20información%20sobre%20sus%20cursos',
    email: 'asesoria@cenprod.pe',
    horario: 'Lun – Sáb · 8:00 am – 8:00 pm',
    modalidad: 'Atención 100% virtual · Todo el Perú',
  },

  testimonios: [
    { nombre:'Rosa M.', cargo:'Docente primaria · Cusco', escala:'Ascendió a IV escala',
      foto: U('1544005313-94ddf0286df2', 200),
      texto:'Llevaba dos intentos sin lograr el ascenso. Con CENPROD el material está ordenado por temas y los simulacros son idénticos a la prueba real. Esta vez sí pasé.' },
    { nombre:'Luis A.', cargo:'Subdirector · Trujillo', escala:'Cargo Directivo 2025',
      foto: U('1507003211169-0a1dd7228f2d', 200),
      texto:'Lo mejor fue el acompañamiento del tutor por WhatsApp. Tenía dudas a las 10 pm y siempre había respuesta. Eso marca la diferencia cuando trabajas todo el día.' },
    { nombre:'Carmen V.', cargo:'Docente secundaria · Piura', escala:'Diplomada en Tutoría',
      foto: U('1573496359142-b8d87734a5a2', 200),
      texto:'A mis 48 años pensé que iba a costarme la modalidad virtual. La plataforma es muy clara y me siento orgullosa del diploma universitario.' },
  ],

  certificadosDemo: [
    { codigo:'CPD-2025-04812', nombre:'María Fernanda Quispe Ramos', curso:'Diplomado en Tutoría y Orientación Educativa', horas:480, emision:'12 Mar 2026', estado:'Vigente' },
    { codigo:'CPD-2024-02199', nombre:'Jorge Alberto Mendoza León',  curso:'Evaluación Formativa en el Aula',                 horas:50,  emision:'08 Nov 2024', estado:'Vigente' },
  ],

  stats: [
    { numero: '+500', etiqueta: 'docentes capacitados' },
    { numero: '+1', etiqueta: 'año enseñando' },
    { numero: '+80%', etiqueta: 'satisfacción promedio' },
    { numero: 'Todo el', etiqueta: 'Perú · modalidad virtual' },
  ],

};
