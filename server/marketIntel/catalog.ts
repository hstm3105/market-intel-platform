export const INDUSTRY_CATALOG = [
  { slug: "fintech", name: "FinTech", description: "Financial infrastructure, payments, lending, and digital wealth." },
  { slug: "healthcare", name: "Healthcare", description: "Care delivery, health technology, biotech, and payers." },
  { slug: "energy", name: "Energy", description: "Power, climate technology, renewables, and grid infrastructure." },
  { slug: "saas", name: "SaaS", description: "Enterprise software, cloud platforms, and AI-native applications." },
  { slug: "industrials", name: "Industrials", description: "Manufacturing, automation, logistics, and advanced materials." },
  { slug: "consumer", name: "Consumer", description: "Consumer brands, retail, marketplaces, and media." },
  { slug: "mobility", name: "Mobility", description: "Automotive, transportation, autonomy, and supply chains." },
  { slug: "telecom", name: "Telecom & Connectivity", description: "Networks, devices, communications platforms, and infrastructure." },
] as const;

export const getIndustry = (slug: string) => INDUSTRY_CATALOG.find(industry => industry.slug === slug);
