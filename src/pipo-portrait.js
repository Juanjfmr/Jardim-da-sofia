import { OUTFITS, OUTFIT_COLORS, ACCESSORIES } from './state.js';

let portraitId = 0;
const colorFor = id => (OUTFIT_COLORS.find(c => c.id === id) || OUTFIT_COLORS[0]).hex;
const validOutfit = id => OUTFITS.some(o => o.id === id) ? id : 'none';

function outfitDrawing(id, color) {
  if (id === 'overalls') return `<path d="M47 150Q80 170 113 150L110 179Q80 196 50 179Z" fill="${color}"/>
    <path d="M59 128H68V144H92V128H101V173Q80 186 59 173Z" fill="${color}" stroke="#587f70" stroke-width="1.3"/>
    <circle cx="64" cy="145" r="3.3" fill="#f8da85"/><circle cx="96" cy="145" r="3.3" fill="#f8da85"/>
    <path d="M70 155H90V166Q80 174 70 166Z" fill="#fff7e6"/>
    <path d="M72 157H88" stroke="${color}" stroke-width="3"/>`;
  if (id === 'shirt') return `<path d="M53 127L40 133L45 150L53 146L50 158Q80 169 110 158L107 146L115 150L120 133L107 127Q80 116 53 127Z" fill="${color}" stroke="#587f70" stroke-width="1.3"/>
    <path d="M69 124Q80 134 91 124" stroke="#fff7e6" stroke-width="4" fill="none"/>
    <path d="M88 139H101V148Q94 155 88 148Z" fill="#fff7e6"/>`;
  if (id === 'pajamas') return `<path d="M53 126L41 132L45 151L52 147L50 179Q80 195 110 179L108 147L115 151L120 132L107 126Q80 114 53 126Z" fill="${color}" stroke="#587f70" stroke-width="1.3"/>
    <path d="M67 124L80 133L93 124M80 133V179" fill="none" stroke="#fff7e6" stroke-width="2.5"/>
    <g fill="#f8da85"><circle cx="80" cy="143" r="2.4"/><circle cx="80" cy="153" r="2.4"/><circle cx="80" cy="163" r="2.4"/></g>
    <path d="M61 140a7 7 0 1 0 7 10a6 6 0 0 1-7-10M96 159a6 6 0 1 0 6 9a5 5 0 0 1-6-9" fill="#fff7e6"/>`;
  if (id === 'chef') return `<path d="M66 127Q80 119 94 127" fill="none" stroke="${color}" stroke-width="6"/>
    <path d="M65 129H95L103 153L112 178Q80 195 48 178L57 153Z" fill="#fff7e6" stroke="${color}" stroke-width="3"/>
    <path d="M50 151H110" stroke="${color}" stroke-width="5"/>
    <path d="M68 154H92V169Q80 178 68 169Z" fill="${color}"/>
    <path d="M71 157H89" stroke="#fff7e6" stroke-width="2"/><circle cx="80" cy="137" r="4" fill="#f8da85"/>`;
  return '';
}

function accessoryDrawing(id) {
  if (id === 'flower') return `<g transform="translate(45 72)"><g fill="#ee8ba5"><ellipse cy="-7" rx="5" ry="8"/><ellipse cy="7" rx="5" ry="8"/><ellipse cx="-7" rx="8" ry="5"/><ellipse cx="7" rx="8" ry="5"/></g><circle r="5" fill="#ffc954"/><path d="M4 12q15 0 10 10q-12 0-10-10" fill="#85bc91"/></g>`;
  if (id === 'bow') return `<g transform="translate(110 74) rotate(12)"><path d="M0 0Q-18-16-18 0Q-18 16 0 0Q18-16 18 0Q18 16 0 0" fill="#ee8ba5"/><circle r="5" fill="#d98d9e"/></g>`;
  if (id === 'crown') return `<path d="M56 68L53 46L67 55L80 41L94 55L108 46L105 68Z" fill="#ffc954" stroke="#d6a744" stroke-width="1.5"/><g fill="#ee8ba5"><circle cx="67" cy="61" r="2.5"/><circle cx="93" cy="61" r="2.5"/></g><circle cx="80" cy="60" r="3" fill="#85bc91"/>`;
  if (id === 'hat') return `<path d="M68 66L85 21L101 65Z" fill="#ee8ba5" stroke="#d98d9e" stroke-width="1.5"/><path d="M75 48H95M79 36H91" stroke="#ffc954" stroke-width="4"/><circle cx="85" cy="20" r="5.5" fill="#ffc954"/>`;
  if (id === 'glasses') return `<g stroke="#3b3f52" stroke-width="3" fill="#7cc6e2" fill-opacity=".5"><circle cx="65" cy="87" r="10"/><circle cx="95" cy="87" r="10"/><path d="M75 85Q80 82 85 85M55 84H47M105 84H113" fill="none"/></g>`;
  return '';
}

// Corpo inteiro consistente com o Pipo do jardim, para cozinhar e se vestir.
export function pipoPortrait({ outfit = 'none', outfitColor = 'mint', accessory = 'none', mood = 'idle' } = {}) {
  outfit = validOutfit(outfit);
  mood = ['idle', 'happy', 'eat', 'wait'].includes(mood) ? mood : 'idle';
  accessory = ACCESSORIES.some(a => a.id === accessory) ? accessory : 'none';
  const id = 'pipo-portrait-' + (++portraitId);
  const cream = `url(#${id}-cream)`, pink = `url(#${id}-pink)`;
  const eyes = mood === 'happy'
    ? '<path d="M60 89q6-8 12 0M88 89q6-8 12 0" fill="none" stroke="#42312e" stroke-width="3.4"/>'
    : '<ellipse cx="66" cy="87" rx="6.5" ry="9" fill="#42312e"/><ellipse cx="94" cy="87" rx="6.5" ry="9" fill="#42312e"/><circle cx="64" cy="83.5" r="2.4" fill="#fff"/><circle cx="92" cy="83.5" r="2.4" fill="#fff"/><circle cx="68" cy="91" r="1.1" fill="#fff"/><circle cx="96" cy="91" r="1.1" fill="#fff"/>';
  const armRaise = mood === 'happy' ? 32 : mood === 'eat' ? 20 : 0;
  const sleeveColor = colorFor(outfitColor);
  const leftSleeve = ['shirt', 'pajamas'].includes(outfit) ? `<ellipse cx="47" cy="132" rx="13" ry="13" transform="rotate(17 47 132)" fill="${sleeveColor}"/>` : '';
  const rightSleeve = ['shirt', 'pajamas'].includes(outfit) ? `<ellipse cx="113" cy="129" rx="13" ry="13" transform="rotate(-25 113 129)" fill="${sleeveColor}"/>` : '';
  return `<svg viewBox="0 0 160 212" aria-hidden="true" focusable="false" class="pipo-portrait" data-outfit="${outfit}" data-mood="${mood}">
    <defs><radialGradient id="${id}-cream" cx="38%" cy="32%" r="76%"><stop stop-color="#fffaf0"/><stop offset=".7" stop-color="#fff1d6"/><stop offset="1" stop-color="#efdab6"/></radialGradient><linearGradient id="${id}-pink"><stop stop-color="#f5c1cb"/><stop offset="1" stop-color="#ecacba"/></linearGradient></defs>
    <ellipse cx="80" cy="201" rx="49" ry="7" fill="#a9956f" opacity=".17"/>
    <g class="pipo-portrait-body" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="124" cy="157" r="12" fill="#fff9eb" stroke="#eddbba" stroke-width="1.5"/>
      <ellipse cx="80" cy="147" rx="38" ry="44" fill="${cream}"/><ellipse cx="80" cy="153" rx="26" ry="31" fill="#fff9eb"/>
      <ellipse cx="55" cy="187" rx="23" ry="13" fill="${cream}"/><ellipse cx="105" cy="187" rx="23" ry="13" fill="${cream}"/>
      <ellipse cx="56" cy="190" rx="9" ry="4.5" fill="${pink}"/><ellipse cx="104" cy="190" rx="9" ry="4.5" fill="${pink}"/>
      ${outfitDrawing(outfit, colorFor(outfitColor))}
      <g class="pipo-portrait-arm-left" transform="rotate(${armRaise} 47 128)"><ellipse cx="44" cy="145" rx="13" ry="25" transform="rotate(17 44 145)" fill="${cream}"/>${leftSleeve}<ellipse cx="40" cy="162" rx="5" ry="6" transform="rotate(17 40 162)" fill="${pink}"/></g>
      <g class="pipo-portrait-arm-right" transform="rotate(${-armRaise} 112 126)"><ellipse cx="119" cy="141" rx="13" ry="25" transform="rotate(-25 119 141)" fill="${cream}"/>${rightSleeve}<ellipse cx="126" cy="156" rx="5" ry="6" transform="rotate(-25 126 156)" fill="${pink}"/></g>
      <g class="pipo-portrait-head">
        <g transform="rotate(-13 56 67)"><ellipse cx="56" cy="36" rx="13" ry="33" fill="${cream}"/><ellipse cx="56" cy="36" rx="7" ry="25" fill="${pink}"/></g>
        <g transform="rotate(15 103 66)"><ellipse cx="103" cy="35" rx="13" ry="33" fill="${cream}"/><ellipse cx="103" cy="35" rx="7" ry="25" fill="${pink}"/></g>
        <ellipse cx="80" cy="91" rx="46" ry="37" fill="${cream}"/>
        <ellipse cx="52" cy="101" rx="9" ry="5.5" fill="#f3b7be"/><ellipse cx="108" cy="101" rx="9" ry="5.5" fill="#f3b7be"/>
        <ellipse cx="71" cy="107" rx="12" ry="9" fill="#fff9eb"/><ellipse cx="89" cy="107" rx="12" ry="9" fill="#fff9eb"/>
        ${eyes}<ellipse cx="80" cy="101" rx="4.8" ry="3.2" fill="#d98d9e"/>
        <path d="M80 104v4" stroke="#42312e" stroke-width="2.2" fill="none"/>
        ${mood === 'eat' ? '<ellipse cx="80" cy="112" rx="6" ry="5" fill="#42312e"/><ellipse cx="80" cy="114" rx="4" ry="2" fill="#ecacba"/>' : '<path d="M72 110q4 4 8 0q4 4 8 0" stroke="#42312e" stroke-width="2.2" fill="none"/>'}
        ${mood === 'wait' ? '<path d="M61 74q5-3 10 0M89 74q5-3 10 0" stroke="#a78667" stroke-width="2" fill="none"/>' : ''}
        ${accessoryDrawing(accessory)}
      </g>
    </g>
  </svg>`;
}

export function outfitIcon(id = 'none', color = 'mint') {
  id = validOutfit(id);
  const hex = colorFor(color);
  const pictures = {
    none: '<ellipse cx="34" cy="25" rx="9" ry="20" fill="#fff1d6"/><ellipse cx="62" cy="25" rx="9" ry="20" fill="#fff1d6"/><ellipse cx="34" cy="24" rx="4" ry="13" fill="#ecacba"/><ellipse cx="62" cy="24" rx="4" ry="13" fill="#ecacba"/><ellipse cx="48" cy="60" rx="31" ry="26" fill="#fff1d6"/><ellipse cx="38" cy="57" rx="4" ry="6" fill="#42312e"/><ellipse cx="58" cy="57" rx="4" ry="6" fill="#42312e"/><ellipse cx="48" cy="67" rx="3.5" ry="2.5" fill="#d98d9e"/>',
    overalls: `<path d="M27 14H38V38H58V14H69V62L73 84H52L48 68L44 84H23L27 62Z" fill="${hex}" stroke="#587f70" stroke-width="2.5"/><g fill="#f8da85"><circle cx="33" cy="40" r="4"/><circle cx="63" cy="40" r="4"/></g><path d="M37 48H59V59Q48 69 37 59Z" fill="#fff7e6"/>`,
    shirt: `<path d="M30 17L10 29L21 47L30 42V78H66V42L75 47L86 29L66 17Q48 32 30 17Z" fill="${hex}" stroke="#587f70" stroke-width="2.5"/><path d="M35 20Q48 37 61 20" fill="none" stroke="#fff7e6" stroke-width="4"/><path d="M51 40H62V50Q56 56 51 50Z" fill="#fff7e6"/>`,
    pajamas: `<path d="M31 13L12 26L22 44L31 40V54H65V40L74 44L84 26L65 13L48 25Z" fill="${hex}" stroke="#587f70" stroke-width="2.5"/><path d="M32 58H64L69 85H51L48 69L45 85H27Z" fill="${hex}" stroke="#587f70" stroke-width="2.5"/><path d="M48 25V52" stroke="#fff7e6" stroke-width="2"/><g fill="#f8da85"><circle cx="48" cy="33" r="2.5"/><circle cx="48" cy="44" r="2.5"/></g><path d="M59 28a7 7 0 1 0 6 11a6 6 0 0 1-6-11" fill="#fff7e6"/>`,
    chef: `<path d="M35 26Q48 2 61 26" fill="none" stroke="${hex}" stroke-width="7"/><path d="M33 24H63V41L76 82Q48 95 20 82L33 41Z" fill="#fff7e6" stroke="${hex}" stroke-width="3.5"/><path d="M24 47H72" stroke="${hex}" stroke-width="6"/><path d="M35 54H61V69Q48 81 35 69Z" fill="${hex}"/><circle cx="48" cy="34" r="4" fill="#f8da85"/>`,
  };
  return `<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false" class="outfit-icon" data-outfit="${id}" stroke-linecap="round" stroke-linejoin="round">${pictures[id]}</svg>`;
}
