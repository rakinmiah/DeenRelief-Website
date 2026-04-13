import Image from "next/image";
import Link from "next/link";
import ProofTag from "./ProofTag";

interface Campaign {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  href: string;
  location: string;
  urgent?: boolean;
  objectPosition?: string;
}

const campaigns: Campaign[] = [
  {
    title: "Palestine Emergency Relief",
    description:
      "Our teams distribute food parcels, clean water, and medical supplies directly to displaced families across Gaza.",
    image: "/images/palestine-relief.webp",
    imageAlt: "Deen Relief worker distributing aid in Palestine",
    href: "/palestine",
    location: "Gaza",
    urgent: true,
    objectPosition: "center 30%",
  },
  {
    title: "Bangladesh Orphan Sponsorship",
    description:
      "£30/month covers education, daily meals, and safe shelter for one child through our partner centres in Bangladesh.",
    image: "/images/orphan-sponsorship.webp",
    imageAlt: "Deen Relief team member with a sponsored child and food supplies in Bangladesh",
    href: "/orphan-sponsorship",
    location: "Bangladesh",
    objectPosition: "center 25%",
  },
  {
    title: "Refugee Children with Cancer",
    description:
      "At Gulucuk Evi in Adana, we house families and fund treatment for Syrian and Gazan children undergoing cancer care.",
    image: "/images/cancer-care-visit.webp",
    imageAlt: "Deen Relief team member visiting a child with cancer",
    href: "/cancer-care",
    location: "Turkey",
    objectPosition: "center 35%",
  },
  {
    title: "Bangladesh Clean Water",
    description:
      "We build tube wells and filtration systems in rural Bangladesh, serving communities with no prior access to safe water.",
    image: "/images/bangladesh-housing.webp",
    imageAlt: "A family in front of a Deen Relief housing project in Bangladesh",
    href: "/clean-water",
    location: "Bangladesh",
    objectPosition: "center 30%",
  },
  {
    title: "UK Homeless Community Aid",
    description:
      "Hot meals, clothing, and support packs distributed on Brighton's streets every week by our local volunteer teams.",
    image: "/images/brighton-team.webp",
    imageAlt: "Deen Relief volunteers gathered at Brighton seafront for a community outreach event",
    href: "/uk-homeless",
    location: "Brighton, UK",
    objectPosition: "center 65%",
  },
  {
    title: "Build a School in Bangladesh",
    description:
      "Funding classroom construction and teacher salaries to give children in rural Bangladesh access to primary education.",
    image: "/images/hero-bangladesh-community.webp",
    imageAlt: "Deen Relief team with a large group of smiling children in Bangladesh",
    href: "/build-a-school",
    location: "Bangladesh",
  },
];

export default function CampaignsGrid() {
  return (
    <section id="campaigns" className="py-16 md:py-24 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-9">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-charcoal leading-tight mb-3">
            Donate to Charity — Active Campaigns
          </h2>
          <p className="text-grey text-base sm:text-[1.0625rem] leading-[1.7]">
            From Palestine emergency relief to orphan sponsorship in
            Bangladesh — see where your donation makes an impact.
          </p>
        </div>

        {/* Campaign Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.title}
              id={campaign.href.replace("#", "")}
              href={campaign.href}
              className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1"
            >
              {/* Image */}
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={campaign.image}
                  alt={campaign.imageAlt}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  style={campaign.objectPosition ? { objectPosition: campaign.objectPosition } : undefined}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {campaign.urgent && (
                  <span className="absolute top-3 left-3 text-[11px] font-bold tracking-wider uppercase bg-amber text-charcoal px-3 py-1 rounded-full">
                    Urgent
                  </span>
                )}
                <ProofTag location={campaign.location} />
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-heading font-semibold text-lg text-charcoal mb-2 group-hover:text-green transition-colors duration-200">
                  {campaign.title}
                </h3>
                <p className="text-grey/80 text-sm leading-relaxed mb-4 flex-1">
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
