/**
 * Demo seed script — populates the live Railway DB with realistic data
 * for client presentations.
 *
 * Usage:
 *   node scripts/seed-demo.mjs
 *
 * Fill in the three variables below before running.
 */

const API_URL = 'https://block-tattoo-studio-production.up.railway.app'; // e.g. https://block-tattoo-studio-production.up.railway.app
const ADMIN_EMAIL = 'kiarash.fayyaz72@gmail.com';
const ADMIN_PASSWORD = 'Block13tattoostudio@';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function req(method, path, body, token) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    console.error(`❌  ${method} ${path} → ${res.status}`, data);
    throw new Error(`Request failed: ${res.status}`);
  }
  return data;
}

function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── 1. Login ─────────────────────────────────────────────────────────────────

async function login() {
  console.log('\n🔐  Logging in...');
  const data = await req('POST', '/auth/admin/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  console.log('✅  Logged in');
  return data.accessToken;
}

// ─── 2. Artists ───────────────────────────────────────────────────────────────

const ARTISTS = [
  {
    displayName: 'Lena Hartmann',
    handle: 'lena-hartmann',
    slug: 'lena-hartmann',
    email: 'lena@block13tattoo.com',
    phone: '+49 176 1234 5678',
    bio: 'Lena spezialisiert sich auf Fine-Line- und Botanical-Tattoos. Mit über 8 Jahren Erfahrung verbindet sie präzise Linienführung mit organischen, naturinspirierten Motiven.',
  },
  {
    displayName: 'Marco Reyes',
    handle: 'marco-reyes',
    slug: 'marco-reyes',
    email: 'marco@block13tattoo.com',
    phone: '+49 176 9876 5432',
    bio: 'Marco ist bekannt für seine ausdrucksstarken Blackwork- und Tribal-Designs. Seine Arbeiten vereinen klassische Tätowiertraditionen mit zeitgenössischer Ästhetik.',
  },
  {
    displayName: 'Sophie Keller',
    handle: 'sophie-keller',
    slug: 'sophie-keller',
    email: 'sophie@block13tattoo.com',
    phone: '+49 176 5555 7777',
    bio: 'Sophie bringt Aquarell- und Neo-Traditional-Tattoos zum Leben. Ihre leuchtenden Farbpaletten und fließenden Kompositionen sind ihr Markenzeichen.',
  },
  {
    displayName: 'Jonas Weber',
    handle: 'jonas-weber',
    slug: 'jonas-weber',
    email: 'jonas@block13tattoo.com',
    phone: '+49 176 3333 4444',
    bio: 'Jonas ist Experte für Japanese-Style- und Sleeve-Tattoos. Seine detailreichen Kompositionen erzählen Geschichten auf der Haut.',
  },
];

async function createArtists(token) {
  console.log('\n🎨  Creating artists...');
  const ids = [];

  for (const artist of ARTISTS) {
    try {
      // multipart/form-data — send as FormData
      const form = new FormData();
      Object.entries(artist).forEach(([k, v]) => form.append(k, v));

      const res = await fetch(`${API_URL}/artists`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) {
        console.warn(
          `  ⚠️  Artist "${artist.displayName}" failed:`,
          data?.message ?? data,
        );
        continue;
      }
      ids.push(data.id);
      console.log(`  ✅  ${artist.displayName} (${data.id})`);
    } catch (e) {
      console.warn(`  ⚠️  Artist "${artist.displayName}" error:`, e.message);
    }
  }

  return ids;
}

// ─── 3. Articles ──────────────────────────────────────────────────────────────

const ARTICLES = [
  {
    title: 'Wie du das perfekte Tattoo-Motiv findest',
    slug: 'perfektes-tattoo-motiv-finden',
    excerpt:
      'Von der ersten Idee bis zum fertigen Design — so findest du ein Motiv, das wirklich zu dir passt und eine Geschichte erzählt.',
    content: `## Die Idee entwickeln

Ein Tattoo ist eine lebenslange Entscheidung. Nimm dir Zeit, Inspiration zu sammeln — Pinterest-Boards, Instagram-Künstler, Skizzenbücher. Lass die Idee reifen, bevor du einen Termin buchst.

## Den richtigen Style wählen

Fine Line, Blackwork, Neo-Traditional, Japanese, Watercolour — jeder Stil hat seine eigene Sprache. Unser Team berät dich gerne, welcher Stil zu deiner Persönlichkeit und der Körperstelle passt.

## Mit dem Artist sprechen

Beim Beratungsgespräch bringen wir Referenzbilder zusammen und entwickeln ein individuelles Konzept. Vertrauen zwischen dir und deinem Artist ist der Schlüssel zu einem außergewöhnlichen Ergebnis.`,
    tags: ['Design', 'Beratung', 'Tipps'],
    status: 'PUBLISHED',
  },
  {
    title: 'Aftercare: So pflegst du dein frisches Tattoo',
    slug: 'tattoo-aftercare-pflege',
    excerpt:
      'Die ersten 2–3 Wochen nach der Session sind entscheidend für das Endergebnis. Hier sind unsere Aftercare-Empfehlungen.',
    content: `## Die ersten 24 Stunden

Lass die Schutzfolie mindestens 2–4 Stunden auf dem Tattoo. Wasche es danach vorsichtig mit warmem Wasser und einer milden, parfümfreien Seife.

## Die Heilungsphase

Trage zweimal täglich eine dünne Schicht Bepanthen oder eine spezielle Tattoo-Pflegecreme auf. Vermeide direkte Sonneneinstrahlung, langes Baden und enge Kleidung über dem frischen Tattoo.

## Was du vermeiden solltest

- Kratzen oder Schälen der Haut
- Schwimmbad oder Sauna in den ersten 4 Wochen
- Direkte Sonne ohne Sonnenschutz (auch nach der Heilung)`,
    tags: ['Aftercare', 'Pflege', 'Heilung'],
    status: 'PUBLISHED',
  },
  {
    title: 'Fine Line Tattoos: Präzision trifft Eleganz',
    slug: 'fine-line-tattoos-praezision-eleganz',
    excerpt:
      'Fine-Line-Tattoos sind der Inbegriff von Raffinesse. Wir erklären, was diesen Stil so besonders macht und worauf du achten solltest.',
    content: `## Was ist Fine Line?

Fine-Line-Tattoos zeichnen sich durch extrem dünne, präzise Linien aus. Sie wirken oft wie Bleistiftzeichnungen auf der Haut und eignen sich perfekt für florale Motive, Porträts und minimalistische Designs.

## Die Herausforderung

Dieser Stil verlangt höchste technische Präzision vom Artist. Gleichzeitig ist die Langlebigkeit von der Körperstelle und der Hautpflege abhängig.`,
    tags: ['Fine Line', 'Style', 'Technik'],
    status: 'PUBLISHED',
  },
];

async function createArticles(token) {
  console.log('\n📝  Creating articles...');

  for (const article of ARTICLES) {
    try {
      await req('POST', '/admin/articles', article, token);
      console.log(`  ✅  "${article.title}"`);
    } catch {
      console.warn(
        `  ⚠️  Article "${article.title}" may already exist — skipping`,
      );
    }
  }
}

// ─── 4. Booking requests (public intake) ─────────────────────────────────────

const BOOKINGS = [
  {
    client: {
      firstName: 'Anna',
      lastName: 'Schmidt',
      email: 'anna.schmidt@example.de',
      phone: '+49 170 1111 2222',
      instagram: '@anna.tattoo',
    },
    bookingRequest: {
      consultDate: futureDate(7),
      description:
        'Ich möchte eine feine botanische Ranke vom Handgelenk bis zum Ellbogen. Inspiriert von Farn und Eukalyptus, schwarze Tinte, Fine-Line-Stil.',
      budgetRange: '_700_1000',
      placement: 'Unterarm, Handgelenk bis Ellbogen',
      sizeDescription: 'ca. 25 cm lang, 4 cm breit',
      styleNotes: 'Fine Line, Botanical, minimalistische schwarze Tinte',
      bookingType: 'APPOINTMENT',
      source: 'INSTAGRAM',
      studioChooses: true,
      preferredTimeOfDay: 'AFTERNOON',
    },
  },
  {
    client: {
      firstName: 'Tobias',
      lastName: 'Müller',
      email: 'tobias.mueller@example.de',
      phone: '+49 176 3333 5555',
    },
    bookingRequest: {
      consultDate: futureDate(10),
      description:
        'Cover-Up eines alten Tribal-Tattoos am Oberarm. Das neue Design soll ein japanischer Koi-Fisch mit Wellen sein, farbenfroh.',
      budgetRange: '_1000_1500',
      placement: 'Oberarm außen',
      sizeDescription: '15 x 12 cm',
      styleNotes: 'Japanese Style, Koi, Farbe, traditionelle Palette',
      bookingType: 'COVER_UP',
      source: 'GOOGLE',
      studioChooses: false,
      preferredArtistName: 'Jonas',
    },
  },
  {
    client: {
      firstName: 'Mia',
      lastName: 'Hoffmann',
      email: 'mia.hoffmann@example.de',
      phone: '+49 172 7777 8888',
      instagram: '@mia.h',
    },
    bookingRequest: {
      consultDate: futureDate(14),
      description:
        'Kleines minimalistisches Sternbild (Orion) hinter dem Ohr. Sehr fein, keine Füllung, nur die Sternpunkte mit verbindenden Linien.',
      budgetRange: 'UNDER_200',
      placement: 'Hinter dem linken Ohr',
      sizeDescription: '3 x 3 cm',
      styleNotes: 'Minimalistisch, Fine Line, kein Shading',
      bookingType: 'APPOINTMENT',
      source: 'INSTAGRAM',
      studioChooses: true,
      preferredTimeOfDay: 'MORNING',
    },
  },
  {
    client: {
      firstName: 'Felix',
      lastName: 'Bauer',
      email: 'felix.bauer@example.de',
      phone: '+49 178 2222 9999',
    },
    bookingRequest: {
      consultDate: futureDate(5),
      description:
        'Sleeve-Tattoo in Planung. Thema: Dark Forest — Bäume, Nebel, Rehe, Mond. Schwarz-Grau mit einzelnen blauen Akzenten.',
      budgetRange: 'OVER_2000',
      placement: 'Gesamter rechter Arm (Sleeve)',
      sizeDescription: 'Voller Sleeve vom Handgelenk bis zur Schulter',
      styleNotes: 'Dark Forest, Schwarz-Grau, Illustrative, Realism',
      bookingType: 'CONSULTATION',
      source: 'DIRECT',
      studioChooses: true,
      preferredTimeOfDay: 'ANY',
      preferredDateFrom: futureDate(30),
      preferredDateTo: futureDate(90),
    },
  },
  {
    client: {
      firstName: 'Laura',
      lastName: 'Wagner',
      email: 'laura.wagner@example.de',
      phone: '+49 179 4444 6666',
      instagram: '@lauraw.art',
    },
    bookingRequest: {
      consultDate: futureDate(12),
      description:
        'Aquarell-Schmetterling auf der Schulter, leuchtende Farben — Pink, Lila, Türkis. Kein schwarzes Outline, nur Farbverläufe.',
      budgetRange: '_400_700',
      placement: 'Linke Schulter',
      sizeDescription: '10 x 8 cm',
      styleNotes: 'Watercolour, keine schwarzen Linien, Farbverlauf',
      bookingType: 'APPOINTMENT',
      source: 'TIKTOK',
      studioChooses: true,
    },
  },
];

async function createBookings() {
  console.log('\n📅  Creating booking requests...');

  for (const booking of BOOKINGS) {
    try {
      // Public intake expects multipart/form-data with flat fields
      const form = new FormData();
      Object.entries(booking.client).forEach(([k, v]) => {
        if (v !== undefined) form.append(k, String(v));
      });
      Object.entries(booking.bookingRequest).forEach(([k, v]) => {
        if (v !== undefined) form.append(k, String(v));
      });

      const res = await fetch(`${API_URL}/public/booking-intake`, {
        method: 'POST',
        body: form,
      });

      const data = await res.json();
      if (!res.ok) {
        console.warn(`  ⚠️  Booking for ${booking.client.firstName} failed:`, JSON.stringify(data?.message ?? data).slice(0, 200));
        continue;
      }
      console.log(`  ✅  ${booking.client.firstName} ${booking.client.lastName}`);
    } catch (e) {
      console.warn(`  ⚠️  Booking for ${booking.client.firstName} error:`, e.message);
    }
  }
}

// ─── 5. Station config (required before guest bookings) ──────────────────────

async function setupStationConfig(token) {
  console.log('\n🪑  Setting up station config...');
  try {
    await req('PATCH', '/admin/station-config', {
      totalTables: 4,
      pricePerDay: 80,
      monthlyDiscountPercent: 10,
    }, token);
    console.log('  ✅  Station config set (4 stations, €80/day)');
  } catch (e) {
    console.warn('  ⚠️  Station config failed:', e.message);
  }
}

// ─── 6. Guest artist booking ──────────────────────────────────────────────────

async function createGuestBooking() {
  console.log('\n🎭  Creating guest artist booking...');

  try {
    // First check availability
    const startDate = futureDate(20);
    const endDate = futureDate(24);

    const payload = {
      name: 'Kai Tanaka',
      phone: '+49 176 8888 1234',
      email: 'kai.tanaka@gueststudio.jp',
      startDate,
      endDate,
      numberOfTables: 1,
      acknowledgment: true,
    };

    // This triggers Stripe — we call the API directly and note it'll be PENDING_PAYMENT
    const data = await req('POST', '/guest-bookings', payload);
    console.log(
      `  ✅  Guest artist "Kai Tanaka" booking created (${startDate} – ${endDate})`,
    );
    if (data.stripePaymentUrl) {
      console.log(`  ℹ️  Stripe URL (don't pay): ${data.stripePaymentUrl}`);
    }
  } catch (e) {
    console.warn(`  ⚠️  Guest booking failed:`, e.message);
  }
}

// ─── 6. Consult slots (so booking dates are valid) ────────────────────────────

async function createConsultSlots(token) {
  console.log('\n🗓️  Creating consult slots...');

  // Create slots for the next 30 days (skip Sundays)
  const slots = [];
  for (let i = 1; i <= 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0) continue; // skip Sunday
    slots.push(d.toISOString().slice(0, 10));
  }

  let created = 0;
  for (const date of slots) {
    try {
      await req('POST', '/admin/consult-slots', { date, maxCount: 3 }, token);
      created++;
    } catch {
      // slot may already exist, ignore
    }
  }
  console.log(`  ✅  ${created} consult slots created`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Starting demo seed...');
  console.log(`📡  API: ${API_URL}\n`);

  if (API_URL.includes('YOUR-RAILWAY-URL')) {
    console.error(
      '❌  Please fill in API_URL, ADMIN_EMAIL and ADMIN_PASSWORD at the top of this file.',
    );
    process.exit(1);
  }

  const token = await login();

  await createConsultSlots(token);
  await createArtists(token);
  await createArticles(token);
  await createBookings();
  await setupStationConfig(token);
  await createGuestBooking();

  console.log(
    '\n🎉  Demo seed complete! Open the admin panel to review the data.',
  );
}

main().catch((e) => {
  console.error('\n💥  Seed failed:', e.message);
  process.exit(1);
});
