import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Gallery } from "@/components/landing/Gallery";
import { StoriesOfTransformation } from "@/components/landing/StoriesOfTransformation";
import { Testimonials } from "@/components/landing/Testimonials";
import { FeedbackPopup } from "@/components/landing/FeedbackPopup";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Gallery />
        <StoriesOfTransformation />
        <Testimonials />
      </main>
      <Footer />
      <FeedbackPopup />
    </>
  );
}
