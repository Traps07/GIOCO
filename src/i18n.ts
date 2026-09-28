export type Language = 'it' | 'en' | 'de' | 'fr' | 'es' | 'ar';

export interface LangInfo {
  id: Language;
  name: string; // nome nativo
  flag: string;
}

export const LANGUAGES: LangInfo[] = [
  { id: 'it', name: 'Italiano', flag: '🇮🇹' },
  { id: 'en', name: 'English', flag: '🇬🇧' },
  { id: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { id: 'fr', name: 'Français', flag: '🇫🇷' },
  { id: 'es', name: 'Español', flag: '🇪🇸' },
  { id: 'ar', name: 'العربية', flag: '🇸🇦' },
];

export interface Strings {
  language: string;
  // menu
  badgeMatch: string;
  badgePens: string;
  tagA: string;
  tagBlu: string;
  tagB: string;
  tagRossa: string;
  tagC: string;
  featGolden: string;
  featPens: string;
  modeMatch: string;
  modeMatchDesc: string;
  modePens: string;
  modePensDesc: string;
  diffEasy: string;
  diffEasyDesc: string;
  diffNormal: string;
  diffNormalDesc: string;
  diffHard: string;
  diffHardDesc: string;
  btnPlay: string;
  btnPlayPens: string;
  menuMove: string;
  menuSprint: string;
  menuShoot: string;
  menuPass: string;
  menuSwitch: string;
  mobileHint: string;
  // modalità giocatori (1 vs IA / 2 locali)
  playersLabel: string;
  opp1P: string;
  opp1PDesc: string;
  opp2P: string;
  opp2PDesc: string;
  player1: string;
  player2: string;
  noDiff2p: string;
  // comandi del secondo giocatore
  menuMove2: string;
  menuSprint2: string;
  menuShoot2: string;
  menuPass2: string;
  menuSwitch2: string;
  mobileHint2p: string;
  // suggerimenti rigori per il secondo giocatore
  hintAimUpDown2: string;
  hintKickPen2: string;
  hintKeeperMove2: string;
  hintDive2: string;
  // HUD
  teamBlue: string;
  teamRed: string;
  kickOff: string;
  badgeGolden: string;
  goal: string;
  goalBlue: string;
  goalRed: string;
  // pannello rigori
  psSeries: string; // contiene {n}
  psSuddenDeath: string;
  psGetReadyShoot: string;
  psGetReadySave: string;
  psAimShoot: string;
  psSaveNow: string;
  psYourShot: string;
  psTheirShot: string;
  // suggerimenti tasti (barra in basso)
  kMove: string;
  kSprint: string;
  kShoot: string;
  kPass: string;
  kSwitch: string;
  kPause: string;
  hintAimUpDown: string;
  hintKickPen: string;
  hintKeeperMove: string;
  hintDive: string;
  // banner eventi
  extraTimeTitle: string;
  extraTimeSub: string;
  pensTitle: string;
  pensSub: string;
  saveTitle: string;
  saveSub: string;
  postTitle: string;
  postSub: string;
  missTitle: string;
  missSub: string;
  // pausa
  pauseTitle: string;
  pauseSub: string;
  btnResume: string;
  btnRestart: string;
  btnMenu: string;
  // fine partita
  win: string;
  draw: string;
  lose: string;
  decGolden: string;
  decPens: string;
  pensOnlyTitle: string;
  pensScoreLabel: string;
  shots: string;
  btnRematch: string;
  // touch
  touchMove: string;
}

const it: Strings = {
  language: 'LINGUA',
  badgeMatch: 'PARTITA LAMPO · 90 SECONDI',
  badgePens: 'SERIE DI RIGORI · MORTE SUBITA',
  tagA: 'Tre contro tre, ritmo altissimo. Guida la squadra ',
  tagBlu: 'BLU',
  tagB: ', dribbla, passa e trafigli la ',
  tagRossa: 'ROSSA',
  tagC: ' prima che scada il tempo.',
  featGolden: 'Pareggio? Supplementari con golden goal',
  featPens: 'Ancora pari? Calci di rigore!',
  modeMatch: 'PARTITA 90s',
  modeMatchDesc: 'poi supplementari e rigori',
  modePens: 'SOLO RIGORI',
  modePensDesc: 'dritto al dischetto',
  diffEasy: 'FACILE',
  diffEasyDesc: 'avversari rilassati',
  diffNormal: 'NORMALE',
  diffNormalDesc: 'partita equilibrata',
  diffHard: 'DIFFICILE',
  diffHardDesc: 'pressing feroce',
  btnPlay: 'GIOCA ORA',
  btnPlayPens: 'BATTILO DAL DISCHETTO',
  menuMove: 'movimento',
  menuSprint: 'scatto',
  menuShoot: 'tiro',
  menuPass: 'passaggio',
  menuSwitch: 'cambia giocatore',
  mobileHint: 'Su mobile: joystick a sinistra, pulsanti a destra',
  playersLabel: 'GIOCATORI',
  opp1P: '1 GIOCATORE',
  opp1PDesc: 'contro la IA',
  opp2P: '2 GIOCATORI',
  opp2PDesc: 'locale, stesso campo',
  player1: 'GIOCATORE 1',
  player2: 'GIOCATORE 2',
  noDiff2p: 'In 2 giocatori la difficoltà non si applica.',
  menuMove2: 'movimento (I J K L)',
  menuSprint2: 'scatto (Shift dx)',
  menuShoot2: 'tiro (Invio)',
  menuPass2: 'passaggio (M)',
  menuSwitch2: 'cambia giocatore (,)',
  mobileHint2p: 'Su mobile: metà sinistra P1, metà destra P2',
  hintAimUpDown2: 'mira dentro la porta',
  hintKickPen2: 'calcia il rigore',
  hintKeeperMove2: 'muovi il guantone',
  hintDive2: 'tuffati in quella direzione',

  teamBlue: 'BLU',
  teamRed: 'ROS',
  kickOff: "CALCIO D'INIZIO",
  badgeGolden: 'SUPPLEMENTARI · GOLDEN GOAL',
  goal: 'GOOOL!',
  goalBlue: 'RETE DELLA SQUADRA BLU',
  goalRed: 'RETE DELLA SQUADRA ROSSA',
  psSeries: 'RIGORI · SERIE {n}',
  psSuddenDeath: 'RIGORI · MORTE SUBITA',
  psGetReadyShoot: 'PREPARATI A TIRARE...',
  psGetReadySave: 'PREPARATI A PARARE...',
  psAimShoot: 'MIRA E CALCIA!',
  psSaveNow: 'PARA IL RIGORE!',
  psYourShot: 'IL TUO TIRO...',
  psTheirShot: 'LA LORO CONCLUSIONE...',
  kMove: 'muoviti',
  kSprint: 'scatto',
  kShoot: 'tiro',
  kPass: 'passaggio',
  kSwitch: 'cambia',
  kPause: 'pausa',
  hintAimUpDown: 'mira dentro la porta',
  hintKickPen: 'calcia il rigore',
  hintKeeperMove: 'muovi il guantone',
  hintDive: 'tuffati in quella direzione',
  extraTimeTitle: 'TEMPI SUPPLEMENTARI',
  extraTimeSub: 'GOLDEN GOAL · CHI SEGNA VINCE',
  pensTitle: 'CALCI DI RIGORE',
  pensSub: 'MEGLIO DI 5 · POI MORTE SUBITA',
  saveTitle: 'PARATA!',
  saveSub: 'IL PORTIERE DICE NO',
  postTitle: 'PALO!',
  postSub: 'CHE BRIVIDO... PALLONE FUORI',
  missTitle: 'FUORI!',
  missSub: 'ERRORE DAL DISCHETTO',
  pauseTitle: 'PAUSA',
  pauseSub: 'Prendi fiato, la partita ti aspetta.',
  btnResume: 'RIPRENDI',
  btnRestart: 'RICOMINCIA',
  btnMenu: 'MENU',
  win: 'VITTORIA!',
  draw: 'PAREGGIO',
  lose: 'SCONFITTA',
  decGolden: 'DECISA DAL GOLDEN GOAL NEI SUPPLEMENTARI',
  decPens: 'DECISA AI CALCI DI RIGORE',
  pensOnlyTitle: 'SERIE DI CALCI DI RIGORE',
  pensScoreLabel: 'RIGORI',
  shots: 'TIRI',
  btnRematch: 'RIVINCITA',
  touchMove: 'MUOVI',
};

const en: Strings = {
  language: 'LANGUAGE',
  badgeMatch: 'LIGHTNING MATCH · 90 SECONDS',
  badgePens: 'PENALTY SHOOTOUT · SUDDEN DEATH',
  tagA: 'Three against three, full throttle. Lead the ',
  tagBlu: 'BLUE',
  tagB: ' team — dribble, pass and put it past the ',
  tagRossa: 'REDS',
  tagC: ' before time runs out.',
  featGolden: 'Draw? Extra time, golden goal',
  featPens: 'Still level? Penalties!',
  modeMatch: 'MATCH 90s',
  modeMatchDesc: 'then extra time & pens',
  modePens: 'PENS ONLY',
  modePensDesc: 'straight to the spot',
  diffEasy: 'EASY',
  diffEasyDesc: 'laid-back rivals',
  diffNormal: 'NORMAL',
  diffNormalDesc: 'evenly matched',
  diffHard: 'HARD',
  diffHardDesc: 'relentless pressing',
  btnPlay: 'PLAY NOW',
  btnPlayPens: 'FROM THE SPOT',
  menuMove: 'movement',
  menuSprint: 'sprint',
  menuShoot: 'shoot',
  menuPass: 'pass',
  menuSwitch: 'switch player',
  mobileHint: 'On mobile: joystick on the left, buttons on the right',
  playersLabel: 'PLAYERS',
  opp1P: '1 PLAYER',
  opp1PDesc: 'vs the AI',
  opp2P: '2 PLAYERS',
  opp2PDesc: 'local, same pitch',
  player1: 'PLAYER 1',
  player2: 'PLAYER 2',
  noDiff2p: 'Difficulty does not apply in 2-player mode.',
  menuMove2: 'move (I J K L)',
  menuSprint2: 'sprint (RShift)',
  menuShoot2: 'shoot (Enter)',
  menuPass2: 'pass (M)',
  menuSwitch2: 'switch player (,)',
  mobileHint2p: 'On mobile: left half P1, right half P2',
  hintAimUpDown2: 'aim inside the goal',
  hintKickPen2: 'take the penalty',
  hintKeeperMove2: 'move the gloves',
  hintDive2: 'dive that way',

  teamBlue: 'BLU',
  teamRed: 'RED',
  kickOff: 'KICK-OFF',
  badgeGolden: 'EXTRA TIME · GOLDEN GOAL',
  goal: 'GOOOAL!',
  goalBlue: 'SCORED BY THE BLUE TEAM',
  goalRed: 'SCORED BY THE RED TEAM',
  psSeries: 'PENS · ROUND {n}',
  psSuddenDeath: 'PENS · SUDDEN DEATH',
  psGetReadyShoot: 'GET READY TO SHOOT...',
  psGetReadySave: 'GET READY TO SAVE...',
  psAimShoot: 'AIM AND STRIKE!',
  psSaveNow: 'SAVE THE PENALTY!',
  psYourShot: 'YOUR SHOT...',
  psTheirShot: 'THEIR SHOT...',
  kMove: 'move',
  kSprint: 'sprint',
  kShoot: 'shoot',
  kPass: 'pass',
  kSwitch: 'switch',
  kPause: 'pause',
  hintAimUpDown: 'aim anywhere in goal',
  hintKickPen: 'take the penalty',
  hintKeeperMove: 'move the glove',
  hintDive: 'dive that way',
  extraTimeTitle: 'EXTRA TIME',
  extraTimeSub: 'GOLDEN GOAL · NEXT GOAL WINS',
  pensTitle: 'PENALTY SHOOTOUT',
  pensSub: 'BEST OF 5 · THEN SUDDEN DEATH',
  saveTitle: 'SAVED!',
  saveSub: 'THE KEEPER SAYS NO',
  postTitle: 'OFF THE POST!',
  postSub: 'SO CLOSE... IT STAYS OUT',
  missTitle: 'WIDE!',
  missSub: 'MISSED FROM THE SPOT',
  pauseTitle: 'PAUSE',
  pauseSub: 'Catch your breath, the match is waiting.',
  btnResume: 'RESUME',
  btnRestart: 'RESTART',
  btnMenu: 'MENU',
  win: 'VICTORY!',
  draw: 'DRAW',
  lose: 'DEFEAT',
  decGolden: 'DECIDED BY A GOLDEN GOAL IN EXTRA TIME',
  decPens: 'DECIDED ON PENALTIES',
  pensOnlyTitle: 'PENALTY SHOOTOUT',
  pensScoreLabel: 'PENS',
  shots: 'SHOTS',
  btnRematch: 'REMATCH',
  touchMove: 'MOVE',
};

const de: Strings = {
  language: 'SPRACHE',
  badgeMatch: 'BLITZSPIEL · 90 SEKUNDEN',
  badgePens: 'ELFMETERSCHIESSEN · SUDDEN DEATH',
  tagA: 'Drei gegen drei, rasantes Tempo. Führe Team ',
  tagBlu: 'BLAU',
  tagB: ' – drbble, passe und überliste Team ',
  tagRossa: 'ROT',
  tagC: ', bevor die Zeit abläuft.',
  featGolden: 'Unentschieden? Verlängerung mit Golden Goal',
  featPens: 'Immer noch Gleichstand? Elfmeterschießen!',
  modeMatch: 'SPIEL 90s',
  modeMatchDesc: 'dann Verlängerung & Elfmeter',
  modePens: 'NUR ELFMETER',
  modePensDesc: 'direkt zum Punkt',
  diffEasy: 'LEICHT',
  diffEasyDesc: 'lockere Gegner',
  diffNormal: 'NORMAL',
  diffNormalDesc: 'ausgeglichenes Spiel',
  diffHard: 'SCHWER',
  diffHardDesc: 'gnadenloses Pressing',
  btnPlay: 'JETZT SPIELEN',
  btnPlayPens: 'VOM PUNKT AUS',
  menuMove: 'bewegen',
  menuSprint: 'sprinten',
  menuShoot: 'schießen',
  menuPass: 'passen',
  menuSwitch: 'spieler wechseln',
  mobileHint: 'Auf dem Handy: Joystick links, Buttons rechts',
  playersLabel: 'SPIELER',
  opp1P: '1 SPIELER',
  opp1PDesc: 'gegen die KI',
  opp2P: '2 SPIELER',
  opp2PDesc: 'lokal, gleicher Platz',
  player1: 'SPIELER 1',
  player2: 'SPIELER 2',
  noDiff2p: 'Im 2-Spieler-Modus gilt keine Schwierigkeit.',
  menuMove2: 'Bewegen (I J K L)',
  menuSprint2: 'Sprint (RShift)',
  menuShoot2: 'Schuss (Enter)',
  menuPass2: 'Pass (M)',
  menuSwitch2: 'Spieler wechseln (,)',
  mobileHint2p: 'Am Handy: linke Hälfte P1, rechte Hälfte P2',
  hintAimUpDown2: 'ins Tor zielen',
  hintKickPen2: 'Elfmeter schießen',
  hintKeeperMove2: 'Handschuhe bewegen',
  hintDive2: 'in diese Richtung tauchen',

  teamBlue: 'BLA',
  teamRed: 'ROT',
  kickOff: 'ANSTOSS',
  badgeGolden: 'VERLÄNGERUNG · GOLDEN GOAL',
  goal: 'TOOOR!',
  goalBlue: 'TOR FÜR TEAM BLAU',
  goalRed: 'TOR FÜR TEAM ROT',
  psSeries: 'ELFMETER · SERIE {n}',
  psSuddenDeath: 'ELFMETER · SUDDEN DEATH',
  psGetReadyShoot: 'MACH DICH BEREIT...',
  psGetReadySave: 'MACH DICH ZUM HALTEN BEREIT...',
  psAimShoot: 'ZIELE UND SCHIESSE!',
  psSaveNow: 'HALTE DEN ELFMETER!',
  psYourShot: 'DEIN SCHUSS...',
  psTheirShot: 'IHR SCHUSS...',
  kMove: 'bewegen',
  kSprint: 'sprint',
  kShoot: 'schuss',
  kPass: 'pass',
  kSwitch: 'wechseln',
  kPause: 'pause',
  hintAimUpDown: 'ins Tor zielen',
  hintKickPen: 'Elfmeter schießen',
  hintKeeperMove: 'Handschuh bewegen',
  hintDive: 'in die Richtung hechten',
  extraTimeTitle: 'VERLÄNGERUNG',
  extraTimeSub: 'GOLDEN GOAL · WER TRIFFT, GEWINNT',
  pensTitle: 'ELFMETERSCHIESSEN',
  pensSub: 'BEST OF 5 · DANN SUDDEN DEATH',
  saveTitle: 'GEHALTEN!',
  saveSub: 'DER KEEPER SAGT NEIN',
  postTitle: 'PFOSTEN!',
  postSub: 'KNAPP... DER BALL BLEIBT DRAUßEN',
  missTitle: 'DANEBEN!',
  missSub: 'FEHLER VOM PUNKT',
  pauseTitle: 'PAUSE',
  pauseSub: 'Kurz durchatmen, das Spiel wartet.',
  btnResume: 'WEITER',
  btnRestart: 'NEU STARTEN',
  btnMenu: 'MENÜ',
  win: 'SIEG!',
  draw: 'UNENTSCHIEDEN',
  lose: 'NIEDERLAGE',
  decGolden: 'ENTSCHEIDEN DURCH GOLDEN GOAL IN DER VERLÄNGERUNG',
  decPens: 'ENTSCHEIDEN IM ELFMETERSCHIESSEN',
  pensOnlyTitle: 'ELFMETERSCHIESSEN',
  pensScoreLabel: 'ELFMETER',
  shots: 'SCHÜSSE',
  btnRematch: 'REVANCHE',
  touchMove: 'BEWEGEN',
};

const fr: Strings = {
  language: 'LANGUE',
  badgeMatch: 'MATCH ÉCLAIR · 90 SECONDES',
  badgePens: 'TIRS AU BUT · MORT SUBITE',
  tagA: 'Trois contre trois, rythme effréné. Mène l’équipe ',
  tagBlu: 'BLEUE',
  tagB: ' : dribble, passe et trompe l’équipe ',
  tagRossa: 'ROUGE',
  tagC: ' avant la fin du temps réglementaire.',
  featGolden: 'Égalité ? Prolongations, but en or',
  featPens: 'Toujours à égalité ? Tirs au but !',
  modeMatch: 'MATCH 90s',
  modeMatchDesc: 'puis prolongations et TAB',
  modePens: 'TIRS AU BUT',
  modePensDesc: 'direct au point de penalty',
  diffEasy: 'FACILE',
  diffEasyDesc: 'adversaires cool',
  diffNormal: 'NORMAL',
  diffNormalDesc: 'match équilibré',
  diffHard: 'DIFFICILE',
  diffHardDesc: 'pressing féroce',
  btnPlay: 'JOUER',
  btnPlayPens: 'AU POINT DE PENALTY',
  menuMove: 'déplacement',
  menuSprint: 'sprint',
  menuShoot: 'tir',
  menuPass: 'passe',
  menuSwitch: 'changer de joueur',
  mobileHint: 'Sur mobile : joystick à gauche, boutons à droite',
  playersLabel: 'JOUEURS',
  opp1P: '1 JOUEUR',
  opp1PDesc: 'contre l’IA',
  opp2P: '2 JOUEURS',
  opp2PDesc: 'local, même terrain',
  player1: 'JOUEUR 1',
  player2: 'JOUEUR 2',
  noDiff2p: 'La difficulté ne s’applique pas en mode 2 joueurs.',
  menuMove2: 'mouvement (I J K L)',
  menuSprint2: 'accélération (Maj droite)',
  menuShoot2: 'tir (Entrée)',
  menuPass2: 'passe (M)',
  menuSwitch2: 'changer de joueur (,)',
  mobileHint2p: 'Sur mobile : moitié gauche P1, moitié droite P2',
  hintAimUpDown2: 'viser dans les buts',
  hintKickPen2: 'tirer le penalty',
  hintKeeperMove2: 'bouger les gants',
  hintDive2: 'plonger de ce côté',

  teamBlue: 'BLE',
  teamRed: 'ROU',
  kickOff: 'COUP D’ENVOI',
  badgeGolden: 'PROLONGATIONS · BUT EN OR',
  goal: 'BUUUT !',
  goalBlue: 'BUT DE L’ÉQUIPE BLEUE',
  goalRed: 'BUT DE L’ÉQUIPE ROUGE',
  psSeries: 'TAB · SÉRIE {n}',
  psSuddenDeath: 'TAB · MORT SUBITE',
  psGetReadyShoot: 'PRÊT À TIRER...',
  psGetReadySave: 'PRÊT À PLONGER...',
  psAimShoot: 'VISE ET FRAPPE !',
  psSaveNow: 'ARRÊTE LE PENALTY !',
  psYourShot: 'TON TIR...',
  psTheirShot: 'LEUR TIR...',
  kMove: 'bouger',
  kSprint: 'sprint',
  kShoot: 'tir',
  kPass: 'passe',
  kSwitch: 'changer',
  kPause: 'pause',
  hintAimUpDown: 'vise dans le but',
  hintKickPen: 'tire le penalty',
  hintKeeperMove: 'déplace le gant',
  hintDive: 'plonge dans cette direction',
  extraTimeTitle: 'PROLONGATIONS',
  extraTimeSub: 'BUT EN OR · LE PROCHAIN BUT GAGNE',
  pensTitle: 'TIRS AU BUT',
  pensSub: 'LE MEILLEUR DE 5 · PUIS MORT SUBITE',
  saveTitle: 'ARRÊT !',
  saveSub: 'LE GARDIEN DIT NON',
  postTitle: 'POTEAU !',
  postSub: 'OUF... LE BALLON RESTE DEHORS',
  missTitle: 'À CÔTÉ !',
  missSub: 'RATÉ DEPUIS LE POINT',
  pauseTitle: 'PAUSE',
  pauseSub: 'Souffle un peu, le match t’attend.',
  btnResume: 'REPRENDRE',
  btnRestart: 'RECOMMENCER',
  btnMenu: 'MENU',
  win: 'VICTOIRE !',
  draw: 'MATCH NUL',
  lose: 'DÉFAITE',
  decGolden: 'REMPORTÉ SUR BUT EN OR EN PROLONGATION',
  decPens: 'DÉCIDÉ AUX TIRS AU BUT',
  pensOnlyTitle: 'SÉRIE DE TIRS AU BUT',
  pensScoreLabel: 'TAB',
  shots: 'TIRS',
  btnRematch: 'REVANCHE',
  touchMove: 'BOUGER',
};

const es: Strings = {
  language: 'IDIOMA',
  badgeMatch: 'PARTIDO RELÁMPAGO · 90 SEGUNDOS',
  badgePens: 'TANDA DE PENALES · MUERTE SÚBITA',
  tagA: 'Tres contra tres, ritmo altísimo. Lleva al equipo ',
  tagBlu: 'AZUL',
  tagB: ', regatea, pasa y supera al equipo ',
  tagRossa: 'ROJO',
  tagC: ' antes de que se acabe el tiempo.',
  featGolden: '¿Empate? Prórroga con gol de oro',
  featPens: '¿Siguen empatados? ¡Tiros penales!',
  modeMatch: 'PARTIDO 90s',
  modeMatchDesc: 'luego prórroga y penales',
  modePens: 'SOLO PENALES',
  modePensDesc: 'directo al punto penal',
  diffEasy: 'FÁCIL',
  diffEasyDesc: 'rivales tranquilos',
  diffNormal: 'NORMAL',
  diffNormalDesc: 'partido equilibrado',
  diffHard: 'DIFÍCIL',
  diffHardDesc: 'presión feroz',
  btnPlay: 'JUGAR AHORA',
  btnPlayPens: 'DESDE EL PUNTO PENAL',
  menuMove: 'movimiento',
  menuSprint: 'sprint',
  menuShoot: 'tiro',
  menuPass: 'pase',
  menuSwitch: 'cambiar jugador',
  mobileHint: 'En móvil: joystick a la izquierda, botones a la derecha',
  playersLabel: 'JUGADORES',
  opp1P: '1 JUGADOR',
  opp1PDesc: 'contra la IA',
  opp2P: '2 JUGADORES',
  opp2PDesc: 'local, mismo campo',
  player1: 'JUGADOR 1',
  player2: 'JUGADOR 2',
  noDiff2p: 'La dificultad no se aplica en modo 2 jugadores.',
  menuMove2: 'mover (I J K L)',
  menuSprint2: 'esprint (Mayús der)',
  menuShoot2: 'disparo (Intro)',
  menuPass2: 'pase (M)',
  menuSwitch2: 'cambiar jugador (,)',
  mobileHint2p: 'En móvil: mitad izquierda P1, mitad derecha P2',
  hintAimUpDown2: 'apunta dentro de la portería',
  hintKickPen2: 'lanza el penal',
  hintKeeperMove2: 'mueve los guantes',
  hintDive2: 'te lanza en esa dirección',

  teamBlue: 'AZU',
  teamRed: 'ROJ',
  kickOff: 'SAQUE INICIAL',
  badgeGolden: 'PRÓRROGA · GOL DE ORO',
  goal: '¡GOOOL!',
  goalBlue: 'GOL DEL EQUIPO AZUL',
  goalRed: 'GOL DEL EQUIPO ROJO',
  psSeries: 'PENALES · SERIE {n}',
  psSuddenDeath: 'PENALES · MUERTE SÚBITA',
  psGetReadyShoot: 'PREPÁRATE PARA TIRAR...',
  psGetReadySave: 'PREPÁRATE PARA PARAR...',
  psAimShoot: '¡APUNTA Y DISPARA!',
  psSaveNow: '¡PARA EL PENAL!',
  psYourShot: 'TU TIRO...',
  psTheirShot: 'SU TIRO...',
  kMove: 'muévete',
  kSprint: 'sprint',
  kShoot: 'tiro',
  kPass: 'pase',
  kSwitch: 'cambiar',
  kPause: 'pausa',
  hintAimUpDown: 'apunta a cualquier zona',
  hintKickPen: 'lanza el penal',
  hintKeeperMove: 'mueve el guante',
  hintDive: 'lánzate en esa dirección',
  extraTimeTitle: 'PRÓRROGA',
  extraTimeSub: 'GOL DE ORO · EL QUE MARQUE GANA',
  pensTitle: 'TIROS PENALES',
  pensSub: 'MEJOR DE 5 · LUEGO MUERTE SÚBITA',
  saveTitle: '¡PARADA!',
  saveSub: 'EL PORTERO DICE NO',
  postTitle: '¡PALO!',
  postSub: 'QUÉ SUSTO... SE MARCHA FUERA',
  missTitle: '¡FUERA!',
  missSub: 'ERROR DESDE EL PUNTO',
  pauseTitle: 'PAUSA',
  pauseSub: 'Toma aire, el partido te espera.',
  btnResume: 'CONTINUAR',
  btnRestart: 'REINICIAR',
  btnMenu: 'MENÚ',
  win: '¡VICTORIA!',
  draw: 'EMPATE',
  lose: 'DERROTA',
  decGolden: 'DECIDIDO CON GOL DE ORO EN LA PRÓRROGA',
  decPens: 'DECIDIDO EN LOS TIROS PENALES',
  pensOnlyTitle: 'TANDA DE TIROS PENALES',
  pensScoreLabel: 'PENALES',
  shots: 'TIROS',
  btnRematch: 'REVANCHA',
  touchMove: 'MUÉVETE',
};

const ar: Strings = {
  language: 'اللغة',
  badgeMatch: 'مباراة خاطفة · ٩٠ ثانية',
  badgePens: 'ركلات الجزاء · الموت المفاجئ',
  tagA: 'ثلاثة ضد ثلاثة، إيقاع سريع جداً. قُد فريق ',
  tagBlu: 'الأزرق',
  tagB: '، مراوغ ومرر وسجّل في مرمى فريق ',
  tagRossa: 'الأحمر',
  tagC: ' قبل انتهاء الوقت.',
  featGolden: 'تعادل؟ وقت إضافي بهدف ذهبي',
  featPens: 'ما زال التعادل قائماً؟ ركلات جزاء!',
  modeMatch: 'مباراة ٩٠ ث',
  modeMatchDesc: 'ثم وقت إضافي وركلات جزاء',
  modePens: 'ركلات جزاء فقط',
  modePensDesc: 'مباشرة إلى النقطة',
  diffEasy: 'سهل',
  diffEasyDesc: 'خصوم مسترخون',
  diffNormal: 'عادي',
  diffNormalDesc: 'مباراة متوازنة',
  diffHard: 'صعب',
  diffHardDesc: 'ضغط شرس',
  btnPlay: 'العب الآن',
  btnPlayPens: 'سدّد من النقطة',
  menuMove: 'التحرك',
  menuSprint: 'انطلاق',
  menuShoot: 'تسديد',
  menuPass: 'تمرير',
  menuSwitch: 'تبديل اللاعب',
  mobileHint: 'على الجوال: عصا تحكم يساراً وأزرار يميناً',
  playersLabel: 'اللاعبون',
  opp1P: 'لاعب واحد',
  opp1PDesc: 'ضد الحاسوب',
  opp2P: 'لاعبان',
  opp2PDesc: 'محليًا، نفس الملعب',
  player1: 'اللاعب 1',
  player2: 'اللاعب 2',
  noDiff2p: 'الصعوبة لا تُطبَّق في وضع اللاعبين.',
  menuMove2: 'الحركة (I J K L)',
  menuSprint2: 'الانطلاقة (Shift الأيمن)',
  menuShoot2: 'التسديد (Enter)',
  menuPass2: 'التمرير (M)',
  menuSwitch2: 'تبديل اللاعب (,)',
  mobileHint2p: 'على الهاتف: النصف الأيسر للاعب 1، النصف الأيمن للاعب 2',
  hintAimUpDown2: 'صوّب داخل المرمى',
  hintKickPen2: 'ركّل ركلة الجزاء',
  hintKeeperMove2: 'حرّك القفازين',
  hintDive2: 'اغطس في ذلك الاتجاه',

  teamBlue: 'أزرق',
  teamRed: 'أحمر',
  kickOff: 'ركلة البداية',
  badgeGolden: 'وقت إضافي · هدف ذهبي',
  goal: 'هــدف!',
  goalBlue: 'هدف للفريق الأزرق',
  goalRed: 'هدف للفريق الأحمر',
  psSeries: 'ركلات الجزاء · الجولة {n}',
  psSuddenDeath: 'ركلات الجزاء · الموت المفاجئ',
  psGetReadyShoot: 'استعد للتسديد...',
  psGetReadySave: 'استعد للتصدي...',
  psAimShoot: 'صوّب وسدّد!',
  psSaveNow: 'تصدَّ لركلة الجزاء!',
  psYourShot: 'تسديدتك...',
  psTheirShot: 'تسديدتهم...',
  kMove: 'تحرّك',
  kSprint: 'انطلاق',
  kShoot: 'تسديد',
  kPass: 'تمرير',
  kSwitch: 'تبديل',
  kPause: 'إيقاف',
  hintAimUpDown: 'صوّب نحو أي نقطة من المرمى',
  hintKickPen: 'سدّد ركلة الجزاء',
  hintKeeperMove: 'حرّك القفاز',
  hintDive: 'ارمِ نفسك في ذلك الاتجاه',
  extraTimeTitle: 'وقت إضافي',
  extraTimeSub: 'هدف ذهبي · من يسجّل يفوز',
  pensTitle: 'ركلات جزاء',
  pensSub: 'الأفضل من ٥ · ثم موت مفاجئ',
  saveTitle: 'تصدّى لها!',
  saveSub: 'الحارس يقول لا',
  postTitle: 'القائم!',
  postSub: 'يا لها من قشعريرة... الكرة خارجاً',
  missTitle: 'خارجاً!',
  missSub: 'خطأ من النقطة',
  pauseTitle: 'إيقاف مؤقت',
  pauseSub: 'خذ نفساً، المباراة بانتظارك.',
  btnResume: 'استئناف',
  btnRestart: 'إعادة البدء',
  btnMenu: 'القائمة',
  win: 'فوز!',
  draw: 'تعادل',
  lose: 'خسارة',
  decGolden: 'حُسمت بهدف ذهبي في الوقت الإضافي',
  decPens: 'حُسمت بركلات الجزاء',
  pensOnlyTitle: 'سلسلة ركلات الجزاء',
  pensScoreLabel: 'ركلات',
  shots: 'تسديدات',
  btnRematch: 'مباراة العودة',
  touchMove: 'تحرّك',
};

export const STRINGS: Record<Language, Strings> = { it, en, de, fr, es, ar };

export const isRTL = (lang: Language) => lang === 'ar';

export const fmt = (template: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), template);
