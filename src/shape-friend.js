let friendId = 0;

// Pipo inteiro, com a mesma paleta e proporções arredondadas do bichinho 3D.
// IDs únicos permitem desenhá-lo mais de uma vez sem misturar os gradientes.
export function shapeFriendSVG() {
  const id = 'shape-pipo-' + (++friendId);
  return `<svg viewBox="0 0 160 212" aria-hidden="true" focusable="false" class="shape-pipo-svg">
    <defs>
      <radialGradient id="${id}-cream" cx="38%" cy="32%" r="76%">
        <stop offset="0" stop-color="#fffaf0"/>
        <stop offset=".7" stop-color="#fff1d6"/>
        <stop offset="1" stop-color="#efdab6"/>
      </radialGradient>
      <linearGradient id="${id}-pink" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#f5c1cb"/>
        <stop offset="1" stop-color="#ecacba"/>
      </linearGradient>
    </defs>
    <ellipse class="shape-pipo-shadow" cx="80" cy="201" rx="49" ry="7" fill="#a9956f" opacity=".17"/>
    <g class="shape-pipo-body" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="124" cy="157" r="12" fill="#fff9eb" stroke="#eddbba" stroke-width="1.5"/>
      <ellipse cx="80" cy="147" rx="38" ry="44" fill="url(#${id}-cream)"/>
      <ellipse cx="80" cy="153" rx="26" ry="31" fill="#fff9eb"/>
      <ellipse cx="55" cy="187" rx="23" ry="13" fill="url(#${id}-cream)"/>
      <ellipse cx="105" cy="187" rx="23" ry="13" fill="url(#${id}-cream)"/>
      <ellipse cx="56" cy="190" rx="9" ry="4.5" fill="url(#${id}-pink)"/>
      <ellipse cx="104" cy="190" rx="9" ry="4.5" fill="url(#${id}-pink)"/>
      <g class="shape-pipo-arm shape-pipo-arm-left">
        <ellipse cx="44" cy="145" rx="13" ry="25" transform="rotate(17 44 145)" fill="url(#${id}-cream)"/>
        <ellipse cx="40" cy="162" rx="5" ry="6" transform="rotate(17 40 162)" fill="url(#${id}-pink)"/>
      </g>
      <g class="shape-pipo-arm shape-pipo-arm-right">
        <ellipse cx="119" cy="141" rx="13" ry="25" transform="rotate(-25 119 141)" fill="url(#${id}-cream)"/>
        <ellipse cx="126" cy="156" rx="5" ry="6" transform="rotate(-25 126 156)" fill="url(#${id}-pink)"/>
      </g>
      <g class="shape-pipo-head">
        <g transform="rotate(-13 56 67)">
          <ellipse cx="56" cy="36" rx="13" ry="33" fill="url(#${id}-cream)"/>
          <ellipse cx="56" cy="36" rx="7" ry="25" fill="url(#${id}-pink)"/>
        </g>
        <g transform="rotate(15 103 66)">
          <ellipse cx="103" cy="35" rx="13" ry="33" fill="url(#${id}-cream)"/>
          <ellipse cx="103" cy="35" rx="7" ry="25" fill="url(#${id}-pink)"/>
        </g>
        <ellipse cx="80" cy="91" rx="46" ry="37" fill="url(#${id}-cream)"/>
        <ellipse cx="52" cy="101" rx="9" ry="5.5" fill="#f3b7be" opacity=".85"/>
        <ellipse cx="108" cy="101" rx="9" ry="5.5" fill="#f3b7be" opacity=".85"/>
        <ellipse cx="71" cy="107" rx="12" ry="9" fill="#fff9eb"/>
        <ellipse cx="89" cy="107" rx="12" ry="9" fill="#fff9eb"/>
        <g class="shape-pipo-eyes">
          <ellipse cx="66" cy="87" rx="6.5" ry="9" fill="#42312e"/>
          <ellipse cx="94" cy="87" rx="6.5" ry="9" fill="#42312e"/>
          <circle cx="64" cy="83.5" r="2.4" fill="#fff"/>
          <circle cx="92" cy="83.5" r="2.4" fill="#fff"/>
          <circle cx="68" cy="91" r="1.1" fill="#fff"/>
          <circle cx="96" cy="91" r="1.1" fill="#fff"/>
        </g>
        <g class="shape-pipo-happy-eyes" fill="none" stroke="#42312e" stroke-width="3.4">
          <path d="M60 89q6-8 12 0M88 89q6-8 12 0"/>
        </g>
        <ellipse cx="80" cy="101" rx="4.8" ry="3.2" fill="#d98d9e"/>
        <path d="M80 104v4M72 110q4 4 8 0q4 4 8 0" stroke="#42312e" stroke-width="2.2" fill="none"/>
      </g>
    </g>
  </svg>`;
}
