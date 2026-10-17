
"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  Recycle,
  ShieldCheck,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const categories = [
  "Books",
  "Electronics",
  "Lab Equipment",
  "Stationery",
  "Furniture",
  "Other",
];

const conditions = ["Like New", "Good", "Fair", "Needs Repair"];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function NewListingPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Books");
  const [condition, setCondition] = useState("Good");
  const [price, setPrice] = useState("0");
  const [isFree, setIsFree] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !data.user) {
        router.replace("/auth?next=/listings/new");
        return;
      }

      setUserId(data.user.id);
      setCheckingAuth(false);
    }

    void checkAuth();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(image);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [image]);

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    setError("");

    const file = event.target.files?.[0];

    if (!file) {
      setImage(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Your image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setImage(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!userId) {
      setError("Please sign in before publishing a listing.");
      return;
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setError("Enter a valid non-negative price.");
      return;
    }

    if (!isFree && numericPrice <= 0) {
      setError("Enter a price greater than zero, or mark the item as free.");
      return;
    }

    setBusy(true);

    const supabase = createClient();
    let uploadedPath: string | null = null;

    try {
      let imageUrls: string[] = [];

      if (image) {
        const extension = image.type === "image/jpeg"
          ? "jpg"
          : image.type === "image/png"
            ? "png"
            : "webp";

        const path = `${userId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(path, image, {
            contentType: image.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        uploadedPath = path;

        const { data: publicUrlData } = supabase.storage
          .from("listing-images")
          .getPublicUrl(path);

        imageUrls = [publicUrlData.publicUrl];
      }

      const { data, error: insertError } = await supabase
        .from("listings")
        .insert({
          owner_id: userId,
          title: title.trim(),
          description: description.trim(),
          category,
          condition,
          price: isFree ? 0 : numericPrice,
          is_free: isFree,
          image_urls: imageUrls,
          status: "available",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      router.replace(`/listings/${data.id}`);
      router.refresh();
    } catch (err) {
      // Clean up an uploaded image if publishing the listing fails.
      if (uploadedPath) {
        await supabase.storage
          .from("listing-images")
          .remove([uploadedPath]);
      }

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't publish your listing. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf9f6] text-[#52644b]">
        <div className="flex items-center gap-3 text-sm">
          <LoaderCircle size={21} className="animate-spin" />
          Checking your account...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#202a21]">
      <header className="border-b border-[#e8e8df]">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#294b35] text-[#e5efc9]">
              <Recycle size={22} />
            </div>
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

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-14">
          <section>
            <p className="text-xs font-bold uppercase tracking-[2px] text-[#739064]">
              Pass it forward
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-1.8px] sm:text-5xl">
              Give your item
              <br />
              a <span className="font-serif font-normal italic text-[#648957]">new chapter.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#7c8175]">
              Share the details, show its condition honestly, and help
              another student find something useful.
            </p>

            <form onSubmit={handleSubmit} className="mt-9 space-y-7">
              <div className="rounded-3xl border border-[#e4e5db] bg-white p-5 sm:p-7">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">The essentials</h2>
                  <span className="text-xs text-[#909488]">Step 01</span>
                </div>

                <div className="space-y-5">
                  <div>
                    <label htmlFor="title" className="mb-2 block text-sm font-semibold">
                      Item name
                    </label>
                    <input
                      id="title"
                      required
                      minLength={3}
                      maxLength={100}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="e.g. Engineering Mathematics textbook"
                      className="w-full rounded-xl border border-[#e2e3d9] bg-[#fdfdfa] px-4 py-3.5 text-sm outline-none transition focus:border-[#8aa17b] focus:ring-4 focus:ring-[#8aa17b]/10"
                    />
                    <p className="mt-1.5 text-right text-xs text-[#9a9d92]">
                      {title.length}/100
                    </p>
                  </div>

                  <div>
                    <label htmlFor="description" className="mb-2 block text-sm font-semibold">
                      Description
                    </label>
                    <textarea
                      id="description"
                      required
                      minLength={10}
                      maxLength={2000}
                      rows={5}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Mention the edition, what is included, any wear and tear, and anything else a student should know..."
                      className="w-full resize-y rounded-xl border border-[#e2e3d9] bg-[#fdfdfa] px-4 py-3.5 text-sm leading-6 outline-none transition focus:border-[#8aa17b] focus:ring-4 focus:ring-[#8aa17b]/10"
                    />
                    <p className="mt-1.5 text-right text-xs text-[#9a9d92]">
                      {description.length}/2000
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="category" className="mb-2 block text-sm font-semibold">
                        Category
                      </label>
                      <select
                        id="category"
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        className="w-full rounded-xl border border-[#e2e3d9] bg-[#fdfdfa] px-4 py-3.5 text-sm outline-none focus:border-[#8aa17b]"
                      >
                        {categories.map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="condition" className="mb-2 block text-sm font-semibold">
                        Item condition
                      </label>
                      <select
                        id="condition"
                        value={condition}
                        onChange={(event) => setCondition(event.target.value)}
                        className="w-full rounded-xl border border-[#e2e3d9] bg-[#fdfdfa] px-4 py-3.5 text-sm outline-none focus:border-[#8aa17b]"
                      >
                        {conditions.map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#e4e5db] bg-white p-5 sm:p-7">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">A picture tells more</h2>
                  <span className="text-xs text-[#909488]">Step 02</span>
                </div>

                <label
                  htmlFor="image"
                  className="group flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5c1] bg-[#f7f8f2] p-5 text-center transition hover:border-[#83a074] hover:bg-[#f0f4e9]"
                >
                  {preview ? (
                    <div className="relative w-full max-w-sm">
                      <img
                        src={preview}
                        alt="Preview of your item"
                        className="mx-auto max-h-64 rounded-xl object-contain"
                      />
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#54734b]">
                        <CheckCircle2 size={14} />
                        Image ready
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#638357] shadow-sm">
                        <ImagePlus size={24} />
                      </div>
                      <span className="mt-4 text-sm font-semibold">
                        Upload an item photo
                      </span>
                      <span className="mt-2 text-xs text-[#858a7d]">
                        JPG, PNG or WebP · Up to 5 MB
                      </span>
                    </>
                  )}
                  <input
                    id="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImage}
                    className="sr-only"
                  />
                </label>

                {image && (
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#7d5b4d]"
                  >
                    <X size={14} />
                    Remove image
                  </button>
                )}
                <p className="mt-3 text-xs leading-5 text-[#8b8f83]">
                  Upload a genuine photo of the item and avoid including
                  personal information in the image.
                </p>
              </div>

              <div className="rounded-3xl border border-[#e4e5db] bg-white p-5 sm:p-7">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Set your price</h2>
                  <span className="text-xs text-[#909488]">Step 03</span>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#dbe5d1] bg-[#f1f5eb] p-4">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(event) => setIsFree(event.target.checked)}
                    className="h-4 w-4 accent-[#456d42]"
                  />
                  <div>
                    <div className="text-sm font-semibold text-[#365337]">
                      Give it away for free
                    </div>
                    <div className="mt-1 text-xs text-[#788671]">
                      Help another student without charging them.
                    </div>
                  </div>
                </label>

                {!isFree && (
                  <div className="mt-5">
                    <label htmlFor="price" className="mb-2 block text-sm font-semibold">
                      Price (INR)
                    </label>
                    <input
                      id="price"
                      type="number"
                      required
                      min="0.01"
                      max="99999999"
                      step="0.01"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      placeholder="e.g. 250"
                      className="w-full rounded-xl border border-[#e2e3d9] bg-[#fdfdfa] px-4 py-3.5 text-sm outline-none focus:border-[#8aa17b]"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div role="alert" className="break-words rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !userId}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#294b35] px-6 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d3525] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />
                    Publishing your listing...
                  </>
                ) : (
                  <>
                    Publish listing
                    <Recycle size={17} />
                  </>
                )}
              </button>
              <p className="text-center text-xs leading-5 text-[#8b8f83]">
                By publishing, you confirm the item description is accurate
                and that you have the right to offer this item.
              </p>
            </form>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-3xl bg-[#294b35] p-6 text-white sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#d5e7bb]">
                <Recycle size={23} />
              </div>
              <h2 className="mt-5 text-xl font-semibold">
                Every item deserves another chapter.
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/70">
                The things you no longer need could be exactly what another
                student is looking for.
              </p>
            </div>

            <div className="rounded-3xl border border-[#e4e5db] bg-white p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck size={18} className="text-[#66875a]" />
                A better exchange starts here
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#7b8174]">
                <li>• Describe the condition honestly.</li>
                <li>• Use clear, genuine item photos.</li>
                <li>• Never share passwords or private documents.</li>
                <li>• Arrange handovers in safe campus locations.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
