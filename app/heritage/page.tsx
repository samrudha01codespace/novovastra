import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { GlassCard } from "@/components/shared/GlassCard";

export default function HeritagePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="font-[var(--font-heading)] text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Our <span className="text-gradient">Heritage</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every saree carries generations of craftsmanship. We believe
              heritage should evolve, not fade.
            </p>
          </div>

          <div className="space-y-8">
            <GlassCard>
              <h2 className="font-[var(--font-heading)] text-2xl font-semibold mb-4">
                The Problem We Solve
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Millions of vintage sarees sit in closets across India — too
                precious to discard, too dated to wear. These are not just
                fabrics; they are stories woven in silk, cotton, and zari. Our
                mission is to give these stories a new chapter.
              </p>
            </GlassCard>

            <GlassCard>
              <h2 className="font-[var(--font-heading)] text-2xl font-semibold mb-4">
                Our Approach
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                By bridging generative AI with a physical supply chain, we
                eliminate the primary friction point of custom tailoring: the
                client&apos;s inability to visualize the final product.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our vertically integrated, high-margin pipeline converts
                dormant legacy assets into bespoke, modern garments. You see
                the design before we cut a single thread.
              </p>
            </GlassCard>

            <GlassCard>
              <h2 className="font-[var(--font-heading)] text-2xl font-semibold mb-4">
                Craftsmanship Meets Technology
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                While AI handles the visualization, our master tailors handle
                the creation. Every garment is handcrafted by skilled artisans
                who understand the language of Indian textiles. The result is
                a perfect marriage of tradition and innovation.
              </p>
            </GlassCard>

            <GlassCard>
              <h2 className="font-[var(--font-heading)] text-2xl font-semibold mb-4">
                Sustainability
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Upcycling vintage sarees is not just fashion — it is
                environmental consciousness. Every saree we transform is one
                less garment in a landfill. Every modern dress we create
                carries the soul of sustainable fashion.
              </p>
            </GlassCard>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
