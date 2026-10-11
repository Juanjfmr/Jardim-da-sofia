// Ícones desenhados à mão (SVG 48×48), coloridos para quem ainda não lê.
const paths = {
  carrot: '<path d="M21 19 9 36c-1 2 1 4 3 3l17-12c6-5-2-13-8-8Z" fill="#ff9952"/><path d="m25 18 1-11m3 12 9-8m-11 8-6-7" stroke="#58a26a" stroke-width="5"/><path d="m16 29 4 3m1-11 5 4" stroke="#e17b31" stroke-width="2"/>',
  bath: '<path d="M6 24h36v4c0 8-7 13-18 13S6 36 6 28Z" fill="#86d4eb"/><path d="M12 41l-2 4m26-4 2 4" stroke="#539cbb" stroke-width="3"/><circle cx="14" cy="20" r="6" fill="#fff" stroke="#bfe6f2" stroke-width="1.5"/><circle cx="25" cy="18" r="8" fill="#fff" stroke="#bfe6f2" stroke-width="1.5"/><circle cx="35" cy="21" r="5" fill="#fff" stroke="#bfe6f2" stroke-width="1.5"/><circle cx="36" cy="9" r="3" fill="#dff4fa" stroke="#9fd6e8" stroke-width="1.5"/>',
  bubbles: '<circle cx="19" cy="27" r="13" fill="#bfe7f5" stroke="#7cc6e2" stroke-width="2.5"/><circle cx="35" cy="15" r="8" fill="#f6d4e4" stroke="#e59dbd" stroke-width="2.5"/><circle cx="37" cy="36" r="5" fill="#fbe7b5" stroke="#efc164" stroke-width="2.5"/><path d="M12 22a8 8 0 0 1 6-6" stroke="#fff" stroke-width="3.5" fill="none"/><circle cx="32" cy="12" r="2" fill="#fff"/>',
  ball: '<circle cx="24" cy="24" r="17" fill="#ffcb63"/><path d="M23 7c-6 13-5 25 1 34M8 19c14 3 25 2 33-4" stroke="#f47d87" stroke-width="7"/><circle cx="17" cy="15" r="4" fill="#fff" opacity=".65"/>',
  moon: '<path d="M29 6c-19 2-25 23-11 32 11 7 22 0 24-9C26 34 18 20 29 6Z" fill="#ffe299"/><path d="m36 8 2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1Z" fill="#ffbf64"/>',
  sun: '<circle cx="24" cy="24" r="10" fill="#ffc94d"/><g stroke="#ffb02e" stroke-width="4"><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M10 38l4-4M34 14l4-4"/></g><circle cx="20" cy="22" r="1.8" fill="#8a5a2b"/><circle cx="28" cy="22" r="1.8" fill="#8a5a2b"/><path d="M20 27q4 3 8 0" stroke="#8a5a2b" stroke-width="2" fill="none"/>',
  games: '<path d="m24 4 5.6 11.8 12.9 1.6-9.5 8.9 2.4 12.8L24 32.8 12.6 39.1 15 26.3 5.5 17.4l12.9-1.6Z" fill="#ffc94d" stroke="#f0a92a" stroke-width="2.5"/><circle cx="19" cy="22" r="2" fill="#8a5a2b"/><circle cx="29" cy="22" r="2" fill="#8a5a2b"/><path d="M20 27q4 3.5 8 0" stroke="#8a5a2b" stroke-width="2.2" fill="none"/>',
  letters: '<rect x="6" y="7" width="23" height="28" rx="7" fill="#ff9ca9"/><rect x="23" y="18" width="20" height="24" rx="6" fill="#bba4ee"/><text x="17" y="29" text-anchor="middle" font-size="23" font-weight="900" font-family="Fredoka, sans-serif" fill="#fff">A</text><text x="33" y="36" text-anchor="middle" font-size="19" font-weight="900" font-family="Fredoka, sans-serif" fill="#fff">B</text>',
  count: '<rect x="4" y="13" width="18" height="28" rx="6" fill="#ffc972"/><rect x="23" y="6" width="21" height="35" rx="6" fill="#88cdb5"/><text x="13" y="34" text-anchor="middle" font-size="23" font-weight="900" font-family="Fredoka, sans-serif" fill="#98613f">1</text><text x="33" y="33" text-anchor="middle" font-size="25" font-weight="900" font-family="Fredoka, sans-serif" fill="#306f61">2</text>',
  flower: '<g fill="#f995b2"><circle cx="24" cy="12" r="8"/><circle cx="35" cy="20" r="8"/><circle cx="31" cy="32" r="8"/><circle cx="17" cy="32" r="8"/><circle cx="13" cy="20" r="8"/></g><circle cx="24" cy="23" r="8" fill="#ffdd79"/>',
  colors: '<circle cx="17" cy="17" r="10" fill="#f0626b"/><circle cx="31" cy="17" r="10" fill="#ffc94d" opacity=".95"/><circle cx="24" cy="30" r="10" fill="#5aaeea" opacity=".95"/>',
  shapes: '<circle cx="14" cy="14" r="9" fill="#f894a4"/><path d="m34 7 11 19H23Z" fill="#ffc966"/><rect x="14" y="28" width="18" height="16" rx="4" fill="#83c1e9"/>',
  music: '<path d="M19 34V12l22-5v22" stroke="#ac8eda" stroke-width="6"/><ellipse cx="12" cy="35" rx="9" ry="6" fill="#ac8eda"/><ellipse cx="34" cy="30" rx="9" ry="6" fill="#f397b2"/>',
  garden: '<path d="M12 27h25l-4 16H16Z" fill="#eda28b"/><path d="M24 29V12" stroke="#52976b" stroke-width="4"/><ellipse cx="16" cy="16" rx="10" ry="6" transform="rotate(28 16 16)" fill="#90bf77"/><ellipse cx="32" cy="11" rx="10" ry="6" transform="rotate(-28 32 11)" fill="#71b78d"/>',
  art: '<rect x="5" y="7" width="35" height="34" rx="8" fill="#ffedcf" stroke="#e4a875" stroke-width="2"/><path d="M10 34Q17 17 30 30L37 23" fill="none" stroke="#8ac3a2" stroke-width="6" stroke-linecap="round"/><circle cx="16" cy="17" r="5" fill="#f291a6"/><path d="m34 5 10 10-19 19-9 2 3-9Z" fill="#8db9e5" stroke="#628dbf" stroke-width="2"/>',
  explore: '<path d="M10 32Q6 20 17 14Q28 8 35 18Q42 29 30 35Q19 42 10 32Z" fill="#d7e9bb" stroke="#6baa86" stroke-width="3"/><circle cx="23" cy="24" r="10" fill="#fff5d7" stroke="#669e88" stroke-width="3"/><path d="m30 31 12 12" stroke="#ae825c" stroke-width="6"/><path d="M20 26q3-7 8 0" fill="none" stroke="#f2b357" stroke-width="3"/>',
  heart: '<path d="M24 39 7 23C-3 10 17 1 24 14 31 1 51 10 41 23Z" fill="#f294a6"/>',
  sound: '<path d="m9 18 9-1 10-9v32L18 31H9Z" fill="#6b8778"/><path d="M34 15c7 5 7 13 0 18m5-24c12 9 12 22 0 30" stroke="#6b8778" stroke-width="3.5" fill="none"/>',
  mute: '<path d="m9 18 9-1 10-9v32L18 31H9Z" fill="#9aa59c"/><path d="m34 18 10 12m0-12L34 30" stroke="#d07b86" stroke-width="4"/>',
  home: '<path d="m6 22 18-15 18 15" stroke="#72836a" stroke-width="5" fill="none"/><path d="M11 20v22h26V20" fill="#f4cc9c"/><path d="M20 42V27h8v15" fill="#a4825f"/>',
  again: '<path d="M37 16A15 15 0 1 0 39 30" stroke="#5f9a74" stroke-width="5.5" fill="none"/><path d="M40 6v12H28" stroke="#5f9a74" stroke-width="5.5" fill="none"/>',
  repeat: '<path d="M35 17c-10-16-31-6-29 8 2 15 22 18 31 6M35 6v12H23" stroke="#6c927d" stroke-width="5" fill="none"/>',
  close: '<path d="m14 14 20 20m0-20L14 34" stroke="#7d887e" stroke-width="5"/>',
  settings: '<path d="M24 6l3 5 6-1 1 6 5 3-3 5 3 5-5 3-1 6-6-1-3 5-3-5-6 1-1-6-5-3 3-5-3-5 5-3 1-6 6 1Z" fill="#a9b8ad"/><circle cx="24" cy="24" r="6.5" fill="#fffaf0"/>',
  lock: '<rect x="10" y="21" width="28" height="21" rx="6" fill="#c9bfa8"/><path d="M16 21v-5a8 8 0 0 1 16 0v5" stroke="#c9bfa8" stroke-width="5" fill="none"/><circle cx="24" cy="31" r="3" fill="#8f856e"/>',
  play: '<path d="M16 9v30l24-15Z" fill="#fff"/>',
  shower: '<path d="M10 10h16a8 8 0 0 1 8 8v2" stroke="#7f9fb0" stroke-width="4" fill="none"/><path d="M24 20h20l-3 6H27Z" fill="#86d4eb"/><g stroke="#5ab8dc" stroke-width="3"><path d="M28 31l-2 5M34 31v6M40 31l2 5M31 40l-1 3M37 40l1 3"/></g>',
};

export function icon(name) {
  return '<svg viewBox="0 0 48 48" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.heart) + '</svg>';
}

let faceId = 0;
// O rosto do Pipo, igual ao modelo 3D: creme, orelhas rosadas e bochechas.
export function pipoFace({ sleeping = false } = {}) {
  const id = 'pf' + (++faceId);
  const eyes = sleeping
    ? '<path d="M40 70q7 6 14 0M66 70q7 6 14 0" stroke="#42312e" stroke-width="3.6" fill="none" stroke-linecap="round"/>'
    : '<ellipse cx="47" cy="68" rx="6.4" ry="9" fill="#42312e"/><ellipse cx="73" cy="68" rx="6.4" ry="9" fill="#42312e"/><circle cx="45" cy="64.5" r="2.4" fill="#fff"/><circle cx="71" cy="64.5" r="2.4" fill="#fff"/><circle cx="49" cy="72" r="1.1" fill="#fff"/><circle cx="75" cy="72" r="1.1" fill="#fff"/>';
  return '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="' + id + '" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="#fffaf0"/><stop offset=".75" stop-color="#fff1d6"/><stop offset="1" stop-color="#f3dfbd"/></radialGradient></defs>'
    + '<g transform="rotate(-12 42 40)"><ellipse cx="42" cy="30" rx="13" ry="29" fill="url(#' + id + ')"/><ellipse cx="42" cy="32" rx="7" ry="22" fill="#ecacba"/></g>'
    + '<g transform="rotate(14 78 40)"><ellipse cx="78" cy="30" rx="13" ry="29" fill="url(#' + id + ')"/><ellipse cx="78" cy="32" rx="7" ry="22" fill="#ecacba"/></g>'
    + '<ellipse cx="60" cy="74" rx="44" ry="37" fill="url(#' + id + ')"/>'
    + '<ellipse cx="33" cy="82" rx="8.5" ry="5.2" fill="#f3b7be" opacity=".85"/><ellipse cx="87" cy="82" rx="8.5" ry="5.2" fill="#f3b7be" opacity=".85"/>'
    + '<ellipse cx="52" cy="86" rx="11" ry="8.5" fill="#fff9eb"/><ellipse cx="68" cy="86" rx="11" ry="8.5" fill="#fff9eb"/>'
    + eyes
    + '<ellipse cx="60" cy="80" rx="4.6" ry="3.2" fill="#d98d9e"/><path d="M60 83v4M52 88q4 4 8 0q4 4 8 0" stroke="#42312e" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
    + '</svg>';
}
