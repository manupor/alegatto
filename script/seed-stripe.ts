import { getUncachableStripeClient } from "../server/stripeClient";

async function seedStripeProducts() {
  const stripe = await getUncachableStripeClient();
  console.log("[seed-stripe] Connecting to Stripe...");

  // ── Pro Plan ─────────────────────────────────────────────
  const proSearch = await stripe.products.search({ query: "metadata['plan']:'pro'" });
  if (proSearch.data.length === 0) {
    const pro = await stripe.products.create({
      name: "Alegatto Pro",
      description: "Plan profesional para abogados independientes. RAG legal, generador de recursos, editor con firma electrónica.",
      metadata: { plan: "pro" },
    });
    await stripe.prices.create({
      product: pro.id,
      unit_amount: 2000,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { plan: "pro" },
    });
    console.log("[seed-stripe] ✓ Plan Pro creado ($20/mes) - producto:", pro.id);
  } else {
    console.log("[seed-stripe] Plan Pro ya existe:", proSearch.data[0].id);
  }

  // ── Corporate Plan ────────────────────────────────────────
  const corpSearch = await stripe.products.search({ query: "metadata['plan']:'corporate'" });
  if (corpSearch.data.length === 0) {
    const corp = await stripe.products.create({
      name: "Alegatto Corporativo",
      description: "Plan corporativo multi-tenant para firmas legales. Usuarios ilimitados, analíticas, gestión de equipo completa.",
      metadata: { plan: "corporate" },
    });
    await stripe.prices.create({
      product: corp.id,
      unit_amount: 5000,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { plan: "corporate" },
    });
    console.log("[seed-stripe] ✓ Plan Corporativo creado ($50/mes) - producto:", corp.id);
  } else {
    console.log("[seed-stripe] Plan Corporativo ya existe:", corpSearch.data[0].id);
  }

  console.log("[seed-stripe] Listo.");
}

seedStripeProducts().catch((e) => {
  console.error("[seed-stripe] Error:", e.message);
  process.exit(1);
});
