import Image from "next/image";
import Link from "next/link";
import Button from "./Button";

interface Campaign {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  href: string;
  urgent?: boolean;
}

const campaigns: Campaign[] = [
  {
    title: "Palestine Emergency Relief",
    description:
      "Delivering food, water, shelter, and medical aid to displaced families in Gaza.",
    image: "/images/palestine-relief.jpg",
    imageAlt: "Deen Relief worker distributing aid in Palestine",
    href: "#palestine",
    urgent: true,
  },
  {
    title: "Bangladesh Orphan Sponsorship",
    description:
      "£30/month provides education, nutrition, and safe shelter for an orphaned child.",
    image: "/images/orphan-sponsorship.jpg",
    imageAlt: "Deen Relief team member with a sponsored child and food supplies in Bangladesh",
    href: "#orphan-sponsorship",
  },
  {
    title: "Refugee Children with Cancer",
    description:
      "Supporting Syrian and Gazan children through cancer treatment at our care centres in Turkey.",
    image: "/images/cancer-care-visit.webp",
    imageAlt: "Deen Relief team member visiting a child with cancer",
    href: "#cancer-care",
  },
  {
    title: "Bangladesh Clean Water",
    description:
      "Providing access to safe, clean drinking water for communities in rural Bangladesh.",
    image: "/images/bangladesh-housing.webp",
    imageAlt: "A family in front of a Deen Relief housing project in Bangladesh",
    href: "#clean-water",
  },
  {
    title: "UK Homeless Community Aid",
    description:
      "Supporting homeless individuals in Brighton and across the UK since 2012.",
    image: "/images/hero-bangladesh-community.webp",
    imageAlt: "Deen Relief team with community members",
    href: "#uk-homeless",
  },
  {
    title: "Build a School in Bangladesh",
    description:
      "Investing in education infrastructure for children in rural Bangladesh.",
    image: "/images/gulucuk-team.webp",
    imageAlt: "Deen Relief team member with children outside a centre",
    href: "#school",
  },
];

export default function CampaignsGrid() {
  return (
    <section id="campaigns" className="py-16 md:py-24 bg-grey-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal mb-2">
              Our Active Campaigns
            </h2>
            <p className="text-grey text-lg">
              From emergency relief to long-term development — see where your
              donation can make an impact.
            </p>
          </div>
          <Button variant="secondary" size="sm" href="#all-campaigns" className="flex-shrink-0">
            View All
          </Button>
        </div>

        {/* Campaign Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.title}
              href={campaign.href}
              className="group block bg-white rounded-2xl overflow-hidden shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
            >
              {/* Image */}
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={campaign.image}
                  alt={campaign.imageAlt}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {campaign.urgent && (
                  <span className="absolute top-3 left-3 text-[11px] font-bold tracking-wider uppercase bg-amber text-charcoal px-3 py-1 rounded-full">
                    Urgent
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-heading font-semibold text-lg text-charcoal mb-2 group-hover:text-green transition-colors duration-200">
                  {campaign.title}
                </h3>
                <p className="text-grey text-sm leading-relaxed mb-4">
                  {campaign.description}
                </p>
                <span className="inline-flex items-center text-green text-sm font-medium">
                  Donate
                  <svg
                    className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
