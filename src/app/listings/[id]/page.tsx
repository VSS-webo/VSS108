
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Recycle,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ExchangeActions from "./ExchangeActions";

export const instant = false;

type Listing = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: number;
  is_free: boolean;
  image_urls: string[] | null;
  status: string;
  created_at: string;
};

async function ListingDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: listing, error } = await supabase
    .from("listings")
    .select(
      "id, owner_id, title, description, category, condition, price, is_free, image_urls, status, created_at"
    )
    .eq("id", id)
    .maybeSingle<Listing>();

  if (error) {
    throw new Error(`Could not load listing: ${error.message}`);
  }

  if (!listing) {
    notFound();
  }

  const imageUrl = listing.image_urls?.[0];
  const isAvailable = listing.status.toLowerCase() === "available";

  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(listing.created_at));

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#202a21]">
      <header className="border-b border-[#e8e8df] bg-[#faf9f6]">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#294b35] text-[#e5efc9]">
              <Recycle size={22} />
            </span>
            <span className="text-lg font-bold tracking-tight">
              loop<span className="text-[#648957]">campus</span>
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#65705d]"
          >
            <ArrowLeft size={16} />
            Marketplace
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#6f7968] transition hover:text-[#294b35]"
        >
          <ArrowLeft size={15} />
          Back to all items
        </Link>

        <div className="mt-7 grid items-start gap-9 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <section className="overflow-hidden rounded-3xl border border-[#e4e5db] bg-white">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={listing.title}
                className="aspect-[4/3] w-full bg-[#f4f4ed] object-contain p-3"
              />
            ) : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center bg-[#eff2e8] text-[#78916b]">
                <BookOpen size={60} strokeWidth={1.2} />
                <p className="mt-4 text-sm">No image provided</p>
              </div>
            )}
          </section>

          <section>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#eaf0e3] px-3 py-1.5 text-xs font-semibold text-[#46643c]">
                {listing.category}
              </span>

              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  isAvailable
                    ? "bg-[#eaf0e3] text-[#46643c]"
                    : "bg-[#f1eee6] text-[#786b4f]"
                }`}
              >
                {listing.status}
              </span>
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold leading-tight tracking-[-1.2px] sm:text-4xl">
              {listing.title}
            </h1>

            <p className="mt-4 text-3xl font-semibold tracking-tight text-[#294b35]">
              {listing.is_free || Number(listing.price) === 0
                ? "Free"
                : new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 2,
                  }).format(Number(listing.price))}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#e4e5db] bg-white p-4">
                <p className="text-xs text-[#858a7d]">Condition</p>
                <p className="mt-1.5 text-sm font-semibold">
                  {listing.condition}
                </p>
              </div>

              <div className="rounded-2xl border border-[#e4e5db] bg-white p-4">
                <p className="text-xs text-[#858a7d]">Listed on</p>
                <p className="mt-1.5 text-sm font-semibold">
                  {formattedDate}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold">About this item</h2>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#73796d]">
                {listing.description}
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-[#dce5d4] bg-[#f0f4eb] p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={21}
                  className="mt-0.5 shrink-0 text-[#56754b]"
                />
                <div>
                  <p className="text-sm font-semibold text-[#365337]">
                    Keep exchanges safe
                  </p>
                  <p className="mt-1 text-xs leading-6 text-[#75816c]">
                    Check the item condition and arrange a handover at a safe,
                    public campus location.
                  </p>
                </div>
              </div>
            </div>

            <ExchangeActions
              listingId={listing.id}
              ownerId={listing.owner_id}
              listingStatus={listing.status}
            />

            <p className="mt-5 break-all text-xs text-[#9a9d92]">
              Listing reference: {listing.id}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <>{await ListingDetailContent({ params })}</>;
}
