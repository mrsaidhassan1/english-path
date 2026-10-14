// Picture support for vocabulary cards and picture-selection tasks.
// Emoji keep the app light and work offline. To use a real picture instead,
// put an image in public/images/vocab/<word-id>.png and add the id to PHOTO_IDS.

export const PHOTO_IDS = new Set<string>([]);

const E: Record<string, string> = {
  // people & classroom
  hello: '👋', name: '🪪', teacher: '🧑‍🏫', student: '🧑‍🎓', classmate: '🧑‍🤝‍🧑', class: '🏫', man: '👨', partner: '🤝',
  'sit-down': '🪑', welcome: '🤗', 'nice-to-meet-you': '🤝', 'how-are-you': '🙂', fine: '👍', ok: '👌', thanks: '🙏', 'thank-you': '🙏',
  yes: '✅', no: '❌', please: '🙏', 'good-morning': '🌅', 'good-afternoon': '☀️', 'good-night': '🌙', goodbye: '👋', bye: '👋',
  'see-you-later': '👋', 'have-a-nice-day': '🌞', 'sleep-well': '😴', day: '📅', today: '📅', sleep: '😴', tonight: '🌙',
  boy: '👦', girl: '👧', woman: '👩', person: '🧑', people: '👥', baby: '👶', kids: '🧒', children: '🧒', friend: '🧑‍🤝‍🧑', friends: '🧑‍🤝‍🧑',
  'best-friend': '🧑‍🤝‍🧑', family: '👨‍👩‍👦', mother: '👩', father: '👨', parents: '👫', son: '👦', daughter: '👧', sister: '👧', brother: '👦',
  husband: '👨', wife: '👩', cousin: '🧑', grandparents: '👴', grandfather: '👴', uncle: '👨', aunt: '👩', dad: '👨', 'family-tree': '🌳', twin: '👯',
  // food & drink
  biscuit: '🍪', cake: '🍰', water: '💧', milk: '🥛', juice: '🧃', glass: '🥛', sugar: '🧂', hungry: '😋', thirsty: '🥤', burger: '🍔',
  sandwich: '🥪', cup: '☕', tea: '🍵', coffee: '☕', food: '🍽️', pizza: '🍕', cheese: '🧀', chocolate: '🍫', 'ice-cream': '🍦',
  orange: '🍊', coke: '🥤', drink: '🥤', eat: '🍽️', rice: '🍚', chicken: '🍗', meat: '🥩', fish: '🐟', bread: '🍞', apple: '🍎',
  banana: '🍌', dates: '🌴', kabsa: '🍛', soup: '🥣', dessert: '🍮', fork: '🍴', knife: '🔪', spoon: '🥄', plate: '🍽️', menu: '📋',
  bill: '🧾', salad: '🥗', seafood: '🦐', carrots: '🥕', chips: '🍟', toast: '🍞', eggs: '🥚', breakfast: '🍳', lunch: '🥪', dinner: '🍲',
  vegetables: '🥦', fruit: '🍇', 'fast-food': '🍔', snack: '🍿', honey: '🍯', nuts: '🥜', popcorn: '🍿', sweet: '🍬', salty: '🧂', spicy: '🌶️',
  delicious: '😋', 'take-away': '🥡', waiter: '🧑‍🍳', chef: '🧑‍🍳', restaurant: '🍽️', restaurants: '🍽️', 'vending-machine': '🥤',
  // objects
  english: '🇬🇧', book: '📘', computer: '💻', television: '📺', tv: '📺', phone: '📱', camera: '📷', car: '🚗', bus: '🚌', photograph: '🖼️',
  photo: '🖼️', picture: '🖼️', bag: '🎒', house: '🏠', home: '🏠', pen: '🖊️', pencil: '✏️', notebook: '📓', chair: '🪑', table: '🪵',
  board: '📋', window: '🪟', bottle: '🍼', key: '🔑', 'car-keys': '🔑', 'id-card': '🪪', letter: '✉️', alphabet: '🔤', 'capital-letter': '🔠',
  word: '🔤', sentence: '📝', question: '❓', answer: '💬', 'full-stop': '⏺️', map: '🗺️', umbrella: '☂️', backpack: '🎒', magazine: '📰',
  dictionary: '📖', 'business-card': '📇', clock: '🕒', 'alarm-clock': '⏰', laptop: '💻', telephone: '☎️', 'mobile-phone': '📱',
  'mobile-phones': '📱', screen: '📱', battery: '🔋', charger: '🔌', app: '📲', projector: '📽️', marker: '🖍️', 'air-conditioner': '❄️',
  wallet: '👛', money: '💵', 'credit-card': '💳', card: '💳', cash: '💵', coin: '🪙', note: '💵', receipt: '🧾', riyal: '💵', ticket: '🎫',
  'return-ticket': '🎫', 'single-ticket': '🎫', envelope: '✉️', stamp: '📮', parcel: '📦', postcard: '🏞️', medicine: '💊', aspirin: '💊',
  shampoo: '🧴', toothpaste: '🪥', homework: '📝', newspaper: '📰', email: '📧', message: '💬', 'phone-call': '📞', call: '📞', test: '📝',
  // home
  kitchen: '🍳', bathroom: '🛁', 'living-room': '🛋️', bedroom: '🛏️', bedrooms: '🛏️', bed: '🛏️', door: '🚪', sofa: '🛋️', lamp: '💡',
  fridge: '🧊', cooker: '🍳', armchair: '🛋️', desk: '🖥️', mirror: '🪞', wardrobe: '🚪', shelf: '📚', bookcase: '📚', pillow: '🛏️', fan: '🌀',
  apartment: '🏢', flat: '🏢', balcony: '🏢', roof: '🏠', garden: '🌷', tree: '🌳', toilet: '🚽', curtains: '🪟', carpet: '🧶',
  // places
  'saudi-arabia': '🇸🇦', egypt: '🇪🇬', england: '🏴', france: '🇫🇷', spain: '🇪🇸', italy: '🇮🇹', hungary: '🇭🇺', russia: '🇷🇺', china: '🇨🇳',
  japan: '🇯🇵', australia: '🇦🇺', brazil: '🇧🇷', canada: '🇨🇦', ireland: '🇮🇪', scotland: '🏴', sweden: '🇸🇪', america: '🇺🇸', 'the-us': '🇺🇸',
  germany: '🇩🇪', portugal: '🇵🇹', switzerland: '🇨🇭', mexico: '🇲🇽', chile: '🇨🇱', 'czech-republic': '🇨🇿', country: '🌍', countries: '🌍',
  world: '🌍', city: '🏙️', cities: '🏙️', capital: '🏛️', flag: '🚩', africa: '🌍', europe: '🌍', asia: '🌏', street: '🛣️', river: '🏞️',
  bridge: '🌉', road: '🛣️', mosque: '🕌', market: '🛒', mall: '🏬', tower: '🗼', hospital: '🏥', school: '🏫', centre: '🏢', building: '🏢',
  office: '🏢', bank: '🏦', hotel: '🏨', factory: '🏭', village: '🏘️', university: '🎓', college: '🏫', station: '🚉', 'railway-station': '🚉',
  'bus-station': '🚏', 'car-park': '🅿️', 'post-office': '🏤', museum: '🏛️', library: '📚', park: '🌳', supermarket: '🛒', zoo: '🦁',
  palace: '🏰', castle: '🏰', fountain: '⛲', souq: '🛍️', mountain: '⛰️', beach: '🏖️', sea: '🌊', island: '🏝️', desert: '🏜️', lake: '🏞️',
  farm: '🚜', tent: '⛺', 'sports-centre': '🏟️', stadium: '🏟️', gym: '🏋️', campus: '🏫', lab: '🔬', hangar: '✈️', cafeteria: '🍽️',
  'prayer-room': '🕌', classroom: '🏫', majlis: '🛋️', 'traffic-lights': '🚦', roundabout: '🔄', corner: '↩️', metro: '🚇', taxi: '🚕',
  train: '🚆', bicycle: '🚲', boat: '⛵', ferry: '⛴️', 'trolley-bus': '🚎', platform: '🚉', left: '⬅️', right: '➡️', turn: '↪️',
  // jobs
  doctor: '🧑‍⚕️', engineer: '🧑‍🔧', nurse: '🧑‍⚕️', builder: '👷', 'bus-driver': '🚌', businessman: '💼', businesswoman: '💼',
  'police-officer': '👮', police: '👮', 'shop-assistant': '🛍️', plumber: '🔧', painter: '🎨', driver: '🚗', 'taxi-driver': '🚕', soldier: '🪖',
  cashier: '🧾', dentist: '🦷', footballer: '⚽', receptionist: '🛎️', secretary: '🗂️', worker: '👷', guard: '💂', firefighter: '🧑‍🚒',
  electrician: '💡', farmer: '🧑‍🌾', job: '💼', work: '💼', manager: '💼', 'bank-manager': '🏦', accountant: '🧮', pilot: '🧑‍✈️',
  instructor: '🧑‍🏫', 'aircraft-maintenance': '🛠️', engine: '⚙️', wheel: '🛞', mechanic: '🔧', journalist: '📰', artist: '🎨',
  photographer: '📷', writer: '✍️', director: '🎬', uniform: '🥋', salary: '💰', customer: '🧑', boss: '💼',
  // feelings & adjectives
  happy: '😊', sad: '😢', tired: '🥱', excited: '🤩', ill: '🤒', sick: '🤒', bored: '😐', afraid: '😨', angry: '😠', sleepy: '😴', funny: '😂',
  kind: '💗', brave: '🦁', sorry: '🙇', tall: '🦒', short: '📏', young: '🧒', old: '👴', big: '🐘', small: '🐭', new: '✨', hot: '🔥',
  cold: '🥶', fast: '⚡', slow: '🐢', cheap: '🏷️', expensive: '💎', beautiful: '🌸', clean: '🧼', dirty: '🧹', quiet: '🤫', noisy: '📢',
  open: '🔓', closed: '🔒', empty: '🫙', full: '🍽️', strong: '💪', clever: '🧠', lazy: '🛌', shy: '🙈', healthy: '🥗', busy: '⏳',
  married: '💍', famous: '⭐', good: '👍', bad: '👎', true: '✅', false: '❌', correct: '✅', wrong: '❌', difficult: '🧗', easy: '🙂',
  // weather & time
  weather: '🌤️', rainy: '🌧️', rain: '🌧️', windy: '🌬️', wind: '🌬️', cloudy: '☁️', cloud: '☁️', sunny: '☀️', sun: '☀️', snow: '❄️',
  storm: '⛈️', sandstorm: '🌪️', 'dust-storm': '🌪️', dust: '🌫️', fog: '🌫️', ice: '🧊', thunder: '⚡', temperature: '🌡️', warm: '🌤️',
  sky: '🌌', spring: '🌱', summer: '☀️', autumn: '🍂', winter: '❄️', season: '🗓️', time: '⏰', morning: '🌅', evening: '🌆', night: '🌙',
  noon: '🕛', midnight: '🕛', week: '🗓️', weekend: '🗓️', month: '🗓️', months: '🗓️', year: '🗓️', holiday: '🏖️', hour: '⏱️', minutes: '⏱️',
  // daily life
  'get-up': '⏰', 'wake-up': '⏰', shower: '🚿', wash: '🧼', 'get-dressed': '👕', pray: '🕌', 'go-to-work': '💼', 'go-to-college': '🏫',
  'go-to-bed': '🛏️', 'get-home': '🏠', study: '📚', lesson: '📖', read: '📖', write: '✍️', listen: '👂', speak: '🗣️', repeat: '🔁',
  walk: '🚶', drive: '🚗', cook: '🧑‍🍳', buy: '🛒', shopping: '🛍️', 'go-shopping': '🛍️', relax: '😌', watch: '👀', visit: '🚪',
  fly: '✈️', ride: '🚲', swim: '🏊', run: '🏃', play: '🎮', learn: '🧠', teach: '🧑‍🏫', help: '🤝', smile: '😊', laugh: '😂', talk: '💬',
  // sport & free time
  sport: '🏅', sports: '🏅', football: '⚽', basketball: '🏀', volleyball: '🏐', tennis: '🎾', golf: '⛳', ball: '⚽', team: '👥',
  player: '🏃', match: '🏟️', goal: '🥅', win: '🏆', winner: '🏆', swimming: '🏊', cycling: '🚴', fishing: '🎣', camping: '🏕️',
  'horse-riding': '🏇', karate: '🥋', jogging: '🏃', picnic: '🧺', kite: '🪁', hobby: '🧩', reading: '📚', drawing: '✏️', cooking: '🍳',
  'video-game': '🎮', game: '🎮', games: '🎮', exercise: '🏋️', sailing: '⛵', skiing: '⛷️', 'water-sports': '🏄',
  // animals
  animal: '🐾', animals: '🐾', camel: '🐪', horse: '🐎', bird: '🐦', falcon: '🦅', lion: '🦁', cat: '🐈', pet: '🐕',
  // clothes & colours
  clothes: '👕', coat: '🧥', hat: '👒', jacket: '🧥', jumper: '🧶', 't-shirt': '👕', shoes: '👞', trainers: '👟', trousers: '👖', thobe: '🥼',
  black: '⚫', white: '⚪', red: '🔴', yellow: '🟡', blue: '🔵', green: '🟢', brown: '🟤', grey: '🩶', colour: '🎨',
  // numbers & misc
  number: '🔢', 'phone-number': '📞', 'mobile-number': '📱', address: '🏠', age: '🔢', date: '📅', maths: '➗', add: '➕', equals: '🟰', half: '🌓',
  sunday: '📅', monday: '📅', tuesday: '📅', wednesday: '📅', thursday: '📅', friday: '🕌', saturday: '📅', eid: '🌙', invitation: '💌',
  trip: '🧳', travel: '✈️', journey: '🧭', passenger: '🧳', tourist: '📸', directions: '🧭', airport: '🛫', plane: '✈️', aircraft: '✈️',
};

/** Picture for a vocab id, or undefined when there is no good picture. */
export function wordImage(id: string): string | undefined {
  return E[id];
}

export const hasImage = (id: string) => id in E || PHOTO_IDS.has(id);
