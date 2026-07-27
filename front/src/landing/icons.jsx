// CENPROD — Iconos SVG (stroke-based, friendly)
const Icon = ({ name, size = 20, stroke = 'currentColor', strokeWidth = 1.8, style }) => {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', style,
  };
  switch (name) {
    case 'cart':
      return (<svg {...props}><path d="M3 4h2.5l2 12.5a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.5L21.5 8H7"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="18" cy="20.5" r="1.2"/></svg>);
    case 'menu':
      return (<svg {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>);
    case 'arrow-right':
      return (<svg {...props}><path d="M5 12h14M13 6l6 6-6 6"/></svg>);
    case 'arrow-up':
      return (<svg {...props}><path d="M12 19V5M6 11l6-6 6 6"/></svg>);
    case 'check':
      return (<svg {...props}><path d="M4 12.5l5 5L20 6.5"/></svg>);
    case 'check-circle':
      return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>);
    case 'x':
      return (<svg {...props}><path d="M6 6l12 12M18 6L6 18"/></svg>);
    case 'search':
      return (<svg {...props}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>);
    case 'play':
      return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z" fill={stroke}/></svg>);
    case 'clock':
      return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
    case 'book':
      return (<svg {...props}><path d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2V5z"/><path d="M20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2V5z"/></svg>);
    case 'seal':
      return (<svg {...props}><path d="M12 3l2.4 1.7 2.9-.3 1 2.8 2.5 1.5-.7 2.9 1.4 2.6-2 2.2.1 3-2.9.7-1.6 2.5-2.7-1.1-2.9 1.1-1.6-2.5-2.9-.7.1-3-2-2.2 1.4-2.6L1.7 8.2l2.5-1.5 1-2.8 2.9.3z" transform="translate(-.5 .5) scale(.92)" /><path d="M9 12.5l2 2 4-4.5"/></svg>);
    case 'scroll':
      return (<svg {...props}><path d="M5 4h11a3 3 0 0 1 3 3v10a3 3 0 0 0 3 3H9a3 3 0 0 1-3-3V7a3 3 0 0 0-3-3z"/><path d="M9 9h7M9 13h7"/></svg>);
    case 'crown':
      return (<svg {...props}><path d="M3 8l3 9h12l3-9-5 4-4-7-4 7z"/><path d="M3 20h18"/></svg>);
    case 'ladder':
      return (<svg {...props}><path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8"/></svg>);
    case 'whatsapp':
      // Glifo de WhatsApp — burbuja con auricular telefónico
      return (<svg width={size} height={size} viewBox="0 0 32 32" fill={stroke} style={style} aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" d="M16.06 4C9.4 4 4 9.4 4 16.06c0 2.12.55 4.18 1.6 6L4 28l6.07-1.59a12.06 12.06 0 0 0 5.99 1.53h.01c6.66 0 12.06-5.4 12.06-12.06A12.06 12.06 0 0 0 16.06 4Zm0 22.07h-.01a10 10 0 0 1-5.1-1.39l-.36-.22-3.6.94.96-3.5-.24-.37a10.03 10.03 0 1 1 8.36 4.54Zm5.5-7.49c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.22-.65.07a8.2 8.2 0 0 1-4.05-3.54c-.3-.52.3-.48.86-1.6.1-.2.05-.37-.02-.52l-.93-2.24c-.24-.59-.49-.5-.68-.51l-.58-.01a1.1 1.1 0 0 0-.8.38c-.27.3-1.06 1.04-1.06 2.53s1.09 2.94 1.24 3.14c.15.2 2.15 3.29 5.22 4.6.73.32 1.3.5 1.74.65.73.23 1.4.2 1.92.12.58-.09 1.78-.73 2.04-1.43.25-.7.25-1.3.17-1.43-.07-.13-.27-.2-.57-.35Z"/></svg>);
    case 'facebook':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill={stroke} style={style} aria-hidden="true"><path d="M13.5 21.95V13.5h2.84l.42-3.3H13.5V8.1c0-.95.27-1.6 1.63-1.6h1.74V3.55a23.4 23.4 0 0 0-2.53-.13c-2.5 0-4.22 1.53-4.22 4.34v2.42H7.27v3.3h2.86v8.47a10 10 0 1 0 3.37 0Z"/></svg>);
    case 'instagram':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.7} strokeLinecap="round" style={style} aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.5"/><circle cx="12" cy="12" r="4"/><circle cx="17.6" cy="6.4" r=".9" fill={stroke} stroke="none"/></svg>);
    case 'youtube':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill={stroke} style={style} aria-hidden="true"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33ZM9.75 15.02V8.48l5.75 3.27-5.75 3.27Z"/></svg>);
    case 'tiktok':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill={stroke} style={style} aria-hidden="true"><path d="M16.6 5.82a4.28 4.28 0 0 1-1.05-2.82h-3.3v12.4a2.6 2.6 0 0 1-2.6 2.6 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 2.6-2.6c.27 0 .53.05.78.13V9.5a5.97 5.97 0 0 0-.78-.05A5.96 5.96 0 0 0 3.7 15.4a5.96 5.96 0 0 0 5.95 5.95 5.96 5.96 0 0 0 5.95-5.95V9.16a7.55 7.55 0 0 0 4.4 1.4V7.28a4.32 4.32 0 0 1-3.4-1.46Z"/></svg>);
    case 'mail':
      return (<svg {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>);
    case 'phone':
      return (<svg {...props}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>);
    case 'pin':
      return (<svg {...props}><path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>);
    case 'star':
      return (<svg {...props}><path d="M12 3l2.7 5.7 6.3.9-4.5 4.4 1 6.2-5.5-3-5.5 3 1-6.2L3 9.6l6.3-.9z" fill={stroke} opacity=".95" stroke="none"/></svg>);
    case 'shield':
      return (<svg {...props}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z"/><path d="M9 12.5l2 2 4-4"/></svg>);
    case 'sparkle':
      return (<svg {...props}><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.5 5.5l4 4M14.5 14.5l4 4M18.5 5.5l-4 4M9.5 14.5l-4 4"/></svg>);
    case 'download':
      return (<svg {...props}><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>);
    case 'graduation':
      return (<svg {...props}><path d="M2 9l10-4 10 4-10 4z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/></svg>);
    case 'users':
      return (<svg {...props}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.8"/><path d="M16 14a5.5 5.5 0 0 1 5.5 5.5"/></svg>);
    case 'plus':
      return (<svg {...props}><path d="M12 5v14M5 12h14"/></svg>);
    case 'minus':
      return (<svg {...props}><path d="M5 12h14"/></svg>);
    case 'classroom':
      return (<svg {...props}><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 9h7M7 12h5"/></svg>);
    case 'laptop':
      return (<svg {...props}><rect x="3.5" y="5.5" width="17" height="10" rx="2"/><path d="M2.5 18.5h19"/></svg>);
    case 'calendar':
      return (<svg {...props}><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>);
    case 'chevron-down':
      return (<svg {...props}><path d="M6 9l6 6 6-6"/></svg>);
    case 'chevron-up':
      return (<svg {...props}><path d="M18 15l-6-6-6 6"/></svg>);
    case 'image':
      return (<svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 19l5-5 4 4 3-3 5 5"/></svg>);
    default:
      return null;
  }
};

export default Icon;
